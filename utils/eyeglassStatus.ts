import type { CaneDeviceTelemetry } from '../firebase/appData';

/**
 * Glasses are Online only while a heartbeat arrived in this window.
 * Power-off stops writes, so status drops after about 45 seconds.
 * A last `connected: true` must not keep them online.
 */
const EYEGLASS_STALE_SECONDS = 45;
/** Cane ESP heartbeat window. */
const CANE_STALE_SECONDS = 120;

const GLASS_ID_SUFFIX = /-(EYEGLASS|SMARTGLASS|GLASS|GLASSES)$/i;

export function eyeglassDeviceId(caneID: string | undefined) {
  const pairedId = caneID?.trim().toUpperCase();
  return pairedId ? `${pairedId}-EYEGLASS` : '';
}

function isGlassType(type: string) {
  return (
    type === 'eyeglass' ||
    type === 'glasses' ||
    type === 'smartglass' ||
    type === 'smart_glass' ||
    type === 'smart-glass' ||
    type === 'glass'
  );
}

function stripGlassSuffix(id: string) {
  return id.replace(GLASS_ID_SUFFIX, '');
}

export function isEyeglassDevice(device?: CaneDeviceTelemetry | null) {
  if (!device) return false;
  const type = String(device.deviceType ?? '').toLowerCase();
  if (isGlassType(type)) return true;
  return GLASS_ID_SUFFIX.test(String(device.caneID ?? ''));
}

function deviceById(
  id: string,
  devices: Record<string, CaneDeviceTelemetry>
) {
  return devices[id] || devices[id.toLowerCase()] || devices[id.toUpperCase()];
}

function allDevices(devices: Record<string, CaneDeviceTelemetry>) {
  const seen = new Set<CaneDeviceTelemetry>();
  const list: CaneDeviceTelemetry[] = [];
  Object.values(devices).forEach((device) => {
    if (!device || seen.has(device)) return;
    seen.add(device);
    list.push(device);
  });
  return list;
}

/** Cane ESP only — never the eyeglass document. */
export function getCaneTelemetry(
  caneID: string | undefined,
  devices: Record<string, CaneDeviceTelemetry>
) {
  const id = caneID?.trim();
  if (!id) return undefined;

  const direct = deviceById(id, devices);
  if (direct && !isEyeglassDevice(direct)) return direct;

  return allDevices(devices).find((device) => {
    if (isEyeglassDevice(device)) return false;
    return device.caneID.trim().toLowerCase() === id.toLowerCase();
  });
}

/** Dedicated glasses ESP, if present. */
export function getDedicatedEyeglass(
  caneID: string | undefined,
  devices: Record<string, CaneDeviceTelemetry>
) {
  const pairedId = caneID?.trim().toUpperCase();
  if (!pairedId) return undefined;

  const split =
    deviceById(eyeglassDeviceId(pairedId), devices) ||
    deviceById(`${pairedId}-SMARTGLASS`, devices) ||
    deviceById(`eyeglass:${pairedId}`, devices) ||
    deviceById(`smartglass:${pairedId}`, devices);
  if (split && isEyeglassDevice(split)) return split;

  return allDevices(devices).find((device) => {
    const ownId = String(device.caneID ?? '').toUpperCase();
    const paired = String(device.pairedCaneID ?? '').toUpperCase();
    const typedGlass = isEyeglassDevice(device);
    if (typedGlass) {
      if (paired === pairedId) return true;
      if (ownId === pairedId) return true;
      if (ownId === eyeglassDeviceId(pairedId)) return true;
      if (ownId === `${pairedId}-SMARTGLASS`) return true;
      if (GLASS_ID_SUFFIX.test(ownId) && stripGlassSuffix(ownId) === pairedId) {
        return true;
      }
    }
    // Untyped doc that explicitly pairs to this cane as glasses.
    if (paired === pairedId && paired !== ownId) return true;
    return false;
  });
}

export function getEyeglassTelemetry(
  caneID: string | undefined,
  devices: Record<string, CaneDeviceTelemetry>
) {
  return getDedicatedEyeglass(caneID, devices);
}

function isFresh(
  raw: number | undefined,
  nowSeconds: number,
  windowSeconds = EYEGLASS_STALE_SECONDS
) {
  if (!raw || !Number.isFinite(raw) || raw <= 0) return false;
  let timestamp = raw;
  // Normalize ms / accidental oversized units down to epoch seconds.
  while (timestamp > 1e12) timestamp /= 1000;
  const age = nowSeconds - timestamp;
  return Number.isFinite(age) && age >= -30 && age < windowSeconds;
}

function glassesHeartbeatFresh(
  device: CaneDeviceTelemetry,
  nowSeconds: number,
  includeDeviceUpdatedAt: boolean
) {
  if (device.eyeglassPowerOff) return false;
  if (
    includeDeviceUpdatedAt &&
    isFresh(device.updatedAt, nowSeconds, EYEGLASS_STALE_SECONDS)
  ) {
    return true;
  }
  return isFresh(device.eyeglassUpdatedAt, nowSeconds, EYEGLASS_STALE_SECONDS);
}

/**
 * Online only while the glasses themselves are reporting.
 * An explicit off flag is Offline immediately. After power is cut and
 * writes stop, Offline follows the heartbeat window — the last
 * connected=true value is not held.
 * A dedicated glasses device is authoritative; the cane cannot keep it online.
 */
export function isEyeglassActive(
  caneID: string | undefined,
  devices: Record<string, CaneDeviceTelemetry>,
  nowSeconds = Date.now() / 1000
): boolean {
  const dedicated = getDedicatedEyeglass(caneID, devices);
  const cane = getCaneTelemetry(caneID, devices);

  if (dedicated && dedicated !== cane) {
    return glassesHeartbeatFresh(dedicated, nowSeconds, true);
  }

  // Bridge fields on the cane doc (not cane Wi‑Fi itself).
  if (!cane || isEyeglassDevice(cane)) return false;
  return glassesHeartbeatFresh(cane, nowSeconds, false);
}

/** Online only when this cane ESP itself has a fresh Wi-Fi heartbeat. */
export function isCaneActive(
  caneID: string | undefined,
  devices: Record<string, CaneDeviceTelemetry>,
  nowSeconds = Date.now() / 1000
): boolean {
  const cane = getCaneTelemetry(caneID, devices);
  if (!cane || isEyeglassDevice(cane)) return false;
  return isFresh(cane.updatedAt, nowSeconds, CANE_STALE_SECONDS);
}
