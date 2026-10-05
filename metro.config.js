const { getDefaultConfig } = require('expo/metro-config');
const { withInspectorMiddleware } = require('./dev/inspector/metroInspectorMiddleware');

const config = getDefaultConfig(__dirname);

// OneDrive cloud placeholders make Metro TreeFS crash on file-map health checks.
config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: false,
  },
};

config.resolver = {
  ...config.resolver,
  unstable_enableSymlinks: false,
};

const existingEnhance = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: withInspectorMiddleware(__dirname, existingEnhance),
};

module.exports = config;
