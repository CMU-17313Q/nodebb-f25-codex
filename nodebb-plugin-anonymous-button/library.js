'use strict';

const plugin = {};

// Add button to toolbar
plugin.addFormattingButton = async function (data) {
  data.options.push({
    name: 'anonymous',
    className: 'fa fa-user-secret', 
    title: 'Post Anonymously'
  });
  return data;
};

module.exports = plugin;
