'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { plugins } = require('./.babelrc.json');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    'ember-cli-babel': {
      extensions: ['js', 'jsx'], // support jsx extensions
    },
    // config for embedding react
    babel: {
      plugins: plugins,
    },
  });

  return app.toTree();
};
