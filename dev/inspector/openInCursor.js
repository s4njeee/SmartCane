/**
 * Opens a project file in Cursor at line:column, reuses the window, and
 * brings Cursor to the foreground so the tab is visible.
 *
 * Reads dev/inspector/.insp-locate.json (written by Metro /__insp/open).
 * Uses a project-relative goto (e.g. styles/index.css:1056:3) to avoid spaces
 * in Windows absolute paths breaking :line:column parsing.
 */

const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOCATOR = path.join(__dirname, '.insp-locate.json');
const FOCUS_PS1 = path.join(__dirname, 'focusCursor.ps1');

function resolveCursor() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const cursorExe = path.join(localAppData, 'Programs', 'cursor', 'Cursor.exe');
  const cliJs = path.join(
    localAppData,
    'Programs',
    'cursor',
    'resources',
    'app',
    'out',
    'cli.js',
  );
  if (fs.existsSync(cursorExe) && fs.existsSync(cliJs)) {
    return { cursorExe, cliJs };
  }
  return null;
}

function run(file, args, opts = {}) {
  return new Promise((resolve) => {
    const child = execFile(file, args, {
      windowsHide: true,
      shell: false,
      ...opts,
    });
    child.on('error', () => resolve({ code: 1 }));
    child.on('exit', (code) => resolve({ code: code ?? 0 }));
  });
}

async function focusCursor() {
  if (process.platform !== 'win32') return;
  if (!fs.existsSync(FOCUS_PS1)) return;
  await new Promise((r) => setTimeout(r, 180));
  await run(
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', FOCUS_PS1],
  );
  // Second nudge — first focus can lose to the browser click.
  await new Promise((r) => setTimeout(r, 220));
  await run(
    path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', FOCUS_PS1],
  );
}

async function main() {
  if (!fs.existsSync(LOCATOR)) {
    console.log('[insp-open] missing locator', LOCATOR);
    process.exit(2);
  }
  const loc = JSON.parse(fs.readFileSync(LOCATOR, 'utf8'));
  const rel = String(loc.rel || '').replace(/\\/g, '/');
  const line = Math.max(1, parseInt(String(loc.line || '1'), 10) || 1);
  const column = Math.max(1, parseInt(String(loc.column || '1'), 10) || 1);
  const gotoRel = `${rel}:${line}:${column}`;

  const cursor = resolveCursor();
  if (!cursor) {
    console.log('[insp-open] Cursor.exe / cli.js not found');
    process.exit(3);
  }

  // -r reuses the existing window; -g jumps to file:line:column (reveals that tab).
  const args = [cursor.cliJs, '-r', '-g', gotoRel];
  console.log(`[insp-open] ${gotoRel}`);

  const result = await run(cursor.cursorExe, args, {
    cwd: ROOT,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', VSCODE_DEV: '' },
  });

  // Fallback: absolute path goto if relative failed (some Cursor builds).
  if (result.code !== 0 && loc.abs) {
    const absGoto = `${String(loc.abs)}:${line}:${column}`;
    console.log(`[insp-open] retry abs ${absGoto}`);
    await run(cursor.cursorExe, [cursor.cliJs, '-r', '-g', absGoto], {
      cwd: ROOT,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', VSCODE_DEV: '' },
    });
  }

  await focusCursor();

  process.exit(result.code === 0 ? 0 : result.code);
}

main().catch((err) => {
  console.log('[insp-open] fatal', err?.message || err);
  process.exit(1);
});
