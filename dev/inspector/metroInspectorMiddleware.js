/**
 * Dev-only Metro middleware for the UI Inspector.
 * Serves GET /__insp/source and GET /__insp/open (Cursor file:line).
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parse: urlParse } = require('url');
const { locateCss, buildCssIndex } = require('./cssLocate');

const CONTEXT_LINES = 12;

const PROJECT_FOLDERS = [
  'app/',
  'components/',
  'context/',
  'hooks/',
  'utils/',
  'constants/',
  'firebase/',
  'styles/',
];

function toProjectRelative(file, projectRoot) {
  if (!file || typeof file !== 'string') return null;
  let next = file
    .replace(/\\/g, '/')
    .replace(/^file:\/\//i, '')
    .split('?')[0]
    .trim()
    .replace(/\/{2,}/g, '/');
  try {
    next = decodeURIComponent(next);
  } catch {
    // keep raw
  }
  if (/^\/[A-Za-z]:\//.test(next)) next = next.slice(1);

  const rootFwd = path.resolve(projectRoot).replace(/\\/g, '/');
  if (next.toLowerCase().startsWith(rootFwd.toLowerCase())) {
    next = next.slice(rootFwd.length).replace(/^\//, '');
  }

  const marker = '/smartcane/';
  const marked = next.toLowerCase().lastIndexOf(marker);
  if (marked >= 0) {
    next = next.slice(marked + marker.length);
  }

  if (path.isAbsolute(next) || /^[A-Za-z]:\//.test(next)) {
    const lower = next.toLowerCase();
    let cut = -1;
    for (const folder of PROJECT_FOLDERS) {
      const idx = lower.lastIndexOf(`/${folder}`);
      if (idx >= 0 && (cut < 0 || idx < cut)) cut = idx + 1;
    }
    if (cut >= 0) next = next.slice(cut);
  }

  if (!next || next.includes('\0') || next.includes('..')) return null;
  if (path.isAbsolute(next) || /^[A-Za-z]:\//.test(next)) return null;
  if (next.startsWith('node_modules/') || next.includes('/node_modules/')) return null;

  const resolved = path.resolve(projectRoot, next);
  const rootResolved = path.resolve(projectRoot);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
    return null;
  }
  return next.replace(/\\/g, '/');
}

function resolveExistingFile(rel, projectRoot) {
  const variants = [rel];
  const fwd = rel.replace(/\\/g, '/');
  if (fwd.startsWith('app/')) {
    variants.push(fwd.slice(4));
  } else {
    variants.push(`app/${fwd}`);
  }
  const seen = new Set();
  for (const candidate of variants) {
    const norm = candidate.replace(/\\/g, '/');
    if (seen.has(norm)) continue;
    seen.add(norm);
    const abs = path.resolve(projectRoot, norm);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return { rel: norm, abs };
    }
  }
  return null;
}

const LOCATOR_PATH = path.join(__dirname, '.insp-locate.json');
const OPEN_SCRIPT = path.join(__dirname, 'openInCursor.js');

/**
 * Write a locator file, then run openInCursor.js (opens + focuses Cursor).
 * Relative goto (app/foo.tsx:line:col) avoids spaces in "Jelord Sandigas".
 */
