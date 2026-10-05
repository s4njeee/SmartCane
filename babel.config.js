module.exports = function (api) {
  // Do not mix api.cache(true) with api.env() — Babel throws
  // "Caching has already been configured with .never or .forever()".
  api.cache.using(
    () => `${process.env.NODE_ENV || ''}|${process.env.BABEL_ENV || ''}`,
  );

  const isDev =
    process.env.NODE_ENV !== 'production' &&
    process.env.BABEL_ENV !== 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: isDev ? ['./dev/inspector/babelPluginInspectorSource'] : [],
  };
};
