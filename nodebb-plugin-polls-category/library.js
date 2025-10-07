'use strict';

const Categories = require.main.require('./src/categories');
const Topics = require.main.require('./src/topics');

const Plugin = {};

Plugin.init = async function (params) {
    const { app, router, middleware } = params;

    // --- 1️⃣ Ensure Polls category exists ---
    const allCategories = await Categories.getCategories([]);
    let pollsCat = allCategories.find(c => c.slug === 'polls');

    if (!pollsCat) {
        pollsCat = await Categories.create({
            name: 'Polls',
            description: 'Vote on community polls and see results',
            descriptionParsed: '<p>Vote on community polls and see results</p>\n',
            bgColor: '#f5a623',
            color: '#ffffff',
            icon: 'fa-poll',
            order: 5
        });
        console.log('Polls category created!');
    } else {
        console.log('Polls category already exists, skipping creation.');
    }

    // --- 2️⃣ Routes ---
    router.get('/polls', middleware.buildHeader, async (req, res) => {
        const result = await Topics.getTopicsByCategory(pollsCat.cid, 0, 50);
        const topicsList = result.topics || [];
        res.render('polls-page', { title: 'Community Polls', topics: topicsList });
    });
};

module.exports = Plugin;