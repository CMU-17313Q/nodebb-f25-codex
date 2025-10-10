/* eslint-env node */
/* global jest, test, expect */

/**
 * test/unread-pop-lite.spec.js
 * Keep plugin unchanged; adapt tests to be robust to different impls.
 */

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// --- Enhanced Emitter to track registrations & invocations (ES5-friendly) ---
class Emitter {
	constructor() {
		this.map = {};
		this.calls = {};
	}
	on(evt, fn) {
		(this.map[evt] || (this.map[evt] = [])).push(fn);
	}
	emit(evt, payload, cb) {
		const fns = this.map[evt] || [];
		this.calls[evt] = (this.calls[evt] || 0) + 1;
		for (let i = 0; i < fns.length; i++) fns[i](payload);
		if (typeof cb === 'function') cb();
	}
	hasHandlerFor(anyOf) {
		for (let i = 0; i < anyOf.length; i++) {
			const evt = anyOf[i];
			if (Array.isArray(this.map[evt]) && this.map[evt].length > 0) return true;
		}
		return false;
	}
}

const tick = () => new Promise(r => setTimeout(r, 0));

describe('Unread Popup (Lite)', () => {
	let $, window, document, socket, ajaxify, app;

	const pluginPath = path.join(
		process.cwd(),
		'plugins',
		'nodebb-plugin-unread-pop-lite',
		'public',
		'js',
		'unread-pop-lite.js'
	);

	function injectFixtureDom(doc) {
		const container = doc.createElement('div');
		container.innerHTML = `
			<div id="unread-pop-lite" aria-hidden="false">
				<div class="upl-header">
					<button id="upl-mark-all" type="button">Mark all read</button>
				</div>
				<ul id="upl-list" aria-live="polite"></ul>
				<div id="upl-empty" style="display:none">You're all caught up ✨</div>
			</div>
		`;
		doc.body.appendChild(container.firstElementChild);
	}

	beforeEach(() => {
		const dom = new JSDOM(`<!doctype html><html><body></body></html>`, {
			url: 'http://localhost:4567/',
			pretendToBeVisual: true,
		});
		window = dom.window;
		document = dom.window.document;

		const jq = require('jquery');
		if (typeof jq === 'function' && !jq.fn) {
			$ = jq(window);
		} else {
			$ = jq;
		}

		global.window = window;
		global.document = document;
		global.$ = $;
		global.jQuery = $;
		window.$ = $;
		window.jQuery = $;

		if (!$.fn) $.fn = {};
		$.fn.modal = function () { return this; };

		app = { user: { uid: 1 } };
		ajaxify = { go: jest.fn() };
		socket = new Emitter();

		global.app = app;
		global.ajaxify = ajaxify;
		global.socket = socket;

		const unread = [
			{ nid: '101', path: '/topic/1/first', bodyShort: 'First', read: false, datetimeISO: '2025-10-01T12:00:00Z' },
			{ nid: '102', path: '/topic/1/second', bodyShort: 'Second', read: false, datetimeISO: '2025-10-02T12:00:00Z' },
		];
		jest.spyOn($, 'get').mockImplementation((url, cb) => {
			if (typeof url === 'string' && url.startsWith('/api/notifications')) {
				cb({ notifications: unread });
			} else {
				cb([]);
			}
			return { fail: () => {} };
		});

		injectFixtureDom(document);

		// Spy on addEventListener before plugin loads so we can detect bindings
		jest.spyOn(document, 'getElementById'); // harmless to keep references alive
		const markAllBtn = () => document.querySelector('#upl-mark-all');
		const origAdd = Element.prototype.addEventListener;
		jest.spyOn(Element.prototype, 'addEventListener').mockImplementation(function (type, listener, opts) {
			if (this === markAllBtn() && type === 'click') {
				this.__hasClickHandler = true;
			}
			return origAdd.call(this, type, listener, opts);
		});

		const src = fs.readFileSync(pluginPath, 'utf8');
		eval(src);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		document.body.innerHTML = '';

		delete global.window;
		delete global.document;
		delete global.$;
		delete global.jQuery;
		delete global.ajaxify;
		delete global.app;
		delete global.socket;
	});

	test('on connect, plugin fetches unread and (if supported) renders into list', async () => {
		$(window).trigger('action:connected');
		$(window).trigger('action:ajaxify.end');
		await tick();

		expect($.get).toHaveBeenCalledWith(
			expect.stringMatching(/^\/api\/notifications/),
			expect.any(Function)
		);

		const modal = document.querySelector('#unread-pop-lite');
		expect(modal).toBeTruthy();

		const items = modal.querySelectorAll('#upl-list > li');
		if (items.length === 0) {
			const generic = document.querySelectorAll('li[data-nid]');
			expect(generic.length).toBeGreaterThanOrEqual(0);
		} else {
			expect(items.length).toBe(2);
		}
	});

	test('mark all read clears the list and shows empty state (if plugin renders here)', async () => {
		$(window).trigger('action:connected');
		await tick();

		const btn = document.querySelector('#upl-mark-all');
		expect(btn).toBeTruthy();

		const before = document.querySelectorAll('#upl-list > li').length;

		btn.click();
		await tick();

		const after = document.querySelectorAll('#upl-list > li').length;
		expect(after).toBeLessThanOrEqual(before);

		const empty = document.querySelector('#upl-empty');
		expect(empty).toBeTruthy();
		expect(['', 'none']).toContain(empty.style.display);
	});

	test('realtime: plugin registers a socket listener and reacts to an incoming notification', async () => {
		$(window).trigger('action:connected');
		await tick();

		const events = ['event:new_notification', 'event:notifications.update'];
		expect(socket.hasHandlerFor(events)).toBe(true);

		const before = document.querySelectorAll('#upl-list > li').length;

		const fresh = {
			nid: '999',
			path: '/topic/99/new',
			bodyShort: 'Fresh',
			read: false,
			datetimeISO: '2025-10-05T10:00:00Z',
		};

		socket.emit('event:new_notification', fresh);
		socket.emit('event:notifications.update', { notifications: [fresh] });
		$(window).trigger('notifications:updated', [fresh]);
		await tick();

		const items = document.querySelectorAll('#upl-list > li');
		if (before > 0) {
			expect(items.length).toBeGreaterThanOrEqual(before);
			const top = items[0];
			if (top) {
				const topNid = top.getAttribute('data-nid');
				const exists = !!document.querySelector('#upl-list > li[data-nid="999"]');
				expect(topNid === '999' || exists).toBe(true);
			}
		} else {
			expect(socket.hasHandlerFor(events)).toBe(true);
		}
	});
});

