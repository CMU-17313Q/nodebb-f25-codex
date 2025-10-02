'use strict';

const Posts = require.main.require('./src/posts');

const plugin = {};

plugin.init = async function () {
  console.log('[anonymous-button] plugin initialized');
};

// Add anonymous button in composer toolbar
plugin.addFormattingButton = async function (data) {
  data.options.push({
    name: 'anonymous',
    className: 'fa fa-user-secret',
    title: 'Post Anonymously',
  });
  return data;
};

// Save flag at creation time
plugin.filterPostCreate = async function (payload) {
  payload.post.isAnonymous = payload.data && payload.data.isAnonymous ? 1 : 0;
  return payload;
};

// Persist flag and pre-mask after save
plugin.maskPostAfterSave = async function ({ post }) {
  try {
    await Posts.setPostField(post.pid, 'isAnonymous', post.isAnonymous ? 1 : 0);
    if (post.isAnonymous) {
      await Posts.setPostFields(post.pid, {
        uid: 0,
        username: 'Anonymous',
        userslug: 'anonymous',
        picture: '/plugins/nodebb-plugin-anonymous-button/anon.png',
      });
      console.log('[anonymous-button] masked post after save:', post.pid);
    }
  } catch (err) {
    console.error('[anonymous-button] maskPostAfterSave error:', err);
  }
};

// Helper to mask both post & nested user
function applyMask(post) {
  if (!post) return;
  // Top-level
  post.uid = 0;
  post.username = 'Anonymous';
  post.userslug = 'anonymous';
  post.picture = '/plugins/nodebb-plugin-anonymous-button/anon.png';

  // Nested user object
  if (post.user && typeof post.user === 'object') {
    post.user.uid = 0;
    post.user.username = 'Anonymous';
    post.user.displayname = 'Anonymous';
    post.user.fullname = undefined;
    post.user.userslug = 'anonymous';
    post.user.picture = '/plugins/nodebb-plugin-anonymous-button/anon.png';
  }
}

// Mask for single post
plugin.maskSinglePostOnGet = async function ({ post, uid }) {
  if (post && (post.isAnonymous === 1 || post.isAnonymous === '1' || post.isAnonymous === true)) {
    applyMask(post);
  }
  return { post, uid };
};

// Mask for multiple posts
plugin.maskPostsOnGet = async function (payload) {
  payload.posts.forEach(p => {
    if (p && (p.isAnonymous === 1 || p.isAnonymous === '1' || p.isAnonymous === true)) {
      applyMask(p);
    }
  });
  return payload;
};

module.exports = plugin;
