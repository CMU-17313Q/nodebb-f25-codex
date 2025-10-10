/* eslint-disable @stylistic/js/indent */
/* eslint-env mocha */
const assert = require('assert');
const Module = require('module');
const path = require('path');
const express = require('express');

function freshRequire(absPath) {
	delete require.cache[require.resolve(absPath)];
	return require(absPath);
}

describe('thread-summarizer – non-stub OpenAI + cache (native fetch)', function () {
	let restoreMainRequire;
	let restoreLoad;

	beforeEach(function () {
	  // Force non-stub BEFORE require
	  process.env.TS_STUB = '0';
	  process.env.OPENAI_API_KEY = 'test-key';
	  process.env.OPENAI_MODEL = 'gpt-4o-mini';

	  // Mock NodeBB internals
	  const realMainRequire = require.main.require;
	  restoreMainRequire = function () { require.main.require = realMainRequire; };
	  require.main.require = function (id) {
	    if (id.endsWith('/src/privileges') || id === './src/privileges') {
	      return { topics: { can: async () => true } };
	    }
	    if (id.endsWith('/src/topics') || id === './src/topics') {
	      // any number of posts is fine; we just need non-zero
	      return { getPids: async () => [101, 102, 103] };
	    }
	    if (id.endsWith('/src/posts') || id === './src/posts') {
	      return {
	        getPostsByPids: async () => ([
	          { uid: 1, username: 'alice', content: 'hello world' },
	          { uid: 2, username: 'bob', content: 'second post' },
	          { uid: 3, username: 'carol', content: 'third post' },
	        ]),
	      };
	    }
	    return realMainRequire(id);
	  };

	  // Mock 'openai' package (constructor assigns fields; no class properties)
	  const realLoad = Module._load;
	  restoreLoad = () => { Module._load = realLoad; };
	  Module._load = function (request, parent, isMain) {
	    if (request === 'openai') {
	      function OpenAI() {
	        this.chat = {
	          completions: {
	            create: async () => ({
	              choices: [{ message: { content: '• a\n• b\n• c\nTL;DR: ok' } }],
	            }),
	          },
	        };
	      }
	      return OpenAI;
	    }
	    return realLoad.apply(this, arguments);
	  };
	}); // <-- close beforeEach

	afterEach(function () {
	  if (restoreMainRequire) restoreMainRequire();
	  if (restoreLoad) restoreLoad();
	  const pluginPath = path.resolve(__dirname, '../nodebb-plugin-thread-summarizer/library.js');
	  delete require.cache[require.resolve(pluginPath)];
	});

	it('computes once and serves cached response on second call across users', async function () {
	  const pluginPath = path.resolve(__dirname, '../nodebb-plugin-thread-summarizer/library.js');
	  const plugin = freshRequire(pluginPath);

	  const app = express();
	  // attach uid from header (to bypass per-user cooldown on second request)
	  app.use((req, res, next) => {
	    const uid = Number(req.headers['x-uid']) || 1;
	    req.user = { uid };
	    next();
	  });

	  const router = express.Router();
	  await plugin.init({ router });
	  app.use(router);

	  // start ephemeral server
	  const server = await new Promise((resolve) => {
	    const s = app.listen(0, () => resolve(s));
	  });
	  const base = `http://127.0.0.1:${server.address().port}`;

	  try {
	    // First call (uid 1) -> computes + caches
	    const r1 = await fetch(`${base}/api/thread-summarizer/v2/42`, {
	      headers: { 'x-uid': '1' },
	    });
	    assert.strictEqual(r1.status, 200);
	    const b1 = await r1.json();
	    assert.ok(b1.summary && b1.summary.includes('TL;DR:'), 'missing TL;DR');
	    assert.strictEqual(b1.cached, false);

	    // Second call (uid 2) -> cache hit, no cooldown
	    const r2 = await fetch(`${base}/api/thread-summarizer/v2/42`, {
	      headers: { 'x-uid': '2' },
	    });
	    assert.strictEqual(r2.status, 200);
	    const b2 = await r2.json();
	    assert.strictEqual(b2.cached, true);
	    // postCount should be stable between calls
	    if (b1.postCount != null) assert.strictEqual(b2.postCount, b1.postCount);
	  } finally {
	    server.close();
	  }
	});
});
