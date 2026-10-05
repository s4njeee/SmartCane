/**
 * Find a visible UI string in project source (quoted literal or JSX text).
 * Skips accessibility labels, test IDs, and function/declaration lines.
 */

const fs = require('fs');
const path = require('path');

const SEARCH_ROOTS = [
  'app',
  'components',
  'context',
  'hooks',
  'utils',
  'constants',
  'firebase',
];

const SKIP_LINE =
  /\b(accessibilityLabel|accessibilityHint|accessibilityRole|aria-label|testID|function\s|=>\s*\{|export\s+(default\s+)?function|export\s+const\s+\w+\s*=\s*\()/i;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listSourceFiles(projectRoot) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!/\.(tsx|ts|jsx|js)$/i.test(entry.name)) continue;
      out.push(abs);
    }
  };
  for (const folder of SEARCH_ROOTS) {
    const abs = path.join(projectRoot, folder);
    if (fs.existsSync(abs)) walk(abs);
  }
  return out;
}

function scoreHit(lineText, column, needle, inPreferredFile) {
  let score = inPreferredFile ? 40 : 0;
  const before = lineText.slice(0, Math.max(0, column - 1));
  const after = lineText.slice(column - 1 + needle.length);
  const lower = lineText.toLowerCase();

  if (SKIP_LINE.test(lineText)) score -= 80;
  if (/\b(accessibilityLabel|accessibilityHint|testID)\s*=/.test(lineText)) score -= 100;
  if (/^\s*(export\s+)?(default\s+)?function\b/.test(lineText)) score -= 120;
  if (/^\s*(export\s+)?const\s+\w+\s*=\s*(\(|async)/.test(lineText)) score -= 60;

  if (/<Text\b/i.test(lineText)) score += 50;
  if (/children\s*=/.test(lineText)) score += 20;
  if (/title\s*=/.test(lineText) && !/accessibility/i.test(lineText)) score += 25;
  if (/label\s*=/.test(lineText) && !/accessibility/i.test(lineText) && !/SectionLabel/i.test(lineText)) {
    score += 10;
  }

  // Quoted string literal
  const quote = lineText[column - 2] || lineText[column - 1];
  if (quote === '"' || quote === "'" || quote === '`') score += 35;
  // JSX text node: >Edit Profile</
  if (/>\s*$/.test(before) || /[\s>]/.test(before.slice(-1))) score += 30;
  if (/^\s*</.test(after) || /^<\/Text/i.test(after.trim())) score += 40;
  if (/\{['"`]/.test(before.slice(-3))) score += 25;

  // Prefer shorter lines that are mostly the string (UI copy)
  if (lineText.trim().length < needle.length + 40) score += 15;
  if (lower.includes('classname') || lower.includes('styles.')) score -= 10;
  if (/\bDEMO_CANE_NAME\s*=/.test(lineText)) score += 220;
  if (/\bDEMO_PROFILE\b/.test(lineText) && /name\s*:/.test(lineText)) score += 120;

  return score;
}

function locateDemoFile(projectRoot, needle) {
  const rel = 'constants/demo.ts';
  const abs = path.join(projectRoot, rel);
  if (!fs.existsSync(abs)) return null;
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
  const text = String(needle || '').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const lines = content.split(/\r?\n/);
  const patterns = [
    new RegExp(`DEMO_CANE_NAME\\s*=\\s*(["'\`])${escapeRegExp(text)}\\1`),
    new RegExp(`email\\s*:\\s*(["'\`])${escapeRegExp(text)}\\1`),
    new RegExp(`name\\s*:\\s*(["'\`])${escapeRegExp(text)}\\1`),
  ];
  for (let i = 0; i < lines.length; i += 1) {
    const lineText = lines[i];
    for (const re of patterns) {
      const match = re.exec(lineText);
      if (!match) continue;
      const column = match.index + match[0].indexOf(text) + 1;
      return {
        line: i + 1,
        column,
        matched: `demo.ts:${i + 1} DEMO "${text}"`,
        file: rel,
        abs,
        score: 999,
      };
    }
  }
  // Any DEMO_CANE_NAME assignment — if needle matches the current value via export
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/DEMO_CANE_NAME\s*=\s*(['"`])([^'"`]+)\1/);
    if (m && m[2] === text) {
      return {
        line: i + 1,
        column: lines[i].indexOf(text) + 1,
        matched: `demo.ts:${i + 1} DEMO_CANE_NAME`,
        file: rel,
        abs,
        score: 999,
      };
    }
  }
  return null;
}

function findInFile(absPath, needle, preferredAbs) {
  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
  const lines = content.split(/\r?\n/);
  const preferred = preferredAbs && path.resolve(absPath) === path.resolve(preferredAbs);
  const patterns = [
    { re: new RegExp(`(["'\`])${escapeRegExp(needle)}\\1`), kind: 'quoted' },
    { re: new RegExp(`>\\s*${escapeRegExp(needle)}\\s*<`), kind: 'jsx' },
    { re: new RegExp(`\\{\\s*(["'\`])${escapeRegExp(needle)}\\1\\s*\\}`), kind: 'expr' },
    {
      re: new RegExp(`^\\s*${escapeRegExp(needle)}\\s*$`),
      kind: 'jsx-line',
    },
  ];

  let best = null;
  for (let i = 0; i < lines.length; i += 1) {
    const lineText = lines[i];
    for (const pattern of patterns) {
      const match = pattern.re.exec(lineText);
      if (!match) continue;
      let column = match.index + 1;
      if (pattern.kind === 'quoted') {
        column = match.index + 2; // inside the quotes
      } else if (pattern.kind === 'jsx' || pattern.kind === 'expr') {
        column = match.index + match[0].indexOf(needle) + 1;
      } else if (pattern.kind === 'jsx-line') {
        column = lineText.indexOf(needle) + 1;
        // Only treat bare lines as JSX text when neighbors look like tags.
        const prev = lines[i - 1] || '';
        const next = lines[i + 1] || '';
        if (!/<\/?[A-Za-z]/.test(prev) && !/<\/?[A-Za-z]/.test(next)) continue;
      }
      let score = scoreHit(lineText, column, needle, preferred) + (pattern.kind === 'quoted' ? 5 : 0);
      if (pattern.kind === 'jsx-line') score += 45;
      if (!best || score > best.score) {
        best = {
          line: i + 1,
          column,
          score,
          matched: `${path.basename(absPath)}:${i + 1} ${pattern.kind} "${needle}"`,
          abs: absPath,
        };
      }
    }
  }
  return best;
}

function locateText(projectRoot, needle, preferredRel) {
  const text = String(needle || '').replace(/\s+/g, ' ').trim();
  if (!text || text.length < 1 || text.length > 180) return null;

  const demoHit = locateDemoFile(projectRoot, text);
  if (demoHit) return demoHit;

  const preferredAbs = preferredRel
    ? path.resolve(projectRoot, String(preferredRel).replace(/\\/g, '/').split('?')[0])
    : null;

  const candidates = [];
  if (preferredAbs && fs.existsSync(preferredAbs) && fs.statSync(preferredAbs).isFile()) {
    candidates.push(preferredAbs);
  }
  for (const abs of listSourceFiles(projectRoot)) {
    if (preferredAbs && path.resolve(abs) === path.resolve(preferredAbs)) continue;
    candidates.push(abs);
  }

  let best = null;
  for (const abs of candidates) {
    const hit = findInFile(abs, text, preferredAbs);
    if (!hit) continue;
    if (!best || hit.score > best.score) {
      best = {
        ...hit,
        file: path.relative(projectRoot, abs).replace(/\\/g, '/'),
      };
    }
    // Strong preferred-file hit: stop early
    if (preferredAbs && path.resolve(abs) === path.resolve(preferredAbs) && hit.score >= 50) {
      break;
    }
  }

  if (!best || best.score < 10) return null;
  return {
    line: best.line,
    column: best.column,
    matched: best.matched,
    file: best.file,
    abs: best.abs,
    score: best.score,
  };
}

module.exports = {
  locateText,
  SKIP_LINE,
};
