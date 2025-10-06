'use strict';

const Categories = require.main.require('./src/categories');

const Plugin = {};

Plugin.init = async function(params) {
    const { app, router, middleware } = params;
    
    // Check if Polls exists
    const all = await Categories.getCategories([]);
    const exists = all.some(c => c.name === 'Polls');
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
};

module.exports = Plugin;