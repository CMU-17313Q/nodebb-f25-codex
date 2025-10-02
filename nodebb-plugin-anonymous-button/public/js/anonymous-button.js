/* global $, require */
'use strict';
console.log('[anonymous-button] client script loaded');
(function () {
  let isAnonymous = false;
  
  require(['hooks'], function (hooks) {
    function initButton() {
      if ($('#anon-toggle-floating').length) {
        const $existingBtn = $('#anon-toggle-floating');
        $existingBtn.toggleClass('btn-success', isAnonymous)
                    .toggleClass('btn-secondary', !isAnonymous);
        return;
      }
      
      const $btn = $(`
        <button id="anon-toggle-floating"
                class="btn btn-sm btn-secondary"
                title="Toggle Anonymous Posting"
                style="position:fixed;bottom:20px;right:20px;z-index:2000;">
          <i class="fa fa-user-secret"></i> Anon
        </button>
      `);
      
      $btn.on('click', function () {
        isAnonymous = !isAnonymous;
        $btn.toggleClass('btn-success', isAnonymous)
            .toggleClass('btn-secondary', !isAnonymous);
        console.log('[anonymous-button] anonymous mode:', isAnonymous);
      });
      
      $('body').append($btn);
    }
    
    hooks.on('action:ajaxify.end', initButton);
    
    hooks.on('action:composer.submit', function (data) {
      console.log('[anonymous-button] composer.submit hook fired', data);
      if (isAnonymous && data.postData) {
        data.postData.isAnonymous = true;
        console.log('[anonymous-button] attached isAnonymous to composer.submit');
      }
    });
    

    hooks.on('filter:composer.submit', function (data) {
      console.log('[anonymous-button] filter:composer.submit hook fired', data);
      if (isAnonymous && data.postData) {
        data.postData.isAnonymous = true;
        console.log('[anonymous-button] attached isAnonymous to filter:composer.submit');
      }
      return data;
    });
    

    hooks.on('filter:post.create', function (data) {
      console.log('[anonymous-button] filter:post.create hook fired', data);
      if (isAnonymous) {
        data.isAnonymous = true;
        console.log('[anonymous-button] attached isAnonymous to filter:post.create');
      }
      return data;
    });
  });
})();

