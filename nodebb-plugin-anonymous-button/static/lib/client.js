'use strict';

define('anonymous/button', ['composer/formatting', 'composer'], function (formatting, composer) {
    const AnonymousButton = {};

    AnonymousButton.init = function () {
        formatting.addButtonDispatch('anonymous', function (textarea, selectionStart, selectionEnd) {
            const composerData = composer.posts[composer.active];
            composerData.isAnonymous = !composerData.isAnonymous;

            // Find our button in the toolbar
            const $btn = $('.formatting-bar [data-format="anonymous"]');

            if (composerData.isAnonymous) {
                $btn.addClass('active');   // highlight
            } else {
                $btn.removeClass('active');
            }
        });
    };

    return AnonymousButton;
});
