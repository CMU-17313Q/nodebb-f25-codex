'use strict';

const nconf = require('nconf');
const user = require('../user');
const topics = require('../topics');
const meta = require('../meta');
const privileges = require('../privileges');


const helpers = require('./helpers');

const recentController = module.exports;
const relative_path = nconf.get('relative_path');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setTitleAndBreadcrumbs(data, url, asHome) {
	if (asHome) {
		data.title = meta.config.homePageTitle || '[[pages:home]]';
		return;
	}
	data.title = `[[pages:${url}]]`;
	data.breadcrumbs = helpers.buildBreadcrumbs([{ text: `[[${url}:title]]` }]);
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
	if (!data) {
		return next();
	}
	res.render('recent', data);
};

recentController.getData = async function (req, url, sort) {
	const page = parseInt(req.query.page, 10) || 1;

	// term selection (simplified, no redeclarations)
	const termKey = req.query.term;
	let term = termKey ? helpers.terms[termKey] : 'alltime';
	if (termKey && !term) return null;

	const { cid, tag } = req.query;
	const activeFilter = req.query.filter || '';

	const [settings, categoryData, tagData, rssToken, canPost, isPrivileged] = await Promise.all([
		user.getSettings(req.uid),
		helpers.getSelectedCategory(cid),
		helpers.getSelectedTag(tag),
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

	// asHome + breadcrumbs
	const asHome = !(req.originalUrl.startsWith(`${relative_path}/api/${url}`) ||
	                 req.originalUrl.startsWith(`${relative_path}/${url}`));
	const baseUrl = asHome ? '' : url;
	setTitleAndBreadcrumbs(data, url, asHome);

	// query adjustments
	const query = { ...req.query };
	delete query.page;

	// permissions & selections
	data.canPost = canPost;
	data.showSelect = isPrivileged;
	data.showTopicTools = isPrivileged;

	data.allCategoriesUrl = baseUrl + helpers.buildQueryString(query, 'cid', '');
	data.selectedCategory = categoryData.selectedCategory;
	data.selectedCids = categoryData.selectedCids;
	data.selectedTag = tagData.selectedTag;
	data.selectedTags = tagData.selectedTags;

	// RSS
	setRssFields({ data, url, req, rssToken });

	// filters
	data.filters = helpers.buildFilters(baseUrl, activeFilter, query);
	data.selectedFilter = Array.isArray(data.filters)
		? data.filters.find(f => f && f.selected) || null
		: null;

	return data;
};

require('../promisify')(recentController, ['get']);