function launchEditor(rel, abs, line, column, root) {
  const gotoRel = `${rel}:${line}:${column}`;
  const locator = {
    rel,
    abs,
    line,
    column,
    gotoRel,
    ts: Date.now(),
  };
  fs.writeFileSync(LOCATOR_PATH, `${JSON.stringify(locator, null, 2)}\n`, 'utf8');
  console.log(`[insp] open ${gotoRel}`);

  const child = execFile(process.execPath, [OPEN_SCRIPT], {
    cwd: root,
    windowsHide: true,
    shell: false,
  });

  child.on('error', (err) => {
    console.log(`[insp] opener error: ${err.message}`);
  });
  child.on('exit', (code, signal) => {
    console.log(`[insp] opener exit code=${code} signal=${signal || ''} ${gotoRel}`);
  });
  child.unref();
  return {
    child,
    launch: { mode: 'locator+openInCursor' },
    gotoArg: gotoRel,
  };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function createInspectorMiddleware(projectRoot) {
  const root = path.resolve(projectRoot);

  return function inspectorMiddleware(req, res, next) {
    const parsed = urlParse(req.url || '', true);

    if (
      parsed.pathname === '/__insp/open' ||
      parsed.pathname === '/__insp/source' ||
      parsed.pathname === '/__insp/css-index' ||
      parsed.pathname === '/__insp/locate'
    ) {
      setCors(res);
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
    }

    if (parsed.pathname === '/__insp/locate') {
      const rawFile = parsed.query.file || 'styles/index.css';
      const rel = toProjectRelative(rawFile, root);
      const found = rel ? resolveExistingFile(rel, root) : null;
      if (!found) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'File not found', file: rawFile }));
        return;
      }
      const symbol = parsed.query.symbol ? String(parsed.query.symbol) : '';
      const prop = parsed.query.prop ? String(parsed.query.prop) : '';
      const theme = parsed.query.theme ? String(parsed.query.theme) : 'light';
      const color = parsed.query.color ? String(parsed.query.color) : '';
      const tokenFlag = parsed.query.token != null ? String(parsed.query.token) : '';
      const hit = locateCss(found.abs, symbol, prop, {
        theme,
        token: tokenFlag || undefined,
        color: color || undefined,
      });
      // #region agent log
      fetch('http://127.0.0.1:7721/ingest/7b27707b-f678-425d-8402-d4da67f06182',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d610b9'},body:JSON.stringify({sessionId:'d610b9',hypothesisId:'H2-H4',location:'metroInspectorMiddleware.js:locate',message:'css locate result',data:{symbol,prop,color,token:tokenFlag,theme,line:hit&&hit.line,matched:hit&&hit.matched},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify({
          ok: true,
          file: found.rel,
          line: hit?.line || 1,
          column: hit?.column || 1,
          matched: hit?.matched || null,
          found: Boolean(hit),
        }),
      );
      return;
    }

    if (parsed.pathname === '/__insp/css-index') {
      const rawFile = parsed.query.file || 'styles/index.css';
      const rel = toProjectRelative(rawFile, root);
      const found = rel ? resolveExistingFile(rel, root) : null;
      if (!found) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'File not found', file: rawFile }));
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ file: found.rel, index: buildCssIndex(found.abs) }));
      return;
    }

    if (parsed.pathname === '/__insp/open') {
      const rawFile = parsed.query.file;
      const rel = toProjectRelative(rawFile, root);
      let line = Math.max(1, parseInt(String(parsed.query.line || '1'), 10) || 1);
      let column = Math.max(1, parseInt(String(parsed.query.column || '1'), 10) || 1);
      const symbol = parsed.query.symbol ? String(parsed.query.symbol) : '';
      const prop = parsed.query.prop ? String(parsed.query.prop) : '';
      const theme = parsed.query.theme ? String(parsed.query.theme) : 'light';
      const color = parsed.query.color ? String(parsed.query.color) : '';
      const tokenFlag = parsed.query.token != null ? String(parsed.query.token) : '';
      if (!rel) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid file path', file: rawFile }));
        return;
      }
      const found = resolveExistingFile(rel, root);
      if (!found) {
        console.log(`[insp] open 404 ${rel}`);
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'File not found', file: rel }));
        return;
      }
      let matched = '';
      if (symbol || color) {
        const hit = locateCss(found.abs, symbol, prop, {
          theme,
          token: tokenFlag || undefined,
          color: color || undefined,
        });
        if (hit) {
          line = hit.line;
          column = hit.column || 1;
          matched = hit.matched || symbol;
        }
      }
      console.log(
        `[insp] /__insp/open file=${found.rel} :${line}:${column}` +
          (symbol ? ` symbol=${symbol}` : '') +
          (prop ? ` prop=${prop}` : '') +
          (matched ? ` matched=${matched}` : ''),
      );
      try {
        const { launch, gotoArg } = launchEditor(
          found.rel,
          found.abs,
          line,
          column,
          root,
        );
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            ok: true,
            editor: launch.mode,
            file: found.rel,
            abs: found.abs,
            gotoArg,
            line,
            column,
            symbol: symbol || undefined,
            prop: prop || undefined,
            theme,
            matched: matched || undefined,
          }),
        );
      } catch (err) {
        console.log(`[insp] open 500 ${err?.message || err}`);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: String(err?.message || err) }));
      }
      return;
    }

    if (parsed.pathname !== '/__insp/source') {
      return next();
    }

    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    const file = toProjectRelative(parsed.query.file, root);
    const line = Math.max(1, parseInt(String(parsed.query.line || '1'), 10) || 1);

    if (!file) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid file path' }));
      return;
    }

    const found = resolveExistingFile(file, root);
    if (!found) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    try {
      const content = fs.readFileSync(found.abs, 'utf8');
      const lines = content.split(/\r?\n/);
      const start = Math.max(1, line - CONTEXT_LINES);
      const end = Math.min(lines.length, line + CONTEXT_LINES);
      const snippet = [];
      for (let i = start; i <= end; i += 1) {
        snippet.push({ line: i, text: lines[i - 1] ?? '' });
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(
        JSON.stringify({
          file: found.rel,
          line,
          start,
          end,
          snippet,
        }),
      );
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: String(err?.message || err) }));
    }
  };
}

/**
 * Wrap existing enhanceMiddleware so we only add the inspector route in development.
 */
function withInspectorMiddleware(projectRoot, existingEnhance) {
  // Always attach on the Metro dev server. Do not gate on NODE_ENV — a leftover
  // NODE_ENV=production from export/scripts would silently disable /__insp/open
  // and Expo would return an HTML 500 instead of opening Cursor.
  const inspector = createInspectorMiddleware(projectRoot);

  return function enhanceMiddleware(middleware, metroServer) {
    const base =
      typeof existingEnhance === 'function'
        ? existingEnhance(middleware, metroServer)
        : middleware;
    return function chained(req, res, next) {
      return inspector(req, res, () => base(req, res, next));
    };
  };
}

module.exports = {
  createInspectorMiddleware,
  withInspectorMiddleware,
  toProjectRelative,
};
