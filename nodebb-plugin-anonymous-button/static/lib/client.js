'use strict';

// runs immediately when the script loads
require(['composer/formatting', 'composer'], function (formatting, composer) {
  formatting.addButtonDispatch('anonymous', function () {
    const activeId = composer.active;
    if (!activeId || !composer.posts[activeId]) return;

    const composerData = composer.posts[activeId];
    composerData.isAnonymous = !composerData.isAnonymous;

    const $btn = $('.formatting-bar [data-format="anonymous"]');
    if (composerData.isAnonymous) {
      $btn.addClass('active');
    } else {
      $btn.removeClass('active');
    }
  });
});