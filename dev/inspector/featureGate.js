/**
 * Inspector overrides for the live page.
 * Disable blocks the action (click / Enter / Space) and leaves pointer
 * presses and CSS animations alone. Remove hides a node until Restore all.
 */

const DISABLED = 'data-insp-disabled';
const REMOVED = 'data-insp-removed';
const CHROME = '[data-insp-chrome], #insp-chrome, #insp-chrome-overlay';

const removed = new Set();

function logGate(message, data) {
  // #region agent log
  fetch('http://127.0.0.1:7721/ingest/7b27707b-f678-425d-8402-d4da67f06182', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'd610b9' },
    body: JSON.stringify({
      sessionId: 'd610b9',
      hypothesisId: 'H8',
      location: 'featureGate.js',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function elementFrom(node) {
  if (!node) return null;
  if (node.nodeType === 1) return node;
  return node.parentElement || null;
}

function isChrome(node) {
  return !!(node && node.closest && node.closest(CHROME));
}

function disableFeature(node) {
  const el = elementFrom(node);
  if (!el || isChrome(el)) return false;
  el.setAttribute(DISABLED, '1');
  logGate('feature disabled', { id: el.id || '', className: el.className || '' });
  return true;
}

function enableFeature(node) {
  const el = elementFrom(node);
  if (!el) return false;
  el.removeAttribute(DISABLED);
  logGate('feature enabled', { id: el.id || '' });
  return true;
}

function isFeatureDisabled(node) {
  const el = elementFrom(node);
  return !!(el && el.getAttribute && el.getAttribute(DISABLED) === '1');
}

function removeFeature(node) {
  const el = elementFrom(node);
  if (!el || isChrome(el)) return false;
  el.setAttribute(REMOVED, '1');
  removed.add(el);
  logGate('feature removed', { count: removed.size, id: el.id || '' });
  return true;
}

function restoreAllFeatures() {
  let count = 0;
  removed.forEach((el) => {
    if (el && el.removeAttribute) {
      el.removeAttribute(REMOVED);
      count += 1;
    }
  });
  removed.clear();
  if (typeof document !== 'undefined' && document.querySelectorAll) {
    document.querySelectorAll(`[${REMOVED}]`).forEach((el) => {
      el.removeAttribute(REMOVED);
      count += 1;
    });
  }
  logGate('features restored', { count });
  return count;
}

function getRemovedCount() {
  return removed.size;
}

function shouldBlockActivation(event) {
  const el = elementFrom(event && event.target);
  if (!el || !el.closest) return false;
  if (isChrome(el)) return false;
  return !!el.closest(`[${DISABLED}="1"]`);
}

function onClickCapture(event) {
  if (!shouldBlockActivation(event)) return;
  event.preventDefault();
  event.stopPropagation();
  logGate('action click blocked', { type: event.type || 'click' });
}

function onKeyDownCapture(event) {
  const key = event && event.key;
  if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;
  if (!shouldBlockActivation(event)) return;
  event.preventDefault();
  event.stopPropagation();
  logGate('action key blocked', { key });
}

const GATE_CSS = [
  '[data-insp-disabled="1"] {',
  '  outline: 1px dashed rgba(255, 196, 0, 0.95);',
  '  outline-offset: 2px;',
  '}',
  '[data-insp-removed="1"] {',
  '  display: none !important;',
  '}',
].join('\n');

function installFeatureGate(doc) {
  const documentRef = doc || (typeof document !== 'undefined' ? document : null);
  if (!documentRef || documentRef.__inspFeatureGate) return false;
  documentRef.__inspFeatureGate = true;
  const root = documentRef.defaultView || (typeof window !== 'undefined' ? window : documentRef);
  root.addEventListener('click', onClickCapture, true);
  root.addEventListener('keydown', onKeyDownCapture, true);
  if (!documentRef.getElementById('insp-feature-gate-style')) {
    const style = documentRef.createElement('style');
    style.id = 'insp-feature-gate-style';
    style.textContent = GATE_CSS;
    (documentRef.head || documentRef.documentElement).appendChild(style);
  }
  return true;
}

module.exports = {
  GATE_CSS,
  disableFeature,
  enableFeature,
  isFeatureDisabled,
  removeFeature,
  restoreAllFeatures,
  getRemovedCount,
  shouldBlockActivation,
  onClickCapture,
  onKeyDownCapture,
  installFeatureGate,
};
