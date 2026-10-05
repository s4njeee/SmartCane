/**
 * Summarize RN element styles/props for the UI Inspector panel.
 * Native: StyleSheet.flatten. Web: also report className (rules live in styles/index.css).
 */

import { StyleSheet } from 'react-native';

const LAYOUT_KEYS = [
  'display',
  'flex',
  'flexDirection',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'flexWrap',
  'alignItems',
  'alignSelf',
  'justifyContent',
  'gap',
  'rowGap',
  'columnGap',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'marginHorizontal',
  'marginVertical',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'paddingHorizontal',
  'paddingVertical',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
  'overflow',
];

const TYPOGRAPHY_KEYS = [
  'fontSize',
  'fontWeight',
  'fontFamily',
  'fontStyle',
  'color',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecorationLine',
  'textTransform',
];

const VISUAL_KEYS = [
  'backgroundColor',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderColor',
  'borderWidth',
  'borderStyle',
  'opacity',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'elevation',
  'transform',
];

const COLOR_KEYS = [
  'color',
  'backgroundColor',
  'borderColor',
  'shadowColor',
  'tintColor',
  'overlayColor',
  'textDecorationColor',
];

function pick(style, keys) {
  const out = {};
  if (!style) return out;
  for (const key of keys) {
    if (style[key] !== undefined && style[key] !== null) {
      out[key] = style[key];
    }
  }
  return out;
}

function flattenStyle(style) {
  try {
    return StyleSheet.flatten(style) || {};
  } catch {
    return typeof style === 'object' && style && !Array.isArray(style) ? style : {};
  }
}

function isAnimatedValue(value) {
  if (!value || typeof value !== 'object') return false;
  const name = value.constructor?.name || '';
  if (
    name === 'AnimatedValue' ||
    name === 'AnimatedInterpolation' ||
    name === 'AnimatedStyle' ||
    name === 'AnimatedTransform'
  ) {
    return true;
  }
  if ('value' in value && typeof value.addListener === 'function') return true;
  if (value._isReanimatedSharedValue || value.__reanimatedSharedValue) return true;
  return false;
}

function styleContainsAnimated(style) {
  if (!style || typeof style !== 'object') return false;
  if (Array.isArray(style)) return style.some(styleContainsAnimated);
  for (const key of Object.keys(style)) {
    const value = style[key];
    if (isAnimatedValue(value)) return true;
    if (key === 'transform' && Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object') {
          for (const v of Object.values(entry)) {
            if (isAnimatedValue(v)) return true;
          }
        }
      }
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (styleContainsAnimated(value)) return true;
    }
  }
  return false;
}

function collectColors(style) {
  const colors = [];
  if (!style) return colors;
  for (const key of COLOR_KEYS) {
    const value = style[key];
    if (typeof value === 'string' || typeof value === 'number') {
      colors.push({ key, value: String(value) });
    }
  }
  return colors;
}

function extractText(props) {
  const texts = [];
  const walk = (node) => {
    if (node == null || typeof node === 'boolean') return;
    if (typeof node === 'string' || typeof node === 'number') {
      const value = String(node).trim();
      if (value) texts.push(value);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'object' && node.props) {
      walk(node.props.children);
    }
  };
  walk(props?.children);
  return [...new Set(texts)].slice(0, 8);
}

function summarizeImageSource(source) {
  if (!source) return null;
  if (typeof source === 'number') return { type: 'asset', id: source };
  if (typeof source === 'string') return { uri: source };
  if (Array.isArray(source)) {
    return source.map(summarizeImageSource).filter(Boolean);
  }
  if (typeof source === 'object' && source.uri) {
    return { uri: String(source.uri) };
  }
  return { type: typeof source };
}

function shortSrcLabel(src) {
  if (!src || typeof src !== 'string') return null;
  const noQuery = src.split('?')[0];
  const parts = noQuery.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || noQuery;
}

function nodeLooksLikeText(node) {
  const host = String(node?.hostName || node?.name || '');
  if (host === 'Text' || host.endsWith('.Text')) return true;
  const texts = extractText(node?.props);
  return texts.length > 0;
}

function textInsideDom(domNode) {
  if (!domNode || typeof document === 'undefined' || typeof document.createTreeWalker !== 'function') {
    return null;
  }
  const out = [];
  const walker = document.createTreeWalker(domNode, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const value = String(node.textContent || '').replace(/\s+/g, ' ').trim();
    const parent = node.parentElement;
    const iconGlyph = parent && isIconNode(parent);
    if (value && !iconGlyph) out.push(value);
    node = walker.nextNode();
  }
  return [...new Set(out)].slice(0, 12);
}

