/**
 * Dev-only Babel plugin: tags JSX with __inspSrc / __inspMeta for the UI Inspector.
 * No-op outside development. Skips navigation/layout hosts that break when given unknown props.
 */

const DEFAULT_EXCLUDE = new Set([
  // React Navigation / Expo Router — unknown props rearrange screens
  'Stack',
  'Stack.Screen',
  'Stack.Group',
  'Tabs',
  'Tabs.Screen',
  'Tabs.Group',
  'Tab',
  'Tab.Screen',
  'Drawer',
  'Drawer.Screen',
  'Slot',
  'Link',
  'Redirect',
  'Screen',
  'Group',
  'Navigator',
  'NavigationContainer',
  // Layout / system hosts
  'GestureHandlerRootView',
  'SafeAreaView',
  'SafeAreaProvider',
  'SafeAreaInsetsContext',
  'StatusBar',
  'Fragment',
  'React.Fragment',
  // Sheets / portals / providers (name ends with Provider also skipped)
  'BottomSheetModalProvider',
  'BottomSheetModal',
  'BottomSheet',
  'BottomSheetView',
  'BottomSheetScrollView',
  'Portal',
  'PortalProvider',
  'KeyboardAvoidingView',
  'KeyboardProvider',
]);

function getJsxName(node, t) {
  if (!node) return null;
  if (t.isJSXIdentifier(node)) return node.name;
  if (t.isJSXMemberExpression(node)) {
    const object = getJsxName(node.object, t);
    const property = node.property?.name;
    if (object && property) return `${object}.${property}`;
  }
  return null;
}

function shouldSkipName(name) {
  if (!name || isFragmentName(name)) return true;
  if (DEFAULT_EXCLUDE.has(name)) return true;
  if (name.endsWith('Provider')) return true;
  if (name.endsWith('.Screen') || name.endsWith('.Group')) return true;
  return false;
}

function isFragmentName(name) {
  return name === 'Fragment' || name === 'React.Fragment';
}

function findEnclosingComponent(path, t) {
  let current = path.parentPath;
  while (current) {
    if (current.isFunctionDeclaration() && current.node.id?.name) {
      return { name: current.node.id.name, path: current };
    }
    if (
      (current.isFunctionExpression() || current.isArrowFunctionExpression()) &&
      current.parentPath?.isVariableDeclarator() &&
      t.isIdentifier(current.parentPath.node.id)
    ) {
      return { name: current.parentPath.node.id.name, path: current };
    }
    if (
      current.isClassMethod() &&
      current.node.key?.name === 'render' &&
      current.parentPath?.parentPath?.isClassDeclaration() &&
      current.parentPath.parentPath.node.id?.name
    ) {
      return {
        name: current.parentPath.parentPath.node.id.name,
        path: current.parentPath.parentPath,
      };
    }
    current = current.parentPath;
  }
  return { name: 'Anonymous', path: null };
}

function collectHooks(componentPath, t) {
  if (!componentPath) return [];
  const hooks = new Set();
  componentPath.traverse({
    CallExpression(callPath) {
      const callee = callPath.node.callee;
      if (t.isIdentifier(callee) && /^use[A-Z]/.test(callee.name)) {
        hooks.add(callee.name);
      } else if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.property) &&
        /^use[A-Z]/.test(callee.property.name)
      ) {
        hooks.add(callee.property.name);
      }
    },
  });
  return Array.from(hooks);
}

module.exports = function babelPluginInspectorSource(api) {
  const t = api.types;
  const isDev =
    process.env.BABEL_ENV !== 'production' &&
    process.env.NODE_ENV !== 'production';

  if (!isDev) {
    return { name: 'babel-plugin-inspector-source', visitor: {} };
  }

  const projectRoot = (process.env.EXPO_PROJECT_ROOT || process.cwd()).replace(
    /\\/g,
    '/',
  );

  function toRelSource(filename) {
    let next = String(filename || '').replace(/\\/g, '/').split('?')[0];
    if (/^\/[A-Za-z]:\//.test(next)) next = next.slice(1);
    const roots = [projectRoot, process.cwd().replace(/\\/g, '/')];
    for (const root of roots) {
      if (next.toLowerCase().startsWith(root.toLowerCase())) {
        return next.slice(root.length).replace(/^\//, '');
      }
    }
    const marker = '/smartcane/';
    const idx = next.toLowerCase().lastIndexOf(marker);
    if (idx >= 0) return next.slice(idx + marker.length);
    return next.replace(/^\//, '');
  }

  return {
    name: 'babel-plugin-inspector-source',
    visitor: {
      Program(programPath, state) {
        const filename = state.filename || state.file?.opts?.filename || '';
        const norm = filename.replace(/\\/g, '/');
        if (
          !filename ||
          norm.includes('/node_modules/') ||
          norm.includes('/dev/inspector/')
        ) {
          state.file.set('__inspSkip', true);
          return;
        }
        state.file.set('__inspSkip', false);
        state.file.set('__inspComponentMeta', new Map());
      },
      JSXOpeningElement(jsxPath, state) {
        if (state.file.get('__inspSkip')) return;

        const opening = jsxPath.node;
        if (!opening.name) return;

        const name = getJsxName(opening.name, t);
        if (shouldSkipName(name)) return;

        const alreadyHasSrc = opening.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === '__inspSrc',
        );
        if (alreadyHasSrc) return;

        const rel = toRelSource(state.filename || state.file?.opts?.filename || '');

        const loc = opening.loc?.start || { line: 0, column: 0 };
        const src = `${rel}:${loc.line}:${(loc.column || 0) + 1}`;

        const metaCache = state.file.get('__inspComponentMeta');
        const enclosing = findEnclosingComponent(jsxPath, t);
        const cacheKey = enclosing.path || enclosing.name;
        let meta = metaCache.get(cacheKey);
        if (!meta) {
          meta = {
            component: enclosing.name,
            hooks: collectHooks(enclosing.path, t),
          };
          metaCache.set(cacheKey, meta);
        }

        opening.attributes.push(
          t.jsxAttribute(t.jsxIdentifier('__inspSrc'), t.stringLiteral(src)),
          t.jsxAttribute(
            t.jsxIdentifier('__inspMeta'),
            t.stringLiteral(JSON.stringify(meta)),
          ),
        );
      },
    },
  };
};
