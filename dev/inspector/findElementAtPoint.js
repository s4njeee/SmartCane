/**
 * Resolve the tapped element hierarchy using RN's inspector API, with a fiber fallback.
 */

function tryRequireInspector() {
  try {
    // RN 0.86 path (Libraries/Inspector was removed)
    // eslint-disable-next-line global-require
    const mod = require('react-native/src/private/devsupport/devmenu/elementinspector/getInspectorDataForViewAtPoint');
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

function parseMeta(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function looksLikeInspSrc(value) {
  return typeof value === 'string' && /:\d+:\d+$/.test(value);
}

function readInspFromProps(props) {
  if (!props || typeof props !== 'object') return null;
  const src = props.__inspSrc;
  if (!looksLikeInspSrc(src)) return null;
  return {
    src,
    meta: parseMeta(props.__inspMeta),
    props,
  };
}

function fiberDisplayName(fiber) {
  if (!fiber) return 'Unknown';
  const type = fiber.type || fiber.elementType;
  if (!type) return fiber.tag === 5 ? 'Host' : 'Anonymous';
  if (typeof type === 'string') return type;
  return type.displayName || type.name || 'Anonymous';
}

function walkFibersForInsp(startFiber, maxDepth = 48) {
  const breadcrumbs = [];
  let nearest = null;
  let fiber = startFiber;
  let depth = 0;

  while (fiber && depth < maxDepth) {
    const insp = readInspFromProps(fiber.memoizedProps);
    const name = fiberDisplayName(fiber);
    if (insp) {
      const crumb = {
        name: insp.meta?.component || name,
        src: insp.src,
        props: insp.props,
        meta: insp.meta,
        fiber,
      };
      breadcrumbs.push(crumb);
      if (!nearest) nearest = crumb;
    }
    fiber = fiber.return;
    depth += 1;
  }

  return { nearest, breadcrumbs: breadcrumbs.slice(0, 8) };
}

function walkDescendantsForInsp(startFiber, maxNodes = 56) {
  const found = [];
  if (!startFiber) return found;
  const stack = [];
  let child = startFiber.child;
  while (child) {
    stack.push(child);
    child = child.sibling;
  }
  let n = 0;
  while (stack.length && n < maxNodes) {
    const fiber = stack.pop();
    n += 1;
    if (!fiber) continue;
    const insp = readInspFromProps(fiber.memoizedProps);
    const name = fiberDisplayName(fiber);
    if (insp) {
      found.push({
        name: insp.meta?.component || name,
        hostName: name,
        src: insp.src,
        props: insp.props,
        meta: insp.meta,
      });
    }
    let next = fiber.child;
    while (next) {
      stack.push(next);
      next = next.sibling;
    }
  }
  return found;
}

function collectRelatedNodes(startFiber, breadcrumbs = []) {
  const bySrc = new Map();
  const add = (node) => {
    if (!node?.src) return;
    const key = `${node.src}|${node.name || ''}`;
    if (!bySrc.has(key)) bySrc.set(key, node);
  };
  for (const crumb of breadcrumbs) add(crumb);
  for (const node of walkDescendantsForInsp(startFiber)) add(node);
  return Array.from(bySrc.values()).slice(0, 24);
}

function withRelated(result, startFiber) {
  if (!result) return result;
  const related = collectRelatedNodes(startFiber, result.breadcrumbs || []);
  return { ...result, related };
}

function measureFrame(_node, fallbackFrame) {
  return new Promise((resolve) => {
    if (fallbackFrame && typeof fallbackFrame.width === 'number') {
      resolve({
        x: fallbackFrame.left ?? fallbackFrame.x ?? 0,
        y: fallbackFrame.top ?? fallbackFrame.y ?? 0,
        width: fallbackFrame.width ?? 0,
        height: fallbackFrame.height ?? 0,
      });
      return;
    }
    resolve({ x: 0, y: 0, width: 0, height: 0 });
  });
}

function getFiberFromDom(node) {
  if (!node) return null;
  const keys = Object.keys(node);
  for (const key of keys) {
    if (key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')) {
      return node[key];
    }
  }
  return null;
}

export function frameFromDom(node) {
  try {
    const rect = node?.getBoundingClientRect?.();
    if (!rect) return { x: 0, y: 0, width: 0, height: 0 };
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  } catch {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
}

/** Web: hide inspector chrome, then elementFromPoint + React fiber walk. */
function findFromDom(x, y) {
  if (typeof document === 'undefined' || typeof x !== 'number' || typeof y !== 'number') {
    return null;
  }
  const hidden = [];
  let el = document.elementFromPoint(x, y);
  let hops = 0;
  while (el && hops < 12) {
    const chrome = el.closest
      ? el.closest('[data-insp-chrome], #insp-chrome, #insp-chrome-overlay')
      : null;
    if (chrome && chrome.style) {
      hidden.push([chrome, chrome.style.pointerEvents]);
      chrome.style.pointerEvents = 'none';
      el = document.elementFromPoint(x, y);
      hops += 1;
      continue;
    }
    break;
  }
  for (const [node, prev] of hidden) {
    node.style.pointerEvents = prev || '';
  }

  let node = el;
  while (node && node !== document.documentElement) {
    const fiber = getFiberFromDom(node);
    if (fiber) {
      const walked = walkFibersForInsp(fiber);
      if (walked.nearest) {
        return withRelated(
          {
            name: walked.nearest.name,
            src: walked.nearest.src,
            props: walked.nearest.props || {},
            meta: walked.nearest.meta,
            breadcrumbs: walked.breadcrumbs,
            frame: frameFromDom(node),
            pointerY: y,
            domNode: node,
            raw: { from: 'dom' },
          },
          fiber,
        );
      }
    }
    node = node.parentElement;
  }

  if (el) {
    const fiber = getFiberFromDom(el);
    return {
      name: fiberDisplayName(fiber) || el.tagName || 'Element',
      src: readInspFromProps(fiber?.memoizedProps)?.src || null,
      props: fiber?.memoizedProps || {},
      meta: parseMeta(fiber?.memoizedProps?.__inspMeta),
      breadcrumbs: [],
      frame: frameFromDom(el),
      pointerY: y,
      domNode: el,
      raw: { from: 'dom-host' },
    };
  }
  return null;
}

function getInspectorFn() {
  return tryRequireInspector();
}

function getFindNodeHandle() {
  try {
    const RN = require('react-native');
    return RN.findNodeHandle;
  } catch {
    return null;
  }
}

function propsFromHierarchyItem(item) {
  try {
    if (typeof item?.getInspectorData !== 'function') return {};
    const findNodeHandle = getFindNodeHandle();
    const data = item.getInspectorData(findNodeHandle);
    return data?.props || {};
  } catch {
    return {};
  }
}

/**
 * @param {object} options
 * @param {number} options.x
 * @param {number} options.y
 * @param {import('react').RefObject} [options.rootRef]
 * @returns {Promise<object|null>}
 */
function measureRootOffset(node) {
  return new Promise((resolve) => {
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve({ x: 0, y: 0 });
      return;
    }
    try {
      node.measureInWindow((vx, vy) => resolve({ x: vx || 0, y: vy || 0 }));
    } catch {
      resolve({ x: 0, y: 0 });
    }
  });
}

export async function findElementAtPoint({ x, y, rootRef } = {}) {
  const fromDom = findFromDom(x, y);
  if (fromDom) return fromDom;

  const inspectedView = rootRef?.current ?? null;
  const offset = await measureRootOffset(inspectedView);
  const localX = x - offset.x;
  const localY = y - offset.y;

  const getInspectorDataForViewAtPoint = getInspectorFn();
  let viewData = null;

  if (typeof getInspectorDataForViewAtPoint === 'function' && inspectedView) {
    viewData = await new Promise((resolve) => {
      let settled = false;
      const finish = (data) => {
        if (settled) return true;
        settled = true;
        resolve(data || null);
        return true;
      };

      try {
        getInspectorDataForViewAtPoint(inspectedView, localX, localY, (data) =>
          finish(data),
        );
        setTimeout(() => finish(null), 800);
      } catch {
        finish(null);
      }
    });
  }

  if (!viewData) {
    try {
      const RN = require('react-native');
      const tag = RN.findNodeHandle?.(inspectedView);
      if (tag && RN.UIManager?.findSubviewIn) {
        viewData = await new Promise((resolve) => {
          try {
            RN.UIManager.findSubviewIn(tag, [localX, localY], (nativeTag, left, top, width, height) => {
              resolve({
                hierarchy: [],
                props: {},
                frame: { left, top, width, height },
                closestPublicInstance: nativeTag,
              });
            });
            setTimeout(() => resolve(null), 800);
          } catch {
            resolve(null);
          }
        });
      }
    } catch {
      // no native fallback
    }
  }

  // Fiber-first when closestInstance is available — __inspSrc lives on memoizedProps.
  const startFiber =
    viewData?.closestInstance ||
    viewData?.closestPublicInstance?._internalFiberInstanceHandleDEV ||
    null;

  if (startFiber) {
    const walked = walkFibersForInsp(startFiber);
    const frame = await measureFrame(
      viewData?.closestPublicInstance,
      viewData?.frame,
    );
    if (walked.nearest) {
      return withRelated(
        {
          name: walked.nearest.name,
          src: walked.nearest.src,
          props: walked.nearest.props || {},
          meta: walked.nearest.meta,
          breadcrumbs: walked.breadcrumbs,
          frame,
          pointerY: viewData?.pointerY ?? y,
          raw: viewData,
        },
        startFiber,
      );
    }
    return withRelated(
      {
        name: fiberDisplayName(startFiber),
        src: null,
        props: startFiber.memoizedProps || {},
        meta: null,
        breadcrumbs: walked.breadcrumbs,
        frame,
        pointerY: viewData?.pointerY ?? y,
        raw: viewData,
      },
      startFiber,
    );
  }

  if (viewData?.hierarchy?.length) {
    const hierarchy = viewData.hierarchy;
    const selectedIndex =
      typeof viewData.selectedIndex === 'number'
        ? viewData.selectedIndex
        : hierarchy.length - 1;

    const crumbs = [];
    let nearest = null;

    for (let i = hierarchy.length - 1; i >= 0 && crumbs.length < 8; i -= 1) {
      const item = hierarchy[i];
      const props = propsFromHierarchyItem(item);
      const insp = readInspFromProps(props);
      const name = item.name || insp?.meta?.component || 'Anonymous';
      if (insp) {
        const crumb = {
          name: insp.meta?.component || name,
          src: insp.src,
          props: insp.props || props,
          meta: insp.meta,
        };
        crumbs.push(crumb);
        if (!nearest) nearest = crumb;
      }
    }

    if (!nearest) {
      const insp = readInspFromProps(viewData.props);
      if (insp) {
        nearest = {
          name: insp.meta?.component || hierarchy[selectedIndex]?.name || 'Element',
          src: insp.src,
          props: insp.props,
          meta: insp.meta,
        };
        crumbs.unshift(nearest);
      }
    }

    if (!nearest && crumbs.length) nearest = crumbs[0];

    if (!nearest) {
      const item = hierarchy[selectedIndex] || hierarchy[hierarchy.length - 1];
      nearest = {
        name: item?.name || 'Element',
        src: null,
        props: viewData.props || {},
        meta: null,
      };
    }

    const frame = await measureFrame(null, viewData.frame);
    const breadcrumbs = (crumbs.length ? crumbs : [nearest]).slice(0, 8);
    return {
      name: nearest.name,
      src: nearest.src,
      props: nearest.props || {},
      meta: nearest.meta,
      breadcrumbs,
      related: breadcrumbs,
      frame,
      pointerY: viewData.pointerY ?? y,
      raw: viewData,
    };
  }

  if (viewData?.frame) {
    return {
      name: 'View',
      src: null,
      props: viewData.props || {},
      meta: null,
      breadcrumbs: [],
      frame: await measureFrame(null, viewData.frame),
      pointerY: y,
      raw: viewData,
    };
  }

  return null;
}

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

export function parseSourceLocation(src) {
  if (!src || typeof src !== 'string') return null;
  let symbol = null;
  let prop = null;
  let theme = null;
  let color = null;
  let token = null;
  const qIdx = src.indexOf('?');
  let core = src;
  if (qIdx >= 0) {
    try {
      const params = new URLSearchParams(src.slice(qIdx + 1));
      symbol = params.get('symbol');
      prop = params.get('prop');
      theme = params.get('theme');
      color = params.get('color');
      token = params.get('token');
    } catch {
      symbol = null;
      prop = null;
      theme = null;
      color = null;
      token = null;
    }
    core = src.slice(0, qIdx);
  }
  const match = core.match(/^(.*):(\d+):(\d+)$/) || core.match(/^(.*):(\d+)$/);
  if (!match) return null;
  let file = match[1]
    .replace(/\\/g, '/')
    .replace(/^file:\/\//i, '')
    .split('?')[0]
    .replace(/\/{2,}/g, '/');
  try {
    file = decodeURIComponent(file);
  } catch {
    // keep raw
  }
  if (/^\/[A-Za-z]:\//.test(file)) file = file.slice(1);

  const marker = '/smartcane/';
  const marked = file.toLowerCase().lastIndexOf(marker);
  if (marked >= 0) {
    file = file.slice(marked + marker.length);
  } else if (/^[A-Za-z]:\//.test(file) || file.startsWith('/')) {
    const lower = file.toLowerCase();
    let cut = -1;
    for (const folder of PROJECT_FOLDERS) {
      const idx = lower.lastIndexOf(`/${folder}`);
      if (idx >= 0 && (cut < 0 || idx < cut)) cut = idx + 1;
    }
    if (cut >= 0) file = file.slice(cut);
  }

  return {
    file,
    line: parseInt(match[2], 10),
    column: match[3] ? parseInt(match[3], 10) : 1,
    symbol: symbol || null,
    prop: prop || null,
    theme: theme || null,
    color: color || null,
    token: token || null,
  };
}
