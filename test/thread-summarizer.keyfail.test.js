/* eslint-env mocha */
const assert = require('assert');
const Module = require('module');
const path = require('path');
const express = require('express');

function freshRequire(absPath) {
  delete require.cache[require.resolve(absPath)];
  // eslint-disable-next-line global-require
  return require(absPath);
}

describe('thread-summarizer – missing OPENAI_API_KEY error branch', () => {
  let restoreMainRequire;
  let restoreLoad;

  beforeEach(() => {
    process.env.TS_STUB = '0';
    delete process.env.OPENAI_API_KEY; // force real mode without key
    process.env.OPENAI_MODEL = 'gpt-4o-mini';

    const realMainRequire = require.main.require;
    restoreMainRequire = () => { require.main.require = realMainRequire; };
    require.main.require = (id) => {
      if (id.endsWith('/src/privileges') || id === './src/privileges') {
        return { topics: { can: async () => true } };
      }
      if (id.endsWith('/src/topics') || id === './src/topics') {
        return { getPids: async () => [1] };
      }
      if (id.endsWith('/src/posts') || id === './src/posts') {
        return { getPostsByPids: async () => ([{ uid: 1, username: 'a', content: 'x' }]) };
      }
      return realMainRequire(id);
    };

    const realLoad = Module._load;
    restoreLoad = () => { Module._load = realLoad; };
    Module._load = function (request, parent, isMain) {
      if (request === 'openai') {
        // if called, it will throw before reaching here because key is missing
        return class OpenAI {
          constructor() { this.chat = { completions: { create: async () => ({ choices: [] }) } }; }
        };
      }
      return realLoad.apply(this, arguments);
    };
  });

  afterEach(() => {
    restoreMainRequire?.();
    restoreLoad?.();
    const pluginPath = path.resolve(__dirname, '../nodebb-plugin-thread-summarizer/library.js');
    delete require.cache[require.resolve(pluginPath)];
  });

  it('returns 500 with detail when key is missing', async () => {
    const pluginPath = path.resolve(__dirname, '../nodebb-plugin-thread-summarizer/library.js');
    const plugin = freshRequire(pluginPath);

    const app = express();
    const router = express.Router();
    await plugin.init({ router });
    app.use(router);

    const res = await fetch('http://localhost', {
      // Use an in-memory server via undici’s fetch in Node 20+:
      // We’ll construct a Request to the router handler directly.
      // However, for simplicity in this test we call the handler function itself:
    });

    // Simpler: call the route handler directly without HTTP
    const req = { params: { tid: '1' }, user: { uid: 1 } };
    const out = { code: 200, body: null, status(c) { this.code = c; return this; }, json(o) { this.body = o; return this; } };

    const route = router.stack.find(s => s.route?.path === '/api/thread-summarizer/v2/:tid')?.route?.stack?.[0]?.handle;
    await route(req, out);

    assert.strictEqual(out.code, 500);
    assert.ok(/Missing OPENAI_API_KEY/i.test(out.body?.detail || ''), 'should mention missing key');
  });
});
