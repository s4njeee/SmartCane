const { getDefaultConfig } = require('expo/metro-config');

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

module.exports = config;
