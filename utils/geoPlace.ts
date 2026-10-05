import type { LocationGeocodedAddress } from 'expo-location';

const COORD_ADDRESS = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;

export function looksLikeCoordinates(value?: string | null) {
  return Boolean(value && COORD_ADDRESS.test(value.trim()));
}

/** Round GPS so nearby pings share one barangay/city lookup. */
export function placeKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/** Barangay + city, or a short fallback — never raw coordinates. */
export function displayPlace(address?: string | null, fallback = 'Unknown') {
  const trimmed = address?.trim();
  if (!trimmed || looksLikeCoordinates(trimmed)) return fallback;
  return trimmed;
}

/** Prefer barangay + city (Philippines), then a short fallback. */
export function formatBarangayCity(place: LocationGeocodedAddress): string {
  const barangay = (
    place.district ||
    place.subregion ||
    place.name ||
    ''
  ).trim();
  const city = (place.city || place.subregion || place.region || '').trim();

  if (barangay && city && barangay.toLowerCase() !== city.toLowerCase()) {
    return `${barangay}, ${city}`;
  }
  if (city) return city;
  if (barangay) return barangay;

  return [place.street, place.region].filter(Boolean).join(', ');
}
