'use strict';

define('forum/anonymous', ['hooks'], function (hooks) {
    let isAnonymous = false;

    // Add button
    hooks.on('action:composer.enhance', function (data) {
        const container = data.container;

        if (!container.find('#toggle-anon').length) {
            container.append(`
                <button id="toggle-anon" 
                  class="btn btn-secondary position-fixed bottom-0 end-0 px-3 py-2 mb-lg-4 me-4 rounded-circle fs-4" 
                  type="button" 
                  style="width: 64px; height: 64px; margin-bottom: 11rem;">
                    <i class="fa fa-user-secret"></i>
                </button>
            `);
        }
    });

    // toggle when clicked
    $(document).on('click', '#toggle-anon', function () {
        isAnonymous = !isAnonymous;

        // Show if on or off
        if (isAnonymous) {
            $(this).removeClass('btn-secondary').addClass('btn-danger');
        } else {
            $(this).removeClass('btn-danger').addClass('btn-secondary');
        }
    });

    hooks.on('filter:composer.data', function (payload) {
        payload.data.isAnonymous = isAnonymous;
        return payload;
    });
});
