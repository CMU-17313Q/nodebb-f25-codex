'use strict';

const nconf = require('nconf');

// ⬇️ These paths assume this file is at src/controllers/recent.js
const user = require('../user');
const topics = require('../topics');
const meta = require('../meta');
const privileges = require('../privileges');
// If helpers.js is NOT in the same folder as this file, change to: ../helpers
const helpers = require('./helpers');

const recentController = module.exports;
const relative_path = nconf.get('relative_path');

// ---------------------------------------------------------------------------
// Small guards/utilities
// ---------------------------------------------------------------------------

function resolveTerm(req) {
	// Some NodeBB trees expose helpers.terms; some don’t.
	// We gracefully fall back to 'alltime' and reject unknown terms when a key is supplied.
	const termKey = req.query.term;
	if (!termKey) return 'alltime';

	if (helpers && helpers.terms && Object.prototype.hasOwnProperty.call(helpers.terms, termKey)) {
		return helpers.terms[termKey] || 'alltime';
	}

	// If a term was provided but we can't validate it, mimic original behavior: reject.
	return null;
}

function setTitleAndBreadcrumbs(data, url, asHome) {
	if (asHome) {
		data.title = meta.config.homePageTitle || '[[pages:home]]';
		return;
	}
	data.title = `[[pages:${url}]]`;
	if (helpers && typeof helpers.buildBreadcrumbs === 'function') {
		data.breadcrumbs = helpers.buildBreadcrumbs([{ text: `[[${url}:title]]` }]);
	}
}

function setRssFields({ data, url, req, rssToken }) {
	const disabled = meta.config['feeds:disableRSS'] || 0;
	data['feeds:disableRSS'] = disabled;
	if (disabled) return;

	let rss = `${relative_path}/${url}.rss`;
	if (req.loggedIn) {
		rss += `?uid=${req.uid}&token=${rssToken}`;
	}
	data.rssFeedUrl = rss;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

recentController.get = async function (req, res, next) {
	const data = await recentController.getData(req, 'recent', 'recent');
	if (!data) return next();
	res.render('recent', data);
};

recentController.getData = async function (req, url, sort) {
	const page = parseInt(req.query.page, 10) || 1;

	// Term handling with guards (no duplicate lets)
	const term = resolveTerm(req);
	if (req.query.term && !term) {
		// termKey provided but invalid
		return null;
	}

	const { cid, tag } = req.query;
	const activeFilter = req.query.filter || '';

	const [
		settings,
		categoryData,
		tagData,
		rssToken,
		canPost,
		isPrivileged,
	] = await Promise.all([
		user.getSettings(req.uid),
		helpers.getSelectedCategory ? helpers.getSelectedCategory(cid) : { selectedCategory: null, selectedCids: [] },
		helpers.getSelectedTag ? helpers.getSelectedTag(tag) : { selectedTag: null, selectedTags: [] },
		user.auth.getFeedToken(req.uid),
		privileges.categories.canPostTopic(req.uid),
		user.isPrivileged(req.uid),
	]);

	const start = Math.max(0, (page - 1) * settings.topicsPerPage);
	const stop = start + settings.topicsPerPage - 1;

	const data = await topics.getSortedTopics({
		cids: cid,
		tags: tag,
		uid: req.uid,
		start,
		stop,
		filter: activeFilter,
		term,
		sort,
		floatPinned: req.query.pinned,
		query: req.query,
	});

	// Compute "as home" only once; use helper for title & breadcrumbs
	const asHome = !(req.originalUrl.startsWith(`${relative_path}/api/${url}`) ||
	                 req.originalUrl.startsWith(`${relative_path}/${url}`));
	const baseUrl = asHome ? '' : url;
	setTitleAndBreadcrumbs(data, url, asHome);

	// Build query for links
	const query = { ...req.query };
	delete query.page;

	// Permissions / selections
	data.canPost = canPost;
	data.showSelect = isPrivileged;
	data.showTopicTools = isPrivileged;

	data.allCategoriesUrl = baseUrl + (helpers.buildQueryString ? helpers.buildQueryString(query, 'cid', '') : '');
	data.selectedCategory = categoryData.selectedCategory;
	data.selectedCids = categoryData.selectedCids;
	data.selectedTag = tagData.selectedTag;
	data.selectedTags = tagData.selectedTags;

	// RSS via helper
	setRssFields({ data, url, req, rssToken });

	// Filters (defend if helpers.buildFilters returns non-array)
	data.filters = helpers.buildFilters ? helpers.buildFilters(baseUrl, activeFilter, query) : [];
	data.selectedFilter = Array.isArray(data.filters)
		? data.filters.find(f => f && f.selected) || null
		: null;

	return data;
};

require('../promisify')(recentController, ['get']);
