// Adjusts React4XP's Rspack config. Template: node_modules/@enonic/react4xp/examples/webpack.config.react4xp.js
module.exports = function (env, config) {
  config.resolve.symlinks = true; // pnpm's node_modules are symlinks
  config.experiments = { ...config.experiments, css: true };
  config.module.rules = [
    ...(config.module.rules || []),
    { test: /\.css$/i, type: 'css/auto' },
  ];
  return config;
};
