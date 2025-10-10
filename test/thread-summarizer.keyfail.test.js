// (removed unused eslint-disables)
const assert = require('assert');
const express = require('express');
const request = require('supertest');
const path = require('path');

function freshRequire(absPath) {
	delete require.cache[require.resolve(absPath)];
	// eslint-disable-next-line global-require
	return require(absPath);
}

describe('thread-summarizer – missing OPENAI_API_KEY error branch', () => {
	let restoreMainRequire;

	beforeEach(() => {
		process.env.TS_STUB = '0'; // force real path
		delete process.env.OPENAI_API_KEY; // missing key triggers 500
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
				return { getPostsByPids: async () => ([{ uid: 1, username: 'alice', content: 'hi' }]) };
			}
			return realMainRequire(id);
		};
	});

	afterEach(() => {
		restoreMainRequire?.();
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

		const r = await request(app).get('/api/thread-summarizer/v2/9').expect(500);
		// Your code sets { error: 'Summarization failed.', detail: 'Missing OPENAI_API_KEY' }
		assert.strictEqual(r.body.error, 'Summarization failed.');
		assert.ok(String(r.body.detail || '').includes('OPENAI_API_KEY'));
	});
});
