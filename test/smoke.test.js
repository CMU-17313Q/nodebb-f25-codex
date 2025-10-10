/* eslint-env mocha */
const assert = require('assert');

describe('thread-summarizer plugin – smoke', () => {
	// require the plugin so NYC instruments at least one file
	const plugin = require('../nodebb-plugin-thread-summarizer/library.js');

	it('exports init()', () => {
		assert.equal(typeof plugin.init, 'function');
	});

	it('exports addThreadTool()', () => {
		assert.equal(typeof plugin.addThreadTool, 'function');
	});
});
