/* global $, require */
'use strict';

console.log('[anonymous-button] client script loaded');

(function () {
  let isAnonymous = false;

  require(['hooks'], function (hooks) {
    // Navbar button
    hooks.on('action:ajaxify.end', function () {
      if ($('#anon-toggle-navbar').length) return;

      const $btn = $(`
        <li id="anon-toggle-navbar" class="nav-item">
          <a class="nav-link" href="#" title="Toggle Anonymous Posting">
            <i class="fa fa-user-secret"></i> <span>Anon</span>
          </a>
        </li>
      `);

      $btn.on('click', function (e) {
        e.preventDefault();
        isAnonymous = !isAnonymous;
        $btn.toggleClass('active text-success', isAnonymous);
        console.log('[anonymous-button] anonymous mode:', isAnonymous);
      });

      // Append to navbar
      const $nav = $('#main-nav .navbar-nav');
      if ($nav.length) {
        $nav.append($btn);
      } else {
        $('ul.navbar-nav').append($btn);
      }
    });

    // Attach flag right before composer submit
    hooks.on('filter:composer.submit', function (payload, next) {
      if (isAnonymous) {
        payload.data.isAnonymous = true;
        console.log('[anonymous-button] submitting anonymous post', payload.data);
      }
      return next(null, payload);
    });
  });
})();
