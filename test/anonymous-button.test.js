const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Anonymous Button Plugin Test', function () {
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
			// Handle HTML string
			if (typeof selector === 'string' && selector.trim().startsWith('<')) {
				const temp = document.createElement('div');
				temp.innerHTML = selector;
				return $(Array.from(temp.childNodes));
			}

			// Handle CSS selector string
			if (typeof selector === 'string') {
				return $(document.querySelectorAll(selector));
			}

			// Handle array-like (NodeList or Array)
			if ((window.NodeList && selector instanceof window.NodeList) || Array.isArray(selector)) {
				const elements = Array.from(selector);
				const obj = {
					length: elements.length,
					each: function (callback) {
						elements.forEach((el, i) => callback.call(el, i, el));
						return obj;
					},
					on: function (event, handler) {
						elements.forEach(el => el.addEventListener(event, handler));
						return obj;
					},
					click: function () {
						elements.forEach(el => el.click());
						return obj;
					},
					toggleClass: function (className, toggle) {
						elements.forEach(el => {
							if (!el.classList) return; // FIX: prevent TypeError
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
					replaceWith: function (content) {
						elements.forEach(el => {
							const temp = document.createElement('div');
							temp.innerHTML = content;
							el.replaceWith(...temp.childNodes);
						});
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
					jquery: true,
				};

				elements.forEach((el, i) => obj[i] = el);
				return obj;
			}

			// Single DOM node
			if (selector && selector.nodeType) return $([selector]);

			// Fallback
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

		// Store mocks in window
		window.require = amdRequire;
		window.$ = $;
		window.hooksCallbacks = hooksCallbacks;
	});

	// Helper function to load plugin
	function loadPlugin() {
		const pluginCode = fs.readFileSync(
			path.join(__dirname, '../nodebb-plugin-anonymous-button/public/js/anonymous-button.js'),
			'utf-8'
		);
		const script = window.document.createElement('script');
		script.textContent = pluginCode;
		window.document.head.appendChild(script);
	}

	it('prints to terminal', function () {
		console.log('[TEST] Anonymous Button plugin test running!');
		expect(true).to.equal(true);
	});

	it('creates and initializes the plugin hooks', function () {
		loadPlugin();
		expect(hooksCallbacks['action:ajaxify.end']).to.be.an('array');
		expect(hooksCallbacks['action:ajaxify.end'].length).to.be.at.least(1);
	});

	it('adds the anonymous button when ajaxify.end hook is triggered', function () {
		loadPlugin();
		hooksCallbacks['action:ajaxify.end']?.forEach(cb => cb());
		const button = document.querySelector('#anon-toggle-floating');
		expect(button).to.not.be.null;
		expect(button.textContent).to.include('Anon');
	});

	it('button toggles class when clicked', function () {
		loadPlugin();
		hooksCallbacks['action:ajaxify.end']?.forEach(cb => cb());
		const button = document.querySelector('#anon-toggle-floating');
		expect(button).to.not.be.null;

		expect(button.classList.contains('btn-secondary')).to.be.true;
		expect(button.classList.contains('btn-success')).to.be.false;

		// Clicking should now toggle properly without TypeError
		button.click();
		expect(button.classList.contains('btn-success')).to.be.true;
		expect(button.classList.contains('btn-secondary')).to.be.false;

		button.click();
		expect(button.classList.contains('btn-secondary')).to.be.true;
		expect(button.classList.contains('btn-success')).to.be.false;
	});

	it('registers filter:composer.submit hook', function () {
		loadPlugin();
		expect(hooksCallbacks['filter:composer.submit']).to.be.an('array');
		expect(hooksCallbacks['filter:composer.submit'].length).to.be.at.least(1);
	});

	it('registers action:composer.submit hook', function () {
		loadPlugin();
		expect(hooksCallbacks['action:composer.submit']).to.be.an('array');
		expect(hooksCallbacks['action:composer.submit'].length).to.be.at.least(1);
	});

	it('button exists only once even when ajaxify.end fires multiple times', function () {
		loadPlugin();
		for (let i = 0; i < 3; i++) hooksCallbacks['action:ajaxify.end']?.forEach(cb => cb());
		const buttons = document.querySelectorAll('#anon-toggle-floating');
		expect(buttons.length).to.equal(1);
	});
});
