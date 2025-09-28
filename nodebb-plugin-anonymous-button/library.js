'use strict';

const plugin = {};

plugin.addFormattingButton = async function (data) {
  data.options.push({
    name: 'anonymous',
    className: 'fa fa-user-secret',
    title: 'Post Anonymously'
  });
  return data;
};

plugin.addAnonymousFlag = async function (data) {
  data.post.isAnonymous = data.data.isAnonymous || false;
  return data;
};

module.exports = plugin;
