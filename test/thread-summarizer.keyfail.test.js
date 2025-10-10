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

function makeRes() {
	return {
	code: 200,
	body: null,
	status(c) { this.code = c; return this; },
	json(o) { this.body = o; return this; },
	};
}

describe('thread-summarizer – missing OPENAI_API_KEY error branch', () => {
	let restoreMainRequire;
	let restoreLoad;

	beforeEach(() => {
	// Force non-stub, but remove key so we hit the error path
	process.env.TS_STUB = '0';
	delete process.env.OPENAI_API_KEY;
	process.env.OPENAI_MODEL = 'gpt-4o-mini';

	// Mock NodeBB internals the route uses
	const realMainRequire = require.main.require;
	restoreMainRequire = () => { require.main.require = realMainRequire; };
	require.main.require = (id) => {
	if (id.endsWith('/src/privileges') || id === './src/privileges') {
	return { topics: { can: async () => true } };
	}
	if (id.endsWith('/src/topics') || id === './src/topics') {
	return { getPids: async () => [101] };
	}
	if (id.endsWith('/src/posts') || id === './src/posts') {
	return { getPostsByPids: async () => ([{ uid: 1, username: 'alice', content: 'hello' }]) };
	}
	return realMainRequire(id);
	};

	// Safe mock for 'openai' (won't be called because we error earlier)
	const realLoad = Module._load;
	restoreLoad = () => { Module._load = realLoad; };
	Module._load = function (request, parent, isMain) {
	if (request === 'openai') {
	return class OpenAI {
	constructor() { this.chat = { completions: { create: async () => ({ choices: [] }) } }; }
	};
	}
	// eslint-disable-next-line prefer-rest-params
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

	// Build a router and ask the plugin to register its route
	const router = express.Router();
	await plugin.init({ router });

	// Locate the route handler we just registered
	const layer = router.stack.find(
	s => s.route?.path === '/api/thread-summarizer/v2/:tid'
	);
	assert.ok(layer, 'route not registered');
	const handler = layer.route.stack[0].handle;

	// Call the handler directly
	const req = { params: { tid: '1' }, user: { uid: 1 } };
	const res = makeRes();

	await handler(req, res);

	assert.strictEqual(res.code, 500);
	assert.ok(/Missing OPENAI_API_KEY/i.test(res.body?.detail || ''));
	});
});