function buildTextEntries(element, fallbackSrc) {
  const related = element?.related || [];
  const inside = textInsideDom(element?.domNode);
  // #region agent log
  fetch('http://127.0.0.1:7721/ingest/7b27707b-f678-425d-8402-d4da67f06182',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d610b9'},body:JSON.stringify({sessionId:'d610b9',hypothesisId:'H9',location:'describeElement.js:buildTextEntries',message:'text entries source pick',data:{className:domClassNames(element?.domNode).join(' '),texts:inside||[],related:related.length},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  const entries = [];
  const seen = new Set();

  const pushEntry = (text, src) => {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({
      text: value,
      src: src || fallbackSrc || null,
      srcLabel: shortSrcLabel(src || fallbackSrc),
      locateText: value,
    });
  };

  if (inside && inside.length) {
    for (const text of inside) {
      let matchedSrc = null;
      for (const node of related) {
        if (!nodeLooksLikeText(node)) continue;
        const lines = extractText(node.props);
        if (lines.some((line) => line.replace(/\s+/g, ' ').trim() === text)) {
          matchedSrc = node.src || matchedSrc;
          break;
        }
      }
      pushEntry(text, matchedSrc || fallbackSrc);
    }
    return entries.slice(0, 12);
  }

  for (const node of related) {
    if (!nodeLooksLikeText(node)) continue;
    for (const line of extractText(node.props)) {
      pushEntry(line, node.src || fallbackSrc);
    }
  }

  if (!entries.length) {
    for (const line of extractText(element?.props)) {
      pushEntry(line, fallbackSrc);
    }
  }
  return entries.slice(0, 12);
}

function cssClassNames(props) {
  if (typeof props?.className === 'string' && props.className.trim()) {
    return props.className
      .split(/\s+/)
      .filter((n) => n && !n.startsWith('css-') && !n.startsWith('r-'));
  }
  // $$css style objects also carry real DOM class names as keys
  const style = props?.style;
  const bag = Array.isArray(style) ? style : [style];
  const names = [];
  for (const item of bag) {
    if (item && item.$$css === true) {
      for (const key of Object.keys(item)) {
        if (key !== '$$css' && typeof item[key] === 'string') {
          names.push(item[key]);
        }
      }
    }
  }
  return names.filter((n) => n && !n.startsWith('css-') && !n.startsWith('r-'));
}

const SHARED_STATES = new Set([
  'is-danger', 'is-warning', 'is-info', 'is-success', 'is-active', 'is-selected',
  'is-on', 'is-off', 'is-ok', 'is-bad', 'is-neutral', 'is-low', 'is-crit',
  'is-first', 'is-busy', 'is-loading', 'is-from', 'is-to', 'is-thick',
  'is-auth', 'is-input-bg', 'is-add', 'is-close', 'is-full',
]);

function primaryCssSelector(classNames, propKey) {
  if (!classNames?.length) return null;
  const base = classNames.find((n) => !n.startsWith('is-')) || classNames[0];
  const instance = classNames.find((n) => n.startsWith('is-') && !SHARED_STATES.has(n));
  const state = classNames.find((n) => SHARED_STATES.has(n));
  if (instance && state && propKey !== 'borderColor' && propKey !== 'borderWidth') {
    return `.${base}.${instance}.${state}`;
  }
  if (instance) return `.${base}.${instance}`;
  if (propKey === 'borderColor' || propKey === 'borderWidth') return `.${base}`;
  return state ? `.${base}.${state}` : `.${base}`;
}

function activeTheme() {
  try {
    if (typeof document !== 'undefined' && document.documentElement?.dataset?.theme) {
      return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    }
  } catch {
    // ignore
  }
  return 'light';
}

function cssSourceLocator(classNames, propKey, colorValue, { forColor = false } = {}) {
  const selector = primaryCssSelector(classNames, propKey);
  const qs = new URLSearchParams();
  if (selector) qs.set('symbol', selector);
  if (propKey) qs.set('prop', propKey);
  qs.set('theme', activeTheme());
  // Color rows jump to --color-* / --tint-* tokens, not the component rule.
  if (forColor || propKey) {
    qs.set('token', '1');
  }
  if (colorValue) qs.set('color', String(colorValue));
  return {
    src: `styles/index.css:1:1?${qs.toString()}`,
    srcLabel: forColor ? 'color' : 'index.css',
    symbol: selector,
    prop: propKey || null,
    color: colorValue || null,
    theme: activeTheme(),
    token: forColor || Boolean(propKey),
  };
}

function isTransparentColor(value) {
  if (!value) return true;
  const v = String(value).replace(/\s/g, '').toLowerCase();
  return v === 'transparent' || v === 'rgba(0,0,0,0)' || v === 'rgba(0,0,0,0.0)';
}

function pxWidth(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function domClassNames(node) {
  if (!node) return [];
  const raw = node.className;
  const text = typeof raw === 'string' ? raw : raw?.baseVal || '';
  return String(text)
    .split(/\s+/)
    .filter((n) => n && !n.startsWith('css-') && !n.startsWith('r-'));
}

function isTextHost(node) {
  if (!node || node.nodeType !== 1) return false;
  if (isIconNode(node)) return false;
  const tag = String(node.tagName || '').toLowerCase();
  if (tag === 'svg' || tag === 'path' || tag === 'img') return false;
  const cls = typeof node.className === 'string' ? node.className : '';
  if (cls.includes('css-text')) return true;
  return tag === 'p' || tag === 'label' || tag === 'h1' || tag === 'h2' || tag === 'h3';
}

function nodeClassText(node) {
  if (!node) return '';
  const raw = node.className;
  return typeof raw === 'string' ? raw : raw?.baseVal || '';
}

function isIconNode(node) {
  if (!node || node.nodeType !== 1) return false;
  const tag = String(node.tagName || '').toLowerCase();
  if (tag === 'svg' || tag === 'path' || tag === 'use') return true;
  let current = node;
  for (let i = 0; i < 3 && current; i += 1) {
    const cls = nodeClassText(current);
    if (/(^|[\s_])[\w-]*icon[\w-]*/i.test(cls) || cls.includes('ionicon')) return true;
    current = current.parentElement;
  }
  return false;
}

function colorRole(key, owner) {
  if (key === 'backgroundColor') return 'background-color';
  if (key === 'borderColor' || (String(key).includes('border') && String(key).includes('Color'))) {
    return 'border-color';
  }
  if (key === 'fill' || key === 'stroke') return 'icon-color';
  if (key === 'color' && isIconNode(owner)) return 'icon-color';
  if (key === 'color' || key === 'textDecorationColor') return 'text-color';
  return String(key || 'color').replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Color/fill set on this node, not merely inherited from a parent. */
function explicitForeground(node) {
  if (!node || node.nodeType !== 1 || typeof getComputedStyle !== 'function') return null;
  try {
    const cs = getComputedStyle(node);
    const tag = String(node.tagName || '').toLowerCase();
    if (tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'g') {
      const fill = cs.fill;
      if (
        fill &&
        fill !== 'none' &&
        String(fill).toLowerCase() !== 'currentcolor' &&
        !isTransparentColor(fill)
      ) {
        return fill;
      }
    }
    if (node.style && node.style.color) return cs.color;
    const parent = node.parentElement;
    if (parent) {
      const parentColor = getComputedStyle(parent).color;
      if (cs.color && cs.color !== parentColor && !isTransparentColor(cs.color)) {
        return cs.color;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function findPaintedForeground(node) {
  const own = explicitForeground(node);
  if (own) return { value: own, node };
  if (!node?.querySelectorAll) {
    if (isTextHost(node)) {
      try {
        const color = getComputedStyle(node).color;
        if (!isTransparentColor(color)) return { value: color, node };
      } catch {
        return null;
      }
    }
    return null;
  }
  const list = node.querySelectorAll('svg, path, span, div');
  const limit = Math.min(list.length, 16);
  for (let i = 0; i < limit; i += 1) {
    const child = list[i];
    const painted = explicitForeground(child);
    if (painted) return { value: painted, node: child };
  }
  if (isTextHost(node)) {
    try {
      const color = getComputedStyle(node).color;
      if (!isTransparentColor(color)) return { value: color, node };
    } catch {
      return null;
    }
  }
  return null;
}

function computedStyleColors(domNode) {
  if (!domNode || typeof getComputedStyle !== 'function' || domNode.nodeType !== 1) return [];
  try {
    const out = [];
    const seenPaint = new Set();
    const push = (key, value, owner) => {
      if (!value || isTransparentColor(value)) return;
      const names = domClassNames(owner);
      const role = colorRole(key, owner);
      const id = `${role}|${value}|${names.join(' ')}`;
      if (seenPaint.has(id)) return;
      seenPaint.add(id);
      out.push({
        key,
        role,
        value: String(value),
        ownerClass: names.join(' '),
        isTextColor: role === 'text-color',
      });
    };

    const paintNode = (node) => {
      const style = getComputedStyle(node);
      if (!isTransparentColor(style.backgroundColor)) {
        push('backgroundColor', style.backgroundColor, node);
      }
      const bordered = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth']
        .some((side) => pxWidth(style[side]) > 0);
      if (bordered && !isTransparentColor(style.borderTopColor)) {
        push('borderColor', style.borderTopColor, node);
      }
      const own = explicitForeground(node);
      if (own) push('color', own, node);
      else if (isTextHost(node) && !isTransparentColor(style.color)) {
        push('color', style.color, node);
      }
    };

    paintNode(domNode);
    if (domNode.querySelectorAll) {
      const kids = domNode.querySelectorAll('*');
      const limit = Math.min(kids.length, 24);
      for (let i = 0; i < limit; i += 1) paintNode(kids[i]);
    }

    // #region agent log
    fetch('http://127.0.0.1:7721/ingest/7b27707b-f678-425d-8402-d4da67f06182',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d610b9'},body:JSON.stringify({sessionId:'d610b9',hypothesisId:'H1-H3',location:'describeElement.js:computedStyleColors',message:'painted colors for picked node',data:{tag:domNode.tagName,className:domClassNames(domNode).join(' '),inlineColor:domNode.style&&domNode.style.color||'',colors:out.map((c)=>({key:c.key,role:c.role,value:c.value,ownerClass:c.ownerClass,isText:c.isTextColor}))},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return out;
  } catch {
    return [];
  }
}

function buildColorEntries(element, flat, fallbackSrc) {
  const related = element?.related || [];
  const entries = [];
  const seen = new Set();
  const classNames = cssClassNames(element?.props);
  const cssLoc = classNames.length
    ? cssSourceLocator(classNames, null, null, { forColor: false })
    : null;

  const pushPainted = (painted) => {
    for (const c of painted) {
      const ownerNames = c.ownerClass
        ? c.ownerClass.split(/\s+/).filter(Boolean)
        : classNames;
      const loc = cssSourceLocator(
        ownerNames.length ? ownerNames : classNames,
        c.key,
        c.value,
        { forColor: true },
      );
      const src = loc?.src || null;
      const key = `${c.key}|${c.value}|${src || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        ...c,
        role: c.role || colorRole(c.key, null),
        isTextColor: c.isTextColor === true,
        src,
        srcLabel: c.role || colorRole(c.key, null),
        symbol: loc?.symbol || null,
        prop: loc?.prop || c.key,
        color: c.value,
        theme: loc?.theme || activeTheme(),
        token: true,
      });
    }
  };

  // Website: only colors that are actually painted (icon fill, chip, real borders)
  if (cssLoc || element?.domNode) {
    const fromDom = computedStyleColors(element?.domNode);
    if (fromDom.length) {
      pushPainted(fromDom);
      return entries.slice(0, 16);
    }
  }

  const pushNative = (style, src) => {
    for (const c of collectColors(style)) {
      const key = `${c.key}|${c.value}|${src || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({
        ...c,
        role: colorRole(c.key, null),
        isTextColor: c.key === 'color' || c.key === 'textDecorationColor',
        src: src || null,
        srcLabel: colorRole(c.key, null),
        symbol: null,
        prop: c.key,
      });
    }
  };

  pushNative(flat, fallbackSrc);
  for (const node of related) {
    pushNative(flattenStyle(node.props?.style), node.src || fallbackSrc);
  }
  return entries.slice(0, 16);
}

function elementLabels(domNode) {
  if (!domNode?.querySelectorAll) return [];
  const out = [];
  const seen = new Set();
  const kids = domNode.querySelectorAll('*');
  const limit = Math.min(kids.length, 16);
  for (let i = 0; i < limit; i += 1) {
    const names = domClassNames(kids[i]);
    const label = names[0] || String(kids[i].tagName || '').toLowerCase();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push({ label });
  }
  return out;
}

function motionInside(domNode) {
  if (!domNode || typeof getComputedStyle !== 'function') return [];
  const out = [];
  const seen = new Set();
  const nodes = [domNode];
  if (domNode.querySelectorAll) {
    const kids = domNode.querySelectorAll('*');
    const limit = Math.min(kids.length, 16);
    for (let i = 0; i < limit; i += 1) nodes.push(kids[i]);
  }
  for (const node of nodes) {
    let style;
    try {
      style = getComputedStyle(node);
    } catch {
      continue;
    }
    const name = style.animationName;
    const duration = style.animationDuration;
    if (name && name !== 'none' && duration && duration !== '0s') {
      const label = `${domClassNames(node)[0] || node.tagName} ${name} ${duration}`;
      if (!seen.has(label)) {
        seen.add(label);
        out.push({ label, src: null, srcLabel: null });
      }
    }
  }
  return out.slice(0, 8);
}

function measuredSize(domNode) {
  if (!domNode?.getBoundingClientRect) return null;
  try {
    const rect = domNode.getBoundingClientRect();
    return {
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    };
  } catch {
    return null;
  }
}

const SIZE_COMPUTED_KEYS = [
  ['width', 'width'],
  ['height', 'height'],
  ['minWidth', 'min-width'],
  ['minHeight', 'min-height'],
  ['maxWidth', 'max-width'],
  ['maxHeight', 'max-height'],
  ['paddingTop', 'padding-top'],
  ['paddingRight', 'padding-right'],
  ['paddingBottom', 'padding-bottom'],
  ['paddingLeft', 'padding-left'],
  ['marginTop', 'margin-top'],
  ['marginRight', 'margin-right'],
  ['marginBottom', 'margin-bottom'],
  ['marginLeft', 'margin-left'],
  ['gap', 'gap'],
  ['rowGap', 'row-gap'],
  ['columnGap', 'column-gap'],
  ['fontSize', 'font-size'],
  ['lineHeight', 'line-height'],
  ['borderRadius', 'border-radius'],
  ['borderWidth', 'border-width'],
];

function formatSizeValue(value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw || raw === 'auto' || raw === 'none' || raw === 'normal') return null;
  if (raw === '0px' || raw === '0') return null;
  // Skip huge computed max-* defaults
  if (/^(\d+(\.\d+)?)px$/.test(raw)) {
    const n = parseFloat(raw);
    if (n > 10000) return null;
  }
  return raw;
}

function buildSizeEntries(element, flat, fallbackSrc) {
  const classNames = cssClassNames(element?.props);
  const domClasses = domClassNames(element?.domNode);
  const names = classNames.length ? classNames : domClasses;
  const entries = [];
  const seen = new Set();

  const push = (role, key, value, propKey) => {
    const display = formatSizeValue(value);
    if (display == null && role !== 'measured-width' && role !== 'measured-height') return;
    const shown =
      role === 'measured-width' || role === 'measured-height'
        ? `${Math.round(Number(value) || 0)}px`
        : display;
    if (!shown) return;
    const id = `${role}|${shown}`;
    if (seen.has(id)) return;
    seen.add(id);
    const loc = names.length
      ? cssSourceLocator(names, propKey || key, null, { forColor: false })
      : null;
    if (loc) {
      // Sizing opens the CSS property, not a color token.
      const qs = new URLSearchParams();
      if (loc.symbol) qs.set('symbol', loc.symbol);
      if (propKey || key) qs.set('prop', propKey || key);
      qs.set('theme', loc.theme || activeTheme());
      qs.set('token', '0');
      entries.push({
        role,
        key: propKey || key,
        value: shown,
        src: `styles/index.css:1:1?${qs.toString()}`,
        srcLabel: role,
        symbol: loc.symbol,
        prop: propKey || key,
        theme: loc.theme,
        token: false,
      });
      return;
    }
    entries.push({
      role,
      key: propKey || key,
      value: shown,
      src: fallbackSrc || null,
      srcLabel: role,
      symbol: null,
      prop: propKey || key,
      token: false,
    });
  };

  const measured = measuredSize(element?.domNode);
  if (measured) {
    push('measured-width', 'width', measured.width, 'width');
    push('measured-height', 'height', measured.height, 'height');
  }

  if (element?.domNode && typeof getComputedStyle === 'function') {
    try {
      const cs = getComputedStyle(element.domNode);
      for (const [camel, role] of SIZE_COMPUTED_KEYS) {
        const val = cs[camel] ?? cs.getPropertyValue?.(role);
        push(role, camel, val, camel);
      }
    } catch {
      // ignore
    }
  } else if (flat && typeof flat === 'object') {
    for (const key of [
      'width',
      'height',
      'minWidth',
      'minHeight',
      'maxWidth',
      'maxHeight',
      'padding',
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'margin',
      'marginTop',
      'marginRight',
      'marginBottom',
      'marginLeft',
      'gap',
      'fontSize',
      'lineHeight',
      'borderRadius',
      'borderWidth',
    ]) {
      if (flat[key] == null) continue;
      const role = String(key).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      push(role, key, flat[key], key);
    }
  }

  return entries.slice(0, 24);
}

function buildAnimationEntries(element, animatedSelf, fallbackSrc) {
  const related = element?.related || [];
  const entries = [];
  const seen = new Set();

  const push = (label, src) => {
    const key = `${label}|${src || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({
      label,
      src: src || null,
      srcLabel: shortSrcLabel(src),
    });
  };

  if (animatedSelf) push('animated style', fallbackSrc);

  for (const node of related) {
    const style = node.props?.style;
    if (styleContainsAnimated(style)) {
      push(`${node.name || 'Node'} animated`, node.src || fallbackSrc);
    }
  }
  return entries.slice(0, 8);
}

/**
 * @param {object} element result from findElementAtPoint
 */
export function describeElement(element) {
  if (!element) {
    return {
      layout: {},
      typography: {},
      visuals: {},
      colors: [],
      textEntries: [],
      colorEntries: [],
      textColorEntries: [],
      sizeEntries: [],
      animationEntries: [],
      className: null,
      cssHint: null,
      animated: false,
      transform: null,
      usefulProps: {},
      hooks: [],
    };
  }

  const props = element.props || {};
  const flat = flattenStyle(props.style);
  const animated = styleContainsAnimated(props.style) || styleContainsAnimated(flat);
  const fallbackSrc = element.src || null;
  const meta =
    element.meta ||
    (typeof props.__inspMeta === 'string'
      ? (() => {
          try {
            return JSON.parse(props.__inspMeta);
          } catch {
            return null;
          }
        })()
      : props.__inspMeta);

  const colorEntries = buildColorEntries(element, flat, fallbackSrc);
  const textColorEntries = colorEntries.filter((c) => c.isTextColor);
  const textEntries = buildTextEntries(element, fallbackSrc);
  const animationEntries = [
    ...motionInside(element.domNode),
    ...buildAnimationEntries(element, animated, fallbackSrc),
  ];
  const sizeEntries = buildSizeEntries(element, flat, fallbackSrc);
  const size = measuredSize(element.domNode);
  const layout = pick(flat, LAYOUT_KEYS);
  if (size) {
    layout.width = size.width;
    layout.height = size.height;
  }

  return {
    layout,
    typography: pick(flat, TYPOGRAPHY_KEYS),
    visuals: pick(flat, VISUAL_KEYS),
    colors: colorEntries,
    textEntries,
    elementEntries: elementLabels(element.domNode),
    colorEntries,
    textColorEntries,
    sizeEntries,
    animationEntries,
    className: (() => {
      const names = cssClassNames(props);
      return names.length ? names.join(' ') : null;
    })(),
    cssSrc: (() => {
      const names = cssClassNames(props);
      if (!names.length) return null;
      // Files → CSS opens the component class rule (not a color token)
      const qs = new URLSearchParams();
      const sel = primaryCssSelector(names);
      if (sel) qs.set('symbol', sel);
      qs.set('theme', activeTheme());
      return `styles/index.css:1:1?${qs.toString()}`;
    })(),
    cssHint: cssClassNames(props).length
      ? 'Colors open token defs (--color-*). CSS file opens the component rule.'
      : null,
    animated,
    animationKind: animated ? 'animated style' : null,
    transform: flat.transform || null,
    text: textEntries.map((t) => t.text),
    usefulProps: {
      testID: props.testID ?? null,
      accessibilityLabel: props.accessibilityLabel ?? null,
      accessibilityRole: props.accessibilityRole ?? null,
      onPress: typeof props.onPress === 'function',
      onLongPress: typeof props.onLongPress === 'function',
      onChangeText: typeof props.onChangeText === 'function',
      source: summarizeImageSource(props.source),
    },
    hooks: Array.isArray(meta?.hooks) ? meta.hooks : [],
    component: meta?.component || element.name || null,
  };
}

export function formatStyleObject(obj) {
  if (!obj || !Object.keys(obj).length) return '(none)';
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
