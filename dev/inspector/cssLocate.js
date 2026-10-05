/**
 * Locate CSS selectors, properties, and color tokens inside a stylesheet.
 */

const fs = require('fs');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toKebab(prop) {
  if (!prop) return '';
  return String(prop)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function isColorProp(prop) {
  const k = toKebab(prop);
  return (
    k === 'color' ||
    k === 'background-color' ||
    k === 'background' ||
    k === 'border-color' ||
    k === 'border' ||
    k === 'border-top-color' ||
    k === 'border-right-color' ||
    k === 'border-bottom-color' ||
    k === 'border-left-color' ||
    k === 'outline-color' ||
    k === 'fill' ||
    k === 'stroke' ||
    k === 'shadow-color' ||
    k === 'text-decoration-color'
  );
}

function normalizeColor(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'transparent' || v === 'inherit' || v === 'currentcolor') return null;

  const hex = v.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h.split('').map((c) => c + c).join('');
    }
    if (h.length === 4) {
      // #RGBA → RRGGBBAA
      h = h.split('').map((c) => c + c).join('');
    }
    return `#${h}`;
  }

  const rgb = v.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/,
  );
  if (rgb) {
    const r = Math.round(Number(rgb[1]));
    const g = Math.round(Number(rgb[2]));
    const b = Math.round(Number(rgb[3]));
    const a = rgb[4] != null ? Number(rgb[4]) : 1;
    const hex6 = `#${[r, g, b]
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
      .join('')}`;
    if (a >= 0.999) return hex6;
    const aa = Math.round(Math.max(0, Math.min(1, a)) * 255)
      .toString(16)
      .padStart(2, '0');
    return `${hex6}${aa}`;
  }

  // Modern rgb( r g b / a )
  const rgbSpace = v.match(
    /^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/,
  );
  if (rgbSpace) {
    const r = Math.round(Number(rgbSpace[1]));
    const g = Math.round(Number(rgbSpace[2]));
    const b = Math.round(Number(rgbSpace[3]));
    let a = 1;
    if (rgbSpace[4] != null) {
      a = String(rgbSpace[4]).endsWith('%')
        ? Number(rgbSpace[4]) / 100
        : Number(rgbSpace[4]);
    }
    const hex6 = `#${[r, g, b]
      .map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0'))
      .join('')}`;
    if (a >= 0.999) return hex6;
    const aa = Math.round(Math.max(0, Math.min(1, a)) * 255)
      .toString(16)
      .padStart(2, '0');
    return `${hex6}${aa}`;
  }

  return null;
}

function extractVarNames(value) {
  if (!value || typeof value !== 'string') return [];
  const out = [];
  const re = /var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,[^)]*)?\)/g;
  let m;
  while ((m = re.exec(value))) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

function uniqueNeedles(symbol) {
  const raw = String(symbol || '').trim();
  const out = [];
  const push = (v) => {
    if (v && !out.includes(v)) out.push(v);
  };
  push(raw);
  if (raw && !raw.startsWith('.') && !raw.startsWith('#') && !raw.startsWith('--')) {
    push(`.${raw}`);
  }
  const parts = raw.replace(/^\./, '').split('.').filter(Boolean);
  if (parts.length > 1) {
    push(`.${parts.join('.')}`);
  }
  return out;
}

function findSelectorLine(lines, symbol) {
  const needles = uniqueNeedles(symbol);
  for (const needle of needles) {
    const exact = new RegExp(`^\\s*${escapeRegExp(needle)}\\s*([,{]|$)`);
    for (let i = 0; i < lines.length; i += 1) {
      if (exact.test(lines[i])) {
        return { line: i + 1, matched: needle };
      }
    }
  }
  for (const needle of needles) {
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes(needle) && /^\s*[.#]/.test(lines[i])) {
        return { line: i + 1, matched: needle };
      }
    }
  }
  return null;
}

