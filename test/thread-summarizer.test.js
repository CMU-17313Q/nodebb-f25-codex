/* eslint-env mocha */
const assert = require('assert');

function makeRes() {
	return {
		code: 200,
		body: null,
		status(c) { this.code = c; return this; },
		json(o) { this.body = o; return this; },
	};
}

describe('thread-summarizer plugin', () => {
	let lastHandler;
	let restoreMainRequire;

	async function loadPlugin({ can = true } = {}) {
		// Fake router so we can capture the handler your plugin registers
		const router = { get: (path, handler) => { lastHandler = handler; } };

		// Fakes for NodeBB internals
		const privileges = { topics: { can: async () => can } };
		const topics = { getPids: async () => [1, 2] };
		const posts = {
			getPostsByPids: async () => ([
				{ pid: 1, content: 'test post 1' },
				{ pid: 2, content: 'test post 2' },
			]),
		};

		// Monkey-patch require.main.require used by the plugin
		const Module = require('module');
		const original = require.main.require;
		restoreMainRequire = () => { require.main.require = original; };
		require.main.require = (id) => {
			if (id.endsWith('/src/privileges') || id === './src/privileges') return privileges;
			if (id.endsWith('/src/topics') || id === './src/topics') return topics;
			if (id.endsWith('/src/posts') || id === './src/posts') return posts;
			return original(id);
		};

		// Load the plugin (this will call your init and attach routes)
		const plugin = require('../nodebb-plugin-thread-summarizer/library.js');
		await plugin.init({ router });
	}

	beforeEach(() => {
		delete process.env.OPENAI_API_KEY;
		process.env.TS_STUB = '1'; // stay in stub mode for tests
	});

	afterEach(() => {
		if (restoreMainRequire) restoreMainRequire();
		delete require.cache[require.resolve('../nodebb-plugin-thread-summarizer/library.js')];
	});

	it('returns stub summary', async () => {
		await loadPlugin();
		const res = makeRes();
		await lastHandler({ params: { tid: '1' }, user: { uid: 1 } }, res);
		assert.equal(res.code, 200);
		assert.match(res.body.summary, /stub/i);
	});

	it('400s on invalid tid', async () => {
		await loadPlugin();
		const res = makeRes();
		await lastHandler({ params: { tid: 'abc' }, user: { uid: 1 } }, res);
		assert.equal(res.code, 400);
	});

	it('403s when user lacks permission', async () => {
		await loadPlugin({ can: false });
		const res = makeRes();
		await lastHandler({ params: { tid: '1' }, user: { uid: 9 } }, res);
		assert.equal(res.code, 403);
	});

	it('429s on cooldown', async () => {
		await loadPlugin();
		const req = { params: { tid: '1' }, user: { uid: 7 } };
		const first = makeRes();
		await lastHandler(req, first);
		const second = makeRes();
		await lastHandler(req, second);
		assert.equal(second.code, 429);
	});
});
