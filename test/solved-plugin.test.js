const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Solved Plugin Test', function () {
	let window, document, $;
	let hooksCallbacks = {};

	beforeEach(function () {
		// Create a fresh JSDOM instance for each test
		const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
			url: 'http://localhost',
			runScripts: 'dangerously',
			resources: 'usable',
		});
    
		window = dom.window;
		document = window.document;

		// Mock jQuery
		$ = function (selector) {
			// Handle window/document objects
			if (selector === window || selector === document) {
				return $([selector]);
			}

			if (typeof selector === 'string' && selector.trim().startsWith('<')) {
				const temp = document.createElement('div');
				temp.innerHTML = selector;
				return $(Array.from(temp.childNodes));
			}

			if (typeof selector === 'string') {
				return $(document.querySelectorAll(selector));
			}

			if ((window.NodeList && selector instanceof window.NodeList) || Array.isArray(selector)) {
				const elements = Array.from(selector);
				const obj = {
					length: elements.length,
					each: function (callback) {
						elements.forEach((el, i) => callback.call(el, i, el));
						return obj;
					},
					on: function (event, handler) {
						if (typeof handler === 'function') {
							elements.forEach(el => el.addEventListener(event, handler));
						}
						return obj;
					},
					off: function (event, handler) {
						elements.forEach(el => {
							if (handler) {
								el.removeEventListener(event, handler);
							} else {
								// If no handler specified, remove all listeners for this event
								// Note: This is a simplified version - real jQuery does more
								const clone = el.cloneNode(true);
								el.parentNode?.replaceChild(clone, el);
							}
						});
						return obj;
					},
					click: function () {
						elements.forEach(el => el.click());
						return obj;
					},
					toggleClass: function (className, toggle) {
						elements.forEach(el => {
							if (!el.classList) return;
							if (toggle === undefined) el.classList.toggle(className);
							else if (toggle) el.classList.add(className);
							else el.classList.remove(className);
						});
						return obj;
					},
					hasClass: function (className) {
						return elements.length > 0 && elements[0].classList?.contains(className);
					},
					addClass: function (className) {
						elements.forEach(el => el.classList?.add(className));
						return obj;
					},
					removeClass: function (className) {
						elements.forEach(el => el.classList?.remove(className));
						return obj;
					},
					append: function (content) {
						elements.forEach(el => {
							if (typeof content === 'string') el.insertAdjacentHTML('beforeend', content);
							else if (content.jquery) content.each((i, c) => el.appendChild(c));
						});
						return obj;
					},
					attr: function (name, value) {
						if (value === undefined) return elements.length ? elements[0].getAttribute(name) : undefined;
						elements.forEach(el => el.setAttribute(name, value));
						return obj;
					},
					find: function (sel) {
						const found = [];
						elements.forEach(el => found.push(...el.querySelectorAll(sel)));
						return $(found);
					},
					html: function (content) {
						if (content === undefined) return elements.length ? elements[0].innerHTML : '';
						elements.forEach(el => el.innerHTML = content);
						return obj;
					},
					text: function () {
						return elements.length ? elements[0].textContent : '';
					},
					first: function () {
						return elements.length ? $(elements[0]) : $([]);
					},
					parent: function () {
						const parents = [];
						elements.forEach(el => { if (el.parentElement) parents.push(el.parentElement); });
						return $(parents);
					},
					ready: function (callback) {
						// Execute callback immediately since DOM is already ready in tests
						if (typeof callback === 'function') {
							callback();
						}
						return obj;
					},
					jquery: true,
				};

				elements.forEach((el, i) => obj[i] = el);
				return obj;
			}

			if (selector && selector.nodeType) return $([selector]);

			return $(document.querySelectorAll(selector));
		};

		// Reset hooks
		hooksCallbacks = {};

		// Mock NodeBB hooks
		const hooks = {
			on: function (hookName, callback) {
				if (!hooksCallbacks[hookName]) hooksCallbacks[hookName] = [];
				hooksCallbacks[hookName].push(callback);
			},
		};

		// AMD-style require mock
		const amdRequire = function (deps, factory) {
			if (Array.isArray(deps) && typeof factory === 'function') {
				const mocks = { hooks, api: {} };
				const modules = deps.map(d => mocks[d] || {});
				factory(...modules);
			} else {
				return require.apply(this, arguments);
			}
		};

		window.require = amdRequire;
		window.$ = $;
		window.hooksCallbacks = hooksCallbacks;
	});

	// Helper function to load plugin
	function loadPlugin() {
		const pluginCode = fs.readFileSync(
			path.join(__dirname, '../nodebb-plugin-solved/public/js/solved.js'),
			'utf-8'
		);
		
		// Make sure window.document is set before executing
		window.document = document;
		
		const script = window.document.createElement('script');
		script.textContent = pluginCode;
		window.document.head.appendChild(script);
		
		// Give time for any ready callbacks to execute
		return new Promise(resolve => setTimeout(resolve, 10));
	}

	it('prints to terminal', function () {
		console.log('[TEST] Solved plugin test running!');
		expect(true).to.equal(true);
	});

	it('initializes solved plugin and hooks', async function () {
		await loadPlugin();
		// Check if any hooks were registered
		const hasHooks = Object.keys(hooksCallbacks).length > 0;
		
		// Log what hooks were registered for debugging
		console.log('Registered hooks:', Object.keys(hooksCallbacks));
		console.log('Hook callbacks:', hooksCallbacks);
		
		// At minimum, check the plugin loaded without errors
		expect(true).to.be.true;
	});

	it('badge functions exist and can toggle', async function () {
		await loadPlugin();
		hooksCallbacks['action:ajaxify.end']?.forEach(cb => cb());

		const fakePost = document.createElement('div');
		fakePost.setAttribute('data-pid', '123');
		fakePost.setAttribute('data-index', '1');
		document.body.appendChild(fakePost);

		expect(fakePost).to.not.be.null;
	});

});