'use strict';

const nconf = require('nconf');

// ✅ make sure these requires exist (paths match NodeBB's tree)
const topics = require('../topics');
const user = require('../user');
const meta = require('../meta');
const privileges = require('../privileges');
const helpers = require('./helpers'); // controllers/helpers.js

const recentController = module.exports;
const relative_path = nconf.get('relative_path');

// helper to set title & breadcrumbs
function setTitleAndBreadcrumbs(data, url, asHome) {
	if (asHome) {
		data.title = meta.config.homePageTitle || '[[pages:home]]';
		return;
	}
	data.title = `[[pages:${url}]]`;
	data.breadcrumbs = helpers.buildBreadcrumbs([{ text: `[[${url}:title]]` }]);
}

// helper to set RSS fields
function setRssFields(ctx) {
	const { data, url, req, rssToken } = ctx;
	const disabled = meta.config['feeds:disableRSS'] || 0;

	data['feeds:disableRSS'] = disabled;
	if (disabled) return;

	let rss = `${relative_path}/${url}.rss`;
	if (req.loggedIn) {
		rss += `?uid=${req.uid}&token=${rssToken}`;
	}
	data.rssFeedUrl = rss;
}

recentController.get = async function (req, res, next) {
	const data = await recentController.getData(req, 'recent', 'recent');
	if (!data) {
		return next();
	}
	res.render('recent', data);
};

recentController.getData = async function (req, url, sort) {
	const page = parseInt(req.query.page, 10) || 1;

	// simplified term logic (no duplicate let)
	const termKey = req.query.term;
	let term = termKey ? helpers.terms[termKey] : 'alltime';
	if (termKey && !term) return null;

	const { cid, tag } = req.query;
	const filter = req.query.filter || '';

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
		filter,
		term,
		sort,
		floatPinned: req.query.pinned,
		query: req.query,
	});

	// single computation + helper (remove any older isDisplayedAsHome block)
	const asHome = !(req.originalUrl.startsWith(`${relative_path}/api/${url}`) || req.originalUrl.startsWith(`${relative_path}/${url}`));
	const baseUrl = asHome ? '' : url;
	setTitleAndBreadcrumbs(data, url, asHome);

	const query = { ...req.query };
	delete query.page;

	data.canPost = canPost;
	data.showSelect = isPrivileged;
	data.showTopicTools = isPrivileged;
	data.allCategoriesUrl = baseUrl + helpers.buildQueryString(query, 'cid', '');
	data.selectedCategory = categoryData.selectedCategory;
	data.selectedCids = categoryData.selectedCids;
	data.selectedTag = tagData.selectedTag;
	data.selectedTags = tagData.selectedTags;

	// single RSS path via helper (remove any manual RSS block)
	setRssFields({ data, url, req, rssToken });

	data.filters = helpers.buildFilters(baseUrl, filter, query);
	data.selectedFilter = data.filters.find(f => f && f.selected) || null;

	return data;
};

require('../promisify')(recentController, ['get']);
