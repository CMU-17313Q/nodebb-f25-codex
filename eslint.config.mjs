'use strict';

import serverConfig from 'eslint-config-nodebb';
import publicConfig from 'eslint-config-nodebb/public';
import commonRules from 'eslint-config-nodebb/common';

import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import stylisticJs from '@stylistic/eslint-plugin-js';

export default defineConfig([
  // global ignores
  {
    ignores: [
      'node_modules/',
      '.project',
      '.vagrant',
      '.DS_Store',
      '.tx',
      'logs/',
      'public/uploads/',
      'public/vendor/',
      '.idea/',
      '.vscode/',
      '*.ipr',
      '*.iws',
      'coverage/',
      'build/',
      'test/files/',
      '*.min.js',
      'install/docker/',
    ],
  },
  // tests
{
  files: ['test/**/*.js'],
  plugins: {
    '@stylistic/js': (await import('@stylistic/eslint-plugin')).default,
  },
  extends: [
    'js/recommended',
    'plugin:@stylistic/js' // now works because the main plugin is installed
  ],
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'commonjs',
    globals: {
      ...globals.node,
      ...globals.browser,
      it: 'readonly',
      describe: 'readonly',
      before: 'readonly',
      beforeEach: 'readonly',
      after: 'readonly',
      afterEach: 'readonly',
    },
  },
  rules: {
    ...commonRules,
    'no-unused-vars': 'off',
    'no-prototype-builtins': 'off',
    // if you still see spacing nags in tests, you can disable this:
    // '@stylistic/js/no-multi-spaces': 'off',
  },
},
  ...publicConfig,
  ...serverConfig,
]);
