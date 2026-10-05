import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  DevSettings,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { describeElement, formatStyleObject } from './describeElement';
import { findElementAtPoint, frameFromDom, parseSourceLocation } from './findElementAtPoint';
import { getInspectRootRef } from './inspectRoot';

const {
  installFeatureGate,
  disableFeature,
  enableFeature,
  isFeatureDisabled,
  removeFeature,
  restoreAllFeatures,
  getRemovedCount,
} = require('./featureGate');

const STORAGE_KEY = '@smartcane/ui-inspector-state';
const PANEL_WIDTH = 300;

function useInspectorInsets() {
  return {
    top: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 47,
    bottom: Platform.OS === 'ios' ? 34 : 16,
    left: 0,
    right: 0,
  };
}

function normalizeDevServerUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let next = raw.trim();
  if (!next) return null;
  if (!/^https?:\/\//i.test(next)) next = `http://${next}`;
  if (!next.endsWith('/')) next += '/';
  return next;
}

function hostFromUrl(raw) {
  try {
    const u = new URL(normalizeDevServerUrl(raw) || raw);
    return u.host; // host:port
  } catch {
    return null;
  }
}

function getLanHostFromExpo() {
  try {
    // eslint-disable-next-line global-require
    const Constants = require('expo-constants').default;
    const hostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest2?.extra?.expoClient?.hostUri ||
      Constants?.manifest?.debuggerHost ||
      Constants?.linkingUri;
    if (typeof hostUri === 'string' && hostUri.length) {
      // hostUri like "192.168.100.19:8081" or exp://192.168.100.19:8081
      const cleaned = hostUri
        .replace(/^exp:\/\//i, '')
        .replace(/^exps:\/\//i, '')
        .replace(/^https?:\/\//i, '')
        .split('/')[0];
      if (cleaned && !cleaned.startsWith('localhost') && !cleaned.startsWith('127.0.0.1')) {
        return cleaned;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function getHostFromScriptURL() {
  try {
    // eslint-disable-next-line global-require
    const { NativeModules } = require('react-native');
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (typeof scriptURL === 'string' && scriptURL.length) {
      const host = hostFromUrl(scriptURL);
      if (host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1')) {
        return host;
      }
      return host;
    }
  } catch {
    // ignore
  }
  return null;
}

function getDevServerUrl() {
  let url = null;
  try {
    // eslint-disable-next-line global-require
    const mod = require('react-native/Libraries/Core/Devtools/getDevServer');
    const getDevServer = mod?.default ?? mod;
    if (typeof getDevServer === 'function') {
      const info = getDevServer();
      url = normalizeDevServerUrl(info?.url);
    }
  } catch {
    // fall through
  }

  const lanHost = getLanHostFromExpo() || getHostFromScriptURL();
  // Phones cannot reach the PC via localhost — rewrite when needed.
  if (url) {
    try {
      const u = new URL(url);
      const isLoopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      if (isLoopback && lanHost && Platform.OS !== 'web') {
        return normalizeDevServerUrl(`http://${lanHost}`);
      }
      // Web loaded via LAN IP but getDevServer said localhost → use page host.
      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined' &&
        isLoopback &&
        window.location?.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        return normalizeDevServerUrl(
          `${window.location.protocol}//${window.location.host}`,
        );
      }
    } catch {
      // keep url
    }
    return url;
  }

  if (lanHost) return normalizeDevServerUrl(`http://${lanHost}`);
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.host) {
    return normalizeDevServerUrl(`${window.location.protocol}//${window.location.host}`);
  }
  return 'http://localhost:8081/';
}

function getAsyncStorage() {
  try {
    // eslint-disable-next-line global-require
    const mod = require('@react-native-async-storage/async-storage');
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

function FileLink({ src, onOpen, label }) {
  if (!src) return null;
  return (
    <Pressable
      onPress={(event) => {
        event?.stopPropagation?.();
        onOpen(src);
      }}
      style={styles.fileLink}
      hitSlop={10}
    >
      <Text style={styles.fileLinkText}>{label || src}</Text>
    </Pressable>
  );
}

function shortFileLabel(src) {
  if (!src) return null;
  const base = String(src).split('?')[0].replace(/\\/g, '/');
  const parts = base.split('/');
  return parts[parts.length - 1] || base;
}

function lineLabel(file, line, column) {
  const base = String(file || 'index.css').replace(/\\/g, '/').split('/').pop();
  const ln = Math.max(1, parseInt(String(line || 1), 10) || 1);
  const col = Math.max(1, parseInt(String(column || 1), 10) || 1);
  return `${base}:${ln}:${col}`;
}

async function locateCssLine(entry) {
  const loc = parseSourceLocation(entry?.src || '');
  const file = (loc?.file || 'styles/index.css').replace(/\\/g, '/');
  const symbol = entry?.symbol || loc?.symbol || '';
  const prop = entry?.prop || entry?.key || loc?.prop || '';
  const theme = entry?.theme || loc?.theme || 'light';
  const color = entry?.color || entry?.value || loc?.color || '';
  const token = entry?.token != null ? entry.token : loc?.token || '1';
  const base = getDevServerUrl();
  let qs = `file=${encodeURIComponent(file)}`;
  if (symbol) qs += `&symbol=${encodeURIComponent(symbol)}`;
  if (prop) qs += `&prop=${encodeURIComponent(prop)}`;
  if (theme) qs += `&theme=${encodeURIComponent(theme)}`;
  if (color) qs += `&color=${encodeURIComponent(color)}`;
  if (token) qs += `&token=${encodeURIComponent(String(token))}`;
  try {
    const res = await fetch(`${base}__insp/locate?${qs}`);
    if (!res.ok) return null;
    const body = await res.json();
    if (!body?.line) return null;
    const line = body.line;
    const column = body.column || 1;
    const params = new URLSearchParams();
    if (symbol) params.set('symbol', symbol);
    if (prop) params.set('prop', prop);
    params.set('theme', theme);
    if (color) params.set('color', color);
    params.set('token', String(token));
    return {
      ...entry,
      src: `${file}:${line}:${column}?${params.toString()}`,
      srcLabel: lineLabel(file, line, column),
      resolvedLine: line,
      resolvedColumn: column,
      matched: body.matched || null,
    };
  } catch {
    return null;
  }
}

async function enrichDescriptionColors(description) {
  if (!description) return description;
  const colors = description.colorEntries || description.colors || [];
  if (!colors.length) return description;
  const enriched = await Promise.all(
    colors.map(async (c) => (await locateCssLine(c)) || {
      ...c,
      srcLabel: c.srcLabel && c.srcLabel !== 'colors' && c.srcLabel !== 'color' ? c.srcLabel : (c.role || shortFileLabel(c.src)),
    }),
  );
  const textColorEntries = enriched.filter((c) => c.isTextColor);
  return {
    ...description,
    colorEntries: enriched,
    colors: enriched,
    textColorEntries,
  };
}

function colorRowLabel(entry) {
  const role = entry?.role || entry?.key || 'color';
  const file = entry?.srcLabel;
  if (!file || file === 'colors' || file === 'color' || file === role) return role;
  return `${role} · ${file}`;
}

function RowWithFile({ children, src, onOpen, label }) {
  return (
    <View style={styles.rowWithFile}>
      <View style={styles.rowWithFileMain}>{children}</View>
      {src ? (
        <FileLink src={src} onOpen={onOpen} label={label || shortFileLabel(src)} />
      ) : (
        <Text style={styles.monoDim}>—</Text>
      )}
    </View>
  );
}

function ColorSwatch({ color }) {
  const bg = typeof color === 'string' ? color : '#888';
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatch, { backgroundColor: bg }]} />
      <Text style={styles.mono}>{String(color)}</Text>
    </View>
  );
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {open ? '▾' : '▸'} {title}
        </Text>
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function UiInspectorInner() {
  const insets = useInspectorInsets();
  const [enabled, setEnabled] = useState(false);
  const [picking, setPicking] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [selection, setSelection] = useState(null);
  const [description, setDescription] = useState(null);
  const [snippet, setSnippet] = useState(null);
  const [snippetLoading, setSnippetLoading] = useState(false);
  const [openError, setOpenError] = useState(null);
  const [openOk, setOpenOk] = useState(null);
  const [pillPos, setPillPos] = useState({ x: 12, y: 120 });
  const pillPosRef = useRef({ x: 12, y: 120 });
  const pillDragRef = useRef(null);
  const ignoreUntilRef = useRef(0);
  const enabledRef = useRef(false);
  const [pointer, setPointer] = useState(null);
  const [hoverFrame, setHoverFrame] = useState(null);
  const [featureOff, setFeatureOff] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);

  useEffect(() => {
    pillPosRef.current = pillPos;
  }, [pillPos]);

  const persist = useCallback(async (next) => {
    const storage = getAsyncStorage();
    if (!storage?.setItem) return;
    try {
      await storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // memory-only fallback
    }
  }, []);

  useEffect(() => {
    // Never auto-restore "enabled" — a sticky overlay rearranges/blocks the whole app.
    let cancelled = false;
    (async () => {
      const storage = getAsyncStorage();
      if (!storage?.getItem) return;
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (!raw || cancelled) return;
        const parsed = JSON.parse(raw);
        if (parsed?.enabled) {
          await storage.setItem(
            STORAGE_KEY,
            JSON.stringify({ enabled: false, minimized: false }),
          );
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleInspector = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      enabledRef.current = next;
      if (next) {
        ignoreUntilRef.current = Date.now() + 450;
        setPicking(true);
        setMinimized(false);
      } else {
        setPicking(false);
        setSelection(null);
        setDescription(null);
        setSnippet(null);
        setOpenError(null);
        setOpenOk(null);
      }
      void persist({ enabled: next, minimized: false });
      return next;
    });
  }, [persist]);

  useEffect(() => {
    try {
      if (typeof DevSettings?.addMenuItem === 'function') {
        DevSettings.addMenuItem('Toggle UI Inspector', toggleInspector);
      }
    } catch {
      // DevSettings unavailable
    }

    const onKeyDown = (event) => {
      const key = event.key || event.code;
      const isM = key === 'm' || key === 'M' || key === 'KeyM';
      if (!isM || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      toggleInspector();
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('keydown', onKeyDown, true);
    }

    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line global-require
        const native = require('expo-dev-menu/build/ExpoDevMenu').default;
        if (native && typeof native.addDevMenuCallbacks === 'function') {
          // eslint-disable-next-line global-require
          const DevMenu = require('expo-dev-menu');
          void DevMenu.registerDevMenuItems([
            {
              name: 'Toggle UI Inspector',
              callback: toggleInspector,
              shouldCollapse: true,
            },
          ]).catch(() => {});
        }
      } catch {
        // expo-dev-menu is null in Expo Go
      }
    }

    return () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('keydown', onKeyDown, true);
      }
    };
  }, [toggleInspector]);

  const loadSnippet = useCallback(async (src) => {
    const loc = parseSourceLocation(src);
    if (!loc) {
      setSnippet(null);
      return;
    }
    setSnippetLoading(true);
    try {
      const base = getDevServerUrl();
      const qs = `file=${encodeURIComponent(loc.file)}&line=${loc.line}`;
      const res = await fetch(`${base}__insp/source?${qs}`);
      if (!res.ok) {
        setSnippet({ error: `HTTP ${res.status}` });
      } else {
        setSnippet(await res.json());
      }
    } catch (err) {
      setSnippet({ error: String(err?.message || err) });
    } finally {
      setSnippetLoading(false);
    }
  }, []);

  const applySelection = useCallback(
    async (element) => {
      setSelection(element);
      setPicking(false);
      setMinimized(false);
      const baseDescription = describeElement(element);
      setDescription(baseDescription);
      // Resolve exact index.css:line:col for every color row (bg / border / text).
      void enrichDescriptionColors(baseDescription).then((rich) => {
        if (rich) setDescription(rich);
      });
      if (element?.src) {
        await loadSnippet(element.src);
      } else {
        setSnippet(null);
      }
      void persist({ enabled: true, minimized: false });
    },
    [loadSnippet, persist],
  );

  const lastHoverRef = useRef(0);
  const hoverAt = useCallback(async (x, y, { force = false } = {}) => {
    if (!enabledRef.current) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    setPointer({ x, y });
    const now = Date.now();
    if (!force && now - lastHoverRef.current < 50) return;
    lastHoverRef.current = now;
    const element = await findElementAtPoint({
      x,
      y,
      rootRef: getInspectRootRef(),
    });
    if (element?.frame) setHoverFrame(element.frame);
    return element;
  }, []);

  const pickAt = useCallback(
    async (x, y) => {
      if (!enabledRef.current) return;
      if (Date.now() < ignoreUntilRef.current) return;
      const element = await hoverAt(x, y, { force: true });
      if (element) await applySelection(element);
    },
    [applySelection, hoverAt],
  );

  const eventXY = (evt) => {
    const ne = evt?.nativeEvent || evt || {};
    const x = ne.pageX ?? ne.locationX ?? ne.clientX ?? evt?.pageX;
    const y = ne.pageY ?? ne.locationY ?? ne.clientY ?? evt?.pageY;
    return { x, y };
  };

  useEffect(() => {
    if (!enabled || !picking) {
      setHoverFrame(null);
      return undefined;
    }
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    let lastHover = 0;
    const onMove = (event) => {
      const x = event.clientX;
      const y = event.clientY;
      setPointer({ x, y });
      const now = Date.now();
      if (now - lastHover < 40) return;
      lastHover = now;
      findElementAtPoint({ x, y, rootRef: getInspectRootRef() }).then((el) => {
        if (el?.frame) setHoverFrame(el.frame);
      });
    };
    const onClick = (event) => {
      if (event.target?.closest?.('[data-insp-chrome], #insp-chrome, #insp-chrome-overlay')) return;
      if (Date.now() < ignoreUntilRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      void pickAt(event.clientX, event.clientY);
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [enabled, picking, pickAt]);

  const openAt = useCallback(async (src, extra = {}) => {
    const loc = parseSourceLocation(src);
    if (!loc) {
      setOpenError('Could not parse file:line from source');
      return;
    }
    const file = String(loc.file).replace(/\\/g, '/');
    const symbol = extra.symbol || loc.symbol || null;
    const prop = extra.prop || loc.prop || null;
    const theme = extra.theme || loc.theme || null;
    const color = extra.color || loc.color || null;
    const token = extra.token != null ? extra.token : loc.token;
    const base = getDevServerUrl();
    let qs = `file=${encodeURIComponent(file)}&line=${loc.line}&column=${loc.column || 1}`;
    if (symbol) qs += `&symbol=${encodeURIComponent(symbol)}`;
    if (prop) qs += `&prop=${encodeURIComponent(prop)}`;
    if (theme) qs += `&theme=${encodeURIComponent(theme)}`;
    if (color) qs += `&color=${encodeURIComponent(color)}`;
    if (token) qs += `&token=${encodeURIComponent(String(token))}`;
    const candidates = [base];
    // If first URL is loopback, also try Expo LAN host (phone / wrong getDevServer).
    try {
      const u = new URL(base);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        const lan = getLanHostFromExpo() || getHostFromScriptURL();
        if (lan) candidates.push(normalizeDevServerUrl(`http://${lan}`));
      }
    } catch {
      // ignore
    }
    setOpenError(null);
    setOpenOk(null);
    let lastError = null;
    let openUrl = `${base}__insp/open?${qs}`;
    for (const candidate of candidates.filter(Boolean)) {
      openUrl = `${candidate}__insp/open?${qs}`;
      try {
        const res = await fetch(openUrl);
        let body = null;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        if (!res.ok) {
          const detail = body?.error ? `: ${body.error}` : '';
          lastError = `HTTP ${res.status}${detail}\n${openUrl}`;
          continue;
        }
        const openedLine = body?.line || loc.line;
        const openedFile = body?.file || file;
        setOpenOk(
          `Opened ${openedFile}:${openedLine}` +
            (body?.matched ? ` (${body.matched})` : ''),
        );
        return;
      } catch (err) {
        lastError = `${String(err?.message || err)}\n${openUrl}`;
      }
    }
    setOpenError(lastError || `Failed to fetch\n${openUrl}`);
  }, []);

  const openInEditor = useCallback(() => {
    // Prefer CSS when the picked node is styled from styles/index.css
    if (description?.cssSrc) {
      openAt(description.cssSrc);
      return;
    }
    if (selection?.src) openAt(selection.src);
  }, [openAt, selection, description]);

  const selectBreadcrumb = useCallback(
    async (crumb) => {
      if (!crumb) return;
      const crumbs = selection?.breadcrumbs || [];
      const idx = crumbs.findIndex(
        (c) => c === crumb || (c.src && c.src === crumb.src && c.name === crumb.name),
      );
      const nextCrumbs = idx >= 0 ? crumbs.slice(idx) : crumbs;
      const next = {
        ...selection,
        name: crumb.name,
        src: crumb.src,
        props: crumb.props || selection?.props || {},
        meta: crumb.meta,
        breadcrumbs: nextCrumbs.length ? nextCrumbs : [crumb],
        frame: crumb.frame || selection?.frame,
        domNode: crumb.domNode || selection?.domNode,
      };
      await applySelection(next);
    },
    [applySelection, selection],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const node = selection?.domNode;
    if (!node || typeof node.getBoundingClientRect !== 'function') return undefined;

    const update = () => {
      if (node.isConnected === false) return;
      const next = frameFromDom(node);
      setSelection((prev) => {
        if (!prev || prev.domNode !== node) return prev;
        const prevFrame = prev.frame;
        if (
          prevFrame &&
          Math.abs(prevFrame.x - next.x) < 0.5 &&
          Math.abs(prevFrame.y - next.y) < 0.5 &&
          Math.abs(prevFrame.width - next.width) < 0.5 &&
          Math.abs(prevFrame.height - next.height) < 0.5
        ) {
          return prev;
        }
        return { ...prev, frame: next };
      });
    };

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [selection?.domNode]);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    installFeatureGate();
    return undefined;
  }, []);

  useEffect(() => {
    setFeatureOff(isFeatureDisabled(selection?.domNode));
  }, [selection?.domNode]);

  const toggleFeature = useCallback(() => {
    const node = selection?.domNode;
    if (!node) return;
    if (isFeatureDisabled(node)) enableFeature(node);
    else disableFeature(node);
    setFeatureOff(isFeatureDisabled(node));
  }, [selection?.domNode]);

  const removeSelected = useCallback(() => {
    const node = selection?.domNode;
    if (!node) return;
    if (removeFeature(node)) setRemovedCount(getRemovedCount());
  }, [selection?.domNode]);

  const restoreRemoved = useCallback(() => {
    restoreAllFeatures();
    setRemovedCount(0);
  }, []);

  const selectParent = useCallback(async () => {
    const node = selection?.domNode;
    if (Platform.OS !== 'web' || !node?.parentElement || typeof document === 'undefined') {
      const crumbs = selection?.breadcrumbs || [];
      if (crumbs.length > 1) {
        await selectBreadcrumb(crumbs[1]);
        return;
      }
      setOpenError('No parent container above this element');
      return;
    }

    const current = node.getBoundingClientRect();
    let parent = node.parentElement;
    let hops = 0;
    let chosen = null;
    while (parent && hops < 12) {
      hops += 1;
      if (parent === document.body || parent === document.documentElement) break;
      if (parent.closest?.('[data-insp-chrome], #insp-chrome, #insp-chrome-overlay')) break;
      const rect = parent.getBoundingClientRect();
      const visible = rect.width > 2 && rect.height > 2;
      const bigger = rect.width > current.width + 4 || rect.height > current.height + 4;
      if (visible && bigger) {
        chosen = parent;
        break;
      }
      parent = parent.parentElement;
    }

    if (!chosen) {
      setOpenError('No parent container above this element');
      return;
    }

    const classNames = [...(chosen.classList || [])].filter(
      (name) => name && !name.startsWith('css-') && !name.startsWith('r-'),
    );
    const next = {
      ...selection,
      name: classNames[0] || chosen.tagName || 'Parent',
      domNode: chosen,
      frame: frameFromDom(chosen),
      props: {
        ...(selection.props || {}),
        className: classNames.join(' '),
      },
    };
    setOpenError(null);
    await applySelection(next);
  }, [applySelection, selectBreadcrumb, selection]);

  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((event) => {
          void hoverAt(event.absoluteX, event.absoluteY);
        })
        .onUpdate((event) => {
          void hoverAt(event.absoluteX, event.absoluteY);
        })
        .onEnd((event) => {
          void pickAt(event.absoluteX, event.absoluteY);
        }),
    [hoverAt, pickAt],
  );

  const panelPosition = useMemo(() => {
    const { height } = Dimensions.get('window');
    const frame = selection?.frame;
    if (!frame) return 'bottom';
    const mid = frame.y + frame.height / 2;
    return mid > height / 2 ? 'top' : 'bottom';
  }, [selection]);

  const frame = selection?.frame;

  const liveFrame = picking ? hoverFrame : frame;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        nativeID="insp-chrome"
        onPress={(e) => {
          e?.stopPropagation?.();
          toggleInspector();
        }}
        style={[
          styles.devFab,
          { top: insets.top + 8 },
          enabled && styles.devFabOn,
        ]}
        hitSlop={8}
      >
        <Text style={styles.devFabText}>{enabled ? 'Insp on' : 'Insp'}</Text>
      </Pressable>

      {enabled && picking && Platform.OS === 'web' ? (
        <View
          nativeID="insp-chrome-overlay"
          style={[styles.captureOverlay, styles.captureOverlayWeb]}
        >
          <View style={[styles.hint, { top: insets.top + 36 }]} pointerEvents="none">
            <Text style={styles.hintText}>Move the crosshair, then click</Text>
          </View>
        </View>
      ) : null}

      {enabled && picking && Platform.OS !== 'web' ? (
        <Modal transparent animationType="none" statusBarTranslucent visible>
          <GestureHandlerRootView style={StyleSheet.absoluteFill}>
            <GestureDetector gesture={dragGesture}>
              <View style={styles.captureOverlay}>
                <Pressable
                  onPress={toggleInspector}
                  style={[styles.devFab, styles.devFabOn, { top: insets.top + 8 }]}
                >
                  <Text style={styles.devFabText}>Insp on</Text>
                </Pressable>
                <View style={[styles.hint, { top: insets.top + 36 }]} pointerEvents="none">
                  <Text style={styles.hintText}>
                    Drag your finger — the box follows, lift to select
                  </Text>
                </View>
                {hoverFrame ? (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.outline,
                      styles.outlineHover,
                      {
                        left: hoverFrame.x,
                        top: hoverFrame.y,
                        width: Math.max(hoverFrame.width, 2),
                        height: Math.max(hoverFrame.height, 2),
                      },
                    ]}
                  />
                ) : null}
                {pointer ? (
                  <View
                    pointerEvents="none"
                    style={[styles.crosshair, { left: pointer.x - 10, top: pointer.y - 10 }]}
                  >
                    <View style={styles.crosshairH} />
                    <View style={styles.crosshairV} />
                  </View>
                ) : null}
              </View>
            </GestureDetector>
          </GestureHandlerRootView>
        </Modal>
      ) : null}

      {enabled && liveFrame ? (
        <View
          pointerEvents="none"
          style={[
            styles.outline,
            picking && styles.outlineHover,
            {
              left: liveFrame.x,
              top: liveFrame.y,
              width: Math.max(liveFrame.width, 2),
              height: Math.max(liveFrame.height, 2),
            },
          ]}
        />
      ) : null}

      {enabled && picking && pointer ? (
        <View pointerEvents="none" style={[styles.crosshair, { left: pointer.x - 10, top: pointer.y - 10 }]}>
          <View style={styles.crosshairH} />
          <View style={styles.crosshairV} />
        </View>
      ) : null}

      {enabled && minimized ? (
        <View
          style={[styles.pill, { left: pillPos.x, top: pillPos.y }]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            pillDragRef.current = {
              x: pillPosRef.current.x,
              y: pillPosRef.current.y,
              pageX: e.nativeEvent.pageX,
              pageY: e.nativeEvent.pageY,
              moved: false,
            };
          }}
          onResponderMove={(e) => {
            const start = pillDragRef.current;
            if (!start) return;
            const dx = e.nativeEvent.pageX - start.pageX;
            const dy = e.nativeEvent.pageY - start.pageY;
            if (Math.abs(dx) + Math.abs(dy) > 4) start.moved = true;
            const next = {
              x: Math.max(0, start.x + dx),
              y: Math.max(0, start.y + dy),
            };
            pillPosRef.current = next;
            setPillPos(next);
          }}
          onResponderRelease={() => {
            const start = pillDragRef.current;
            pillDragRef.current = null;
            if (start && !start.moved) {
              setMinimized(false);
              void persist({ enabled: true, minimized: false });
            }
          }}
        >
          <Text style={styles.pillText}>UI Insp</Text>
        </View>
      ) : enabled && selection && !picking ? (
        <View
          style={[
            styles.panel,
            panelPosition === 'top'
              ? { top: insets.top + 8 }
              : { bottom: insets.bottom + 8 },
            { maxHeight: Dimensions.get('window').height * 0.45 },
          ]}
        >
          <View style={styles.toolbar}>
            <Pressable
              onPress={() => {
                setPicking(true);
                setSelection(null);
                setDescription(null);
                setSnippet(null);
                setOpenError(null);
              }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Pick again</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void selectParent();
              }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Select parent</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMinimized(true);
                void persist({ enabled: true, minimized: true });
              }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Minimize</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setEnabled(false);
                setPicking(false);
                setSelection(null);
                setDescription(null);
                setSnippet(null);
                setOpenError(null);
                void persist({ enabled: false, minimized: false });
              }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Close</Text>
            </Pressable>
          </View>

          {Platform.OS === 'web' ? (
            <View style={styles.toolbar}>
              <Pressable onPress={toggleFeature} style={styles.btn}>
                <Text style={styles.btnText}>{featureOff ? 'Enable feature' : 'Disable feature'}</Text>
              </Pressable>
              <Pressable onPress={removeSelected} style={styles.btn}>
                <Text style={styles.btnText}>Remove</Text>
              </Pressable>
              {removedCount > 0 ? (
                <Pressable onPress={restoreRemoved} style={styles.btn}>
                  <Text style={styles.btnText}>Restore all</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Section title="Files">
              {description?.cssSrc ? (
                <RowWithFile
                  src={description.cssSrc}
                  onOpen={openAt}
                  label="index.css"
                >
                  <Text style={styles.sub}>CSS</Text>
                  <Text style={styles.mono}>{description.className}</Text>
                </RowWithFile>
              ) : null}
              {selection.src ? (
                <RowWithFile
                  src={selection.src}
                  onOpen={openAt}
                  label={shortFileLabel(selection.src)}
                >
                  <Text style={styles.sub}>Component</Text>
                </RowWithFile>
              ) : (
                <Text style={styles.mono}>(no source)</Text>
              )}
              {description?.cssSrc || selection.src ? (
                <Pressable onPress={openInEditor} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Open in Cursor</Text>
                </Pressable>
              ) : (
                <Text style={styles.mono}>(no file — restart Metro with -c)</Text>
              )}
              {snippetLoading ? <ActivityIndicator color="#9cf" /> : null}
              {snippet?.snippet ? (
                <View style={styles.codeBox}>
                  {snippet.snippet.map((row) => (
                    <Pressable
                      key={row.line}
                      onPress={() => {
                        const loc = parseSourceLocation(selection.src);
                        if (loc) openAt(`${loc.file}:${row.line}:1`);
                      }}
                    >
                      <Text
                        style={[
                          styles.codeLine,
                          row.line === snippet.line && styles.codeLineActive,
                        ]}
                      >
                        {String(row.line).padStart(4, ' ')}  {row.text}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {snippet?.error ? (
                <Text style={styles.errorText}>{snippet.error}</Text>
              ) : null}
              {openError ? (
                <Text style={styles.errorText}>{openError}</Text>
              ) : null}
              {openOk ? (
                <Text style={styles.okText}>{openOk}</Text>
              ) : null}
            </Section>

            <Section title="Element">
              <Text style={styles.mono}>
                {description?.component || selection.name || '?'}
              </Text>
              {featureOff ? (
                <Text style={styles.flag}>
                  Feature off. Press animation still runs. The action does not.
                </Text>
              ) : null}
              {(selection.breadcrumbs || []).length > 1 ? (
                <Pressable onPress={() => void selectParent()} style={styles.linkBtn}>
                  <Text style={styles.linkText}>
                    Select parent → {selection.breadcrumbs[1]?.name || 'container'}
                  </Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => void selectParent()} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Select parent (expand)</Text>
                </Pressable>
              )}
              {(selection.breadcrumbs || []).map((crumb, idx) => (
                <View key={`${crumb.src || crumb.name}-${idx}`} style={styles.crumb}>
                  <Pressable onPress={() => selectBreadcrumb(crumb)}>
                    <Text style={styles.mono}>
                      {idx === 0 ? '• ' : idx === 1 ? '↑ ' : ''}
                      {crumb.name}
                    </Text>
                  </Pressable>
                  {crumb.src ? (
                    <FileLink
                      src={crumb.src}
                      onOpen={openAt}
                      label={shortFileLabel(crumb.src)}
                    />
                  ) : null}
                </View>
              ))}
            </Section>

            <Section
              title="Elements"
              defaultOpen={!!(description?.elementEntries || []).length}
            >
              {(description?.elementEntries || []).length ? (
                description.elementEntries.map((entry) => (
                  <Text key={entry.label} style={styles.mono}>
                    {entry.label}
                  </Text>
                ))
              ) : (
                <Text style={styles.mono}>(none)</Text>
              )}
            </Section>

            <Section
              title="Text"
              defaultOpen={!!(description?.textEntries || []).length}
            >
              {(description?.textEntries || []).length ? (
                description.textEntries.map((entry) => (
                  <RowWithFile
                    key={`${entry.text}-${entry.src || ''}`}
                    src={entry.src}
                    onOpen={openAt}
                  >
                    <Text style={styles.mono}>“{entry.text}”</Text>
                  </RowWithFile>
                ))
              ) : (
                <Text style={styles.mono}>(none)</Text>
              )}
            </Section>

            <Section title="Text color" defaultOpen>
              {(description?.textColorEntries || []).length === 0 ? (
                <Text style={styles.mono}>(none)</Text>
              ) : (
                description.textColorEntries.map((c) => (
                  <RowWithFile
                    key={`tc-${c.key}-${c.value}-${c.src || ''}`}
                    src={c.src}
                    onOpen={(src) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7721/ingest/7b27707b-f678-425d-8402-d4da67f06182',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d610b9'},body:JSON.stringify({sessionId:'d610b9',hypothesisId:'H5',location:'UiInspector.jsx:textColorClick',message:'text color row clicked',data:{key:c.key,value:c.value,symbol:c.symbol,prop:c.prop,src:c.src,label:c.srcLabel},timestamp:Date.now()})}).catch(()=>{});
                      // #endregion
                      openAt(src, {
                        symbol: c.symbol,
                        prop: c.prop || c.key,
                        color: c.color || c.value,
                        theme: c.theme,
                        token: c.token != null ? c.token : 1,
                      });
                    }}
                    label={colorRowLabel(c)}
                  >
                    <Text style={styles.sub}>{c.role || 'text-color'}</Text>
                    <ColorSwatch color={c.value} />
                  </RowWithFile>
                ))
              )}
            </Section>

            <Section title="Colors" defaultOpen>
              {(description?.colorEntries || description?.colors || []).length === 0 ? (
                <Text style={styles.mono}>(none)</Text>
              ) : (
                (description.colorEntries || description.colors).map((c) => (
                  <RowWithFile
                    key={`c-${c.key}-${c.value}-${c.srcLabel || c.src || ''}`}
                    src={c.src}
                    onOpen={(src) => {
                      // #region agent log
                      fetch('http://127.0.0.1:7721/ingest/7b27707b-f678-425d-8402-d4da67f06182',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d610b9'},body:JSON.stringify({sessionId:'d610b9',hypothesisId:'H5',location:'UiInspector.jsx:colorClick',message:'color row clicked',data:{key:c.key,value:c.value,symbol:c.symbol,prop:c.prop,src:c.src,label:c.srcLabel},timestamp:Date.now()})}).catch(()=>{});
                      // #endregion
                      openAt(src, {
                        symbol: c.symbol,
                        prop: c.prop || c.key,
                        color: c.color || c.value,
                        theme: c.theme,
                        token: c.token != null ? c.token : 1,
                      });
                    }}
                    label={colorRowLabel(c)}
                  >
                    <Text style={styles.sub}>{c.role || c.key}</Text>
                    <ColorSwatch color={c.value} />
                  </RowWithFile>
                ))
              )}
            </Section>

            <Section title="Motion">
              {(description?.animationEntries || []).length ? (
                description.animationEntries.map((entry) => (
                  <RowWithFile
                    key={`${entry.label}-${entry.src || ''}`}
                    src={entry.src}
                    onOpen={openAt}
                  >
                    <Text style={styles.flag}>{entry.label}</Text>
                  </RowWithFile>
                ))
              ) : (
                <Text style={styles.flag}>no animated values</Text>
              )}
              {description?.transform ? (
                <Text style={styles.mono}>
                  {formatStyleObject({ transform: description.transform })}
                </Text>
              ) : null}
            </Section>

            <Section title="Style" defaultOpen={false}>
              {description?.className ? (
                <>
                  <Text style={styles.sub}>CSS class</Text>
                  <Text style={styles.mono}>{description.className}</Text>
                </>
              ) : null}
              {description?.cssHint ? (
                <Text style={styles.flag}>{description.cssHint}</Text>
              ) : null}
              <Text style={styles.sub}>Layout</Text>
              <Text style={styles.mono}>{formatStyleObject(description?.layout)}</Text>
              <Text style={styles.sub}>Typography</Text>
              <Text style={styles.mono}>{formatStyleObject(description?.typography)}</Text>
              <Text style={styles.sub}>Visuals</Text>
              <Text style={styles.mono}>{formatStyleObject(description?.visuals)}</Text>
            </Section>
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export default function UiInspector() {
  // Absolute overlay only — never a flex sibling SafeAreaProvider (that broke page layout).
  return <UiInspectorInner />;
}

const styles = StyleSheet.create({
  devFab: {
    position: 'absolute',
    right: 10,
    zIndex: 10001,
    backgroundColor: 'rgba(18,18,22,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  devFabOn: {
    backgroundColor: 'rgba(79,195,247,0.35)',
    borderColor: '#4FC3F7',
  },
  devFabText: {
    color: '#9cf',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  captureOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
    zIndex: 9998,
  },
  captureOverlayWeb: {
    pointerEvents: 'none',
    cursor: 'crosshair',
    backgroundColor: 'transparent',
  },
  outlineHover: {
    borderStyle: 'dashed',
  },
  crosshair: {
    position: 'absolute',
    width: 20,
    height: 20,
    zIndex: 10002,
  },
  crosshairH: {
    position: 'absolute',
    top: 9,
    left: 0,
    width: 20,
    height: 2,
    backgroundColor: '#4FC3F7',
  },
  crosshairV: {
    position: 'absolute',
    left: 9,
    top: 0,
    width: 2,
    height: 20,
    backgroundColor: '#4FC3F7',
  },
  hint: {
    alignSelf: 'center',
    backgroundColor: 'rgba(20,20,24,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  hintText: {
    color: '#eee',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  outline: {
    position: 'fixed',
    borderWidth: 1.5,
    borderColor: '#4FC3F7',
    backgroundColor: 'rgba(79,195,247,0.12)',
    zIndex: 9997,
  },
  panel: {
    position: 'absolute',
    alignSelf: 'center',
    width: PANEL_WIDTH,
    backgroundColor: 'rgba(18,18,22,0.85)',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 9999,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnText: {
    color: '#9cf',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingVertical: 2,
  },
  sectionTitle: {
    color: '#ddd',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  sectionBody: {
    marginTop: 4,
  },
  mono: {
    color: '#cfd8dc',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
  },
  monoDim: {
    color: '#607d8b',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  rowWithFile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  rowWithFileMain: {
    flex: 1,
    minWidth: 0,
  },
  sub: {
    color: '#90a4ae',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 0,
    marginBottom: 2,
  },
  linkBtn: {
    marginTop: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(79,195,247,0.2)',
    borderRadius: 4,
  },
  linkText: {
    color: '#4FC3F7',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  fileLink: {
    alignSelf: 'flex-start',
    maxWidth: 120,
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(79,195,247,0.18)',
    borderRadius: 4,
  },
  fileLinkText: {
    color: '#81d4fa',
    fontSize: 9,
    fontFamily: 'monospace',
    textDecorationLine: 'underline',
  },
  codeBox: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 4,
    padding: 4,
    marginTop: 4,
  },
  codeLine: {
    color: '#b0bec5',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  codeLineActive: {
    color: '#fff',
    backgroundColor: 'rgba(79,195,247,0.25)',
  },
  crumb: {
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  flag: {
    color: '#ffb74d',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fff',
  },
  errorText: {
    color: '#ef9a9a',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  okText: {
    color: '#a5d6a7',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  pill: {
    position: 'absolute',
    zIndex: 9999,
    backgroundColor: 'rgba(18,18,22,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pillText: {
    color: '#9cf',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
