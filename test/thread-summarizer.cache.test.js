/* eslint-env mocha */
const assert = require('assert');
const Module = require('module');
const path = require('path');
const express = require('express');
const request = require('supertest');

function freshRequire(absPath) {
	delete require.cache[require.resolve(absPath)];
	return require(absPath);
}

describe('thread-summarizer – non-stub OpenAI + cache (N posts agnostic)', function () {
	let restoreMainRequire;
	let restoreLoad;

	beforeEach(function () {
		// Force non-stub BEFORE require
		process.env.TS_STUB = '0';
		process.env.OPENAI_API_KEY = 'test-key';
		process.env.OPENAI_MODEL = 'gpt-4o-mini';

		// Mock NodeBB internals (respect start/end)
		const realMainRequire = require.main.require;
		restoreMainRequire = function () { require.main.require = realMainRequire; };
		require.main.require = function (id) {
			if (id.endsWith('/src/privileges') || id === './src/privileges') {
				return { topics: { can: async () => true } };
			}
			if (id.endsWith('/src/topics') || id === './src/topics') {
				// Return exactly end-start+1 pids; independent of how many posts exist
				return {
					getPids: async (_tid, start, end) => {
						const n = Math.max(0, (end - start + 1) || 0);
						return Array.from({ length: n }, (_, i) => start + i + 1); // [1..n]
					},
				};
			}
			if (id.endsWith('/src/posts') || id === './src/posts') {
				return {
					getPostsByPids: async (pids) => pids.map((pid) => ({
						uid: (pid % 5) + 1,
						username: `u${pid}`,
						content: `post #${pid} hello world`,
					})),
				};
			}
			return realMainRequire(id);
		};

		// Mock 'openai' package (parser-safe)
		const realLoad = Module._load;
		restoreLoad = function () { Module._load = realLoad; };
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
	});

	afterEach(function () {
		if (restoreMainRequire) restoreMainRequire();
		if (restoreLoad) restoreLoad();
		const pluginPath = path.resolve(__dirname, '../nodebb-plugin-thread-summarizer/library.js');
		delete require.cache[require.resolve(pluginPath)];
	});

	it('computes once, then serves from cache across users (no cooldown conflict)', async function () {
		const pluginPath = path.resolve(__dirname, '../nodebb-plugin-thread-summarizer/library.js');
		const plugin = freshRequire(pluginPath);

		const app = express();

		// set req.user.uid from header (so we can change uid to avoid cooldown)
		app.use((req, _res, next) => {
			const uid = Number(req.headers['x-uid']) || 1;
			req.user = { uid };
			next();
		});

		const router = express.Router();
		await plugin.init({ router });
		app.use(router);

		// First call: uid=1 → compute + cache (tid=42)
		const r1 = await request(app)
			.get('/api/thread-summarizer/v2/42')
			.set('x-uid', '1')
			.expect(200);

		assert.ok(String(r1.body.summary || '').includes('TL;DR:'), 'missing TL;DR');
		assert.strictEqual(r1.body.cached, false, 'first call should not be cached');
		assert.strictEqual(typeof r1.body.postCount, 'number');
		assert.ok(r1.body.postCount > 0, 'postCount should be > 0 on non-empty threads');

		// Second call: uid=2 (different user) same tid → cache hit, no cooldown
		const r2 = await request(app)
			.get('/api/thread-summarizer/v2/42')
			.set('x-uid', '2')
			.expect(200);

		assert.strictEqual(r2.body.cached, true, 'second call should be served from cache');
		assert.strictEqual(r2.body.postCount, r1.body.postCount, 'postCount should match cached value');
	});
});
