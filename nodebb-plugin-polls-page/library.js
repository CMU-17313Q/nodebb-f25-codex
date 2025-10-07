'use strict';

const fs = require('fs');
const path = require('path');
const Categories = require.main.require('./src/categories');
const Topics = require.main.require('./src/topics');

const Plugin = {};

Plugin.init = async function (params) {
    const { app, router, middleware } = params;

    // --- 1️⃣ Create Polls category if it doesn't exist ---
    const allCategories = await Categories.getCategories([]);
    const exists = allCategories.some(c => c.name === 'Polls');
    if (!exists) {
        await Categories.create({
            name: 'Polls',
            description: 'Vote on community polls and see results',
            descriptionParsed: '<p>Vote on community polls and see results</p>\n',
            bgColor: '#f5a623',
            color: '#ffffff',
            icon: 'fa-poll',
            order: 5
        });
        console.log('Polls category created!');
    }

    // --- 2️⃣ Route for static polls-category page ---
    router.get('/polls-category', middleware.buildHeader, renderPollsCategory);
    router.get('/api/polls-category', renderPollsCategory);

    // --- 3️⃣ Route for dynamic polls page ---
    router.get('/polls', middleware.buildHeader, renderPollsPage);
    router.get('/api/polls', renderPollsPage);
};

// --- 4️⃣ Render function for /polls-category ---
async function renderPollsCategory(req, res) {
    res.render('polls-category', {
        title: 'Polls Category',
        message: 'Welcome to the Polls Category page!',
    });
}

// --- 5️⃣ Render function for /polls (shows real topics) ---
async function renderPollsPage(req, res) {
    // Get Polls category
    const allCategories = await Categories.getCategories([]);
    const pollsCat = allCategories.find(c => c.name === 'Polls');

    let topicsList = [];
    if (pollsCat) {
        const result = await Topics.getTopicsByCategory(pollsCat.cid, 0, 50);
        topicsList = result.topics || [];
    }

    // Render template
    res.render('polls-page', {
        title: 'Community Polls',
        message: 'Here are the latest polls in the community!',
        topics: topicsList
    });
}

module.exports = Plugin;