function findPropertyInBlock(lines, selectorLine, prop) {
  const kebab = toKebab(prop);
  if (!kebab) return null;
  const aliases = [kebab];
  if (kebab === 'border-color') aliases.push('border');
  if (kebab === 'background-color') aliases.push('background');

  for (let i = selectorLine; i <= Math.min(lines.length, selectorLine + 60); i += 1) {
    const text = lines[i - 1] || '';
    if (i > selectorLine && /^\s*}/.test(text)) break;
    for (const name of aliases) {
      const propRe = new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`);
      if (propRe.test(text)) {
        const col = Math.max(1, text.indexOf(name) + 1);
        const value = text.split(':').slice(1).join(':').replace(/;\s*$/, '').trim();
        return { line: i, column: col, name, value, text };
      }
    }
  }
  return null;
}

/**
 * Find `--token:` definition. Prefer active theme block (:root or [data-theme="dark"]).
 */
function locateTokenDefinition(lines, tokenName, theme) {
  if (!tokenName) return null;
  const name = tokenName.startsWith('--') ? tokenName : `--${tokenName}`;
  const preferDark = theme === 'dark';
  const hits = [];

  let scope = 'root'; // root | dark | light
  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i];
    const trimmed = text.trim();
    if (/^:root\b/.test(trimmed) && trimmed.includes('{')) scope = 'root';
    else if (/data-theme=["']dark["']/.test(trimmed) && trimmed.includes('{')) scope = 'dark';
    else if (/^[.#a-zA-Z*]/.test(trimmed) && trimmed.includes('{') && !trimmed.startsWith('--')) {
      scope = 'light';
    }

    const m = text.match(new RegExp(`^\\s*(${escapeRegExp(name)})\\s*:`));
    if (!m) continue;
    const col = Math.max(1, text.indexOf(name) + 1);
    const value = text.split(':').slice(1).join(':').replace(/;\s*$/, '').trim();
    hits.push({
      line: i + 1,
      column: col,
      matched: name,
      value,
      scope,
    });
  }

  if (!hits.length) return null;
  const preferred = preferDark
    ? hits.find((h) => h.scope === 'dark') || hits.find((h) => h.scope === 'light' || h.scope === 'root') || hits[0]
    : hits.find((h) => h.scope === 'light' || h.scope === 'root') || hits[0];
  return preferred;
}

/**
 * Match a computed/hex color to a --color-* / --tint-* token in the theme block.
 */
function locateTokenByColorValue(lines, colorValue, theme) {
  const target = normalizeColor(colorValue);
  if (!target) return null;

  const preferDark = theme === 'dark';
  const hits = [];
  let scope = 'root';

  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i];
    if (/^\s*:root\s*\{/.test(text)) scope = 'root';
    else if (/^\s*\[data-theme=["']dark["']\]\s*\{/.test(text)) scope = 'dark';

    const m = text.match(/^\s*(--(?:color|tint)-[A-Za-z0-9_-]+)\s*:\s*([^;]+);?\s*$/);
    if (!m) continue;
    const token = m[1];
    // Black icons must not open --color-shadow / --color-overlay.
    if (/shadow|overlay/.test(token)) continue;
    const raw = m[2].trim();
    const norm = normalizeColor(raw);
    if (!norm) continue;

    // Exact, or 6-digit vs 8-digit with full alpha
    const same =
      norm === target ||
      (norm.length === 7 && target.length === 9 && target.startsWith(norm) && target.endsWith('ff')) ||
      (target.length === 7 && norm.length === 9 && norm.startsWith(target) && norm.endsWith('ff'));
    if (!same) continue;

    hits.push({
      line: i + 1,
      column: Math.max(1, text.indexOf(token) + 1),
      matched: token,
      value: raw,
      scope,
    });
  }

  if (!hits.length) return null;
  return preferDark
    ? hits.find((h) => h.scope === 'dark') || hits[0]
    : hits.find((h) => h.scope === 'root') || hits[0];
}

/**
 * @param {string} absPath
 * @param {string} symbol e.g. ".profile-avatar" or "--color-primary"
 * @param {string} [prop] e.g. "borderColor"
 * @param {{ theme?: string, token?: boolean|string, color?: string }} [options]
 */
function resolveDeclaration(lines, value, theme, depth = 0) {
  if (!value || depth > 4) return value;
  return String(value).replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g, (full, name) => {
    const hit = locateTokenDefinition(lines, name, theme);
    if (!hit?.value) return full;
    return resolveDeclaration(lines, hit.value, theme, depth + 1);
  });
}

/**
 * A shared class paints every copy. When the clicked element has its own
 * is-* class, write a private color rule so editing it changes only that one.
 */
const SHARED_STATES = new Set([
  'is-danger', 'is-warning', 'is-info', 'is-success', 'is-active', 'is-selected',
  'is-on', 'is-off', 'is-ok', 'is-bad', 'is-neutral', 'is-low', 'is-crit',
  'is-first', 'is-busy', 'is-loading', 'is-from', 'is-to', 'is-thick',
  'is-auth', 'is-input-bg', 'is-add', 'is-close', 'is-full',
]);

function symbolHasInstance(symbol) {
  const parts = String(symbol || '').split('.').filter(Boolean);
  return parts.slice(1).some((name) => name.startsWith('is-') && !SHARED_STATES.has(name));
}

function ensureInstanceColor(absPath, symbol, prop, colorHint) {
  if (!symbol || !prop || !isColorProp(prop)) return;
  const raw = String(symbol).trim();
  const parts = raw.split('.').filter(Boolean);
  if (parts.length < 2) return;
  const baseName = parts[0];
  const states = parts.slice(1).filter((name) => name.startsWith('is-'));
  const instance = states.find((name) => !SHARED_STATES.has(name));
  if (!instance) return;
  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return;
  }
  const nl = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const existing = findSelectorLine(lines, raw);
  if (existing && findPropertyInBlock(lines, existing.line, prop)) return;
  const tone = states.find((name) => SHARED_STATES.has(name));
  const toned = tone ? findSelectorLine(lines, `.${baseName}.${tone}`) : null;
  const baseSel = (toned && findPropertyInBlock(lines, toned.line, prop))
    ? toned
    : findSelectorLine(lines, `.${baseName}`);
  const propHit = baseSel ? findPropertyInBlock(lines, baseSel.line, prop) : null;
  const cssProp = propHit?.name || toKebab(prop);
  const hinted = normalizeColor(String(colorHint || ''));
  const usableHint = hinted && hinted !== '#000000' && hinted !== '#ffffff' ? hinted : null;
  const lightValue = propHit?.value
    ? resolveDeclaration(lines, propHit.value, 'light')
    : usableHint;
  const darkValue = propHit?.value
    ? resolveDeclaration(lines, propHit.value, 'dark')
    : usableHint;
  if (!lightValue) return;
  const varName = `--${parts.join('-')}-${toKebab(cssProp)}`;
  let addition = `${nl}${raw} {${nl}  ${varName}: ${lightValue};${nl}  ${cssProp}: var(${varName});${nl}}${nl}`;
  if (darkValue && darkValue !== lightValue) {
    addition += `[data-theme="dark"] ${raw} {${nl}  ${varName}: ${darkValue};${nl}}${nl}`;
  }
  fs.appendFileSync(absPath, addition);
  // #region agent log
  fetch('http://127.0.0.1:7721/ingest/7b27707b-f678-425d-8402-d4da67f06182',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d610b9'},body:JSON.stringify({sessionId:'d610b9',hypothesisId:'H7',location:'cssLocate.js:ensureInstanceColor',message:'private color rule created',data:{symbol:raw,prop:cssProp,varName,lightValue},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

function locateCss(absPath, symbol, prop, options = {}) {
  ensureInstanceColor(absPath, symbol, prop, options.color);
  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
  const lines = content.split(/\r?\n/);
  const theme = options.theme === 'dark' ? 'dark' : 'light';
  const wantToken =
    options.token === true ||
    options.token === '1' ||
    options.token === 'true' ||
    (prop && isColorProp(prop));

  // Direct token open: symbol is --color-primary
  if (symbol && String(symbol).trim().startsWith('--')) {
    const hit = locateTokenDefinition(lines, String(symbol).trim(), theme);
    if (hit) {
      return {
        line: hit.line,
        column: hit.column,
        matched: hit.matched,
      };
    }
  }

  const sel = symbol ? findSelectorLine(lines, symbol) : null;
  const propHit = sel && prop ? findPropertyInBlock(lines, sel.line, prop) : null;

  // Color clicks follow var() only when this selector actually sets that property.
  // A shared token match by RGB opens cane-status / text colors that do not paint the icon.
  if (wantToken && propHit?.value) {
    const vars = extractVarNames(propHit.value);
    for (const varName of vars) {
      const tokenHit = locateTokenDefinition(lines, varName, theme);
      if (tokenHit) {
        return {
          line: tokenHit.line,
          column: tokenHit.column,
          matched: `${sel?.matched || symbol} -> ${tokenHit.matched}`,
        };
      }
    }
  }

  if (wantToken && !sel && !symbolHasInstance(symbol)) {
    const colorHint = options.color;
    if (colorHint) {
      const byValue = locateTokenByColorValue(lines, colorHint, theme);
      if (byValue) {
        return {
          line: byValue.line,
          column: byValue.column,
          matched: byValue.matched,
        };
      }
    }
  }

  if (propHit) {
    return {
      line: propHit.line,
      column: propHit.column,
      matched: `${sel.matched} -> ${propHit.name}`,
    };
  }
  // Color clicks must not open a layout rule that never sets that property.
  if (prop && isColorProp(prop) && !symbolHasInstance(symbol)) {
    if (options.color) {
      const byValue = locateTokenByColorValue(lines, options.color, theme);
      if (byValue) {
        return {
          line: byValue.line,
          column: byValue.column,
          matched: byValue.matched,
        };
      }
    }
    return null;
  }
  if (sel) {
    return { line: sel.line, column: 1, matched: sel.matched };
  }

  // Last resort: match color value alone. Never for a named instance —
  // rgb(0,0,0) was matching --color-shadow and recoloring the whole app.
  if (options.color && !symbolHasInstance(symbol)) {
    const byValue = locateTokenByColorValue(lines, options.color, theme);
    if (byValue) {
      return {
        line: byValue.line,
        column: byValue.column,
        matched: byValue.matched,
      };
    }
  }

  return null;
}

function buildCssIndex(absPath) {
  const index = {};
  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return index;
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^\s*([.#]?[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\s*\{/);
    if (!m) continue;
    const sel = m[1];
    if (!index[sel]) index[sel] = i + 1;
  }
  // Include color tokens from :root
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^\s*(--(?:color|tint)-[A-Za-z0-9_-]+)\s*:/);
    if (m && !index[m[1]]) index[m[1]] = i + 1;
  }
  return index;
}

module.exports = {
  locateCss,
  buildCssIndex,
  toKebab,
  isColorProp,
  normalizeColor,
  extractVarNames,
};
