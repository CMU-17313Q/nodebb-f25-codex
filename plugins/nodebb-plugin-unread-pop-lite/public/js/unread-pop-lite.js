/* global $, app, ajaxify, socket */
'use strict';

(function () {
  let lastUid = 0;

  // --- Modal UI ---
  function ensureModal() {
    if ($('#unread-pop-lite').length) return $('#unread-pop-lite');
    const $m = $(`
      <div class="modal fade" id="unread-pop-lite" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-md" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Unread notifications</h5>
              <button type="button"
                      class="close btn-close"
                      data-dismiss="modal"
                      data-bs-dismiss="modal"
                      aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <ul class="list-group" id="upl-list"></ul>
              <div id="upl-empty" class="text-muted" style="display:none">No unread notifications 🎉</div>
            </div>
            <div class="modal-footer">
              <button id="upl-mark-all" class="btn btn-sm btn-primary">Mark all read</button>
              <button class="btn btn-sm btn-secondary"
                      data-dismiss="modal"
                      data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `);
    $('body').append($m);

    // Fallback close handling (covers BS4 & BS5)
    $(document).on('click', '#unread-pop-lite [data-dismiss="modal"], #unread-pop-lite [data-bs-dismiss="modal"], #unread-pop-lite .close, #unread-pop-lite .btn-close', function (e) {
      e.preventDefault();
      $('#unread-pop-lite').modal('hide'); // BS4 jQuery plugin
      const el = document.getElementById('unread-pop-lite');
      if (window.bootstrap && window.bootstrap.Modal) {
        try { window.bootstrap.Modal.getOrCreateInstance(el).hide(); } catch (_) {}
      }
    });

    // Open + mark read
    $(document).on('click', '.upl-open, .upl-link', function (e) {
      e.preventDefault();
      const $li = $(this).closest('li[data-nid]');
      const nid = String($li.data('nid'));
      const href = $li.data('href');

      socket.emit('notifications.markRead', { nids: [nid] }, () => {
        $li.remove();
        if (!$('#upl-list > li').length) $('#upl-empty').show();

        if (href && href !== '#') {
          if (/^https?:\/\//.test(href)) window.location.href = href;
          else ajaxify.go(href);
        }
      });
    });

    // Mark all read
    $(document).on('click', '#upl-mark-all', function () {
      const nids = $('#upl-list > li').map((i, li) => $(li).data('nid')).get();
      if (!nids.length) return;
      socket.emit('notifications.markRead', { nids: nids.map(String) }, () => {
        $('#upl-list').empty();
        $('#upl-empty').show();
      });
    });

    // Prime BS5 modal instance if available
    if (window.bootstrap && window.bootstrap.Modal) {
      try { window.bootstrap.Modal.getOrCreateInstance(document.getElementById('unread-pop-lite')); } catch (_) {}
    }

    return $m;
  }

  function item(n) {
    const text = n.bodyShort || n.bodyLong || n.text || 'Notification';
    const href = n.path || n.url || '#';
    const nid  = n.nid || n.id;
    const time = n.datetime || n.datetimeISO || '';
    return $(`
      <li class="list-group-item d-flex justify-content-between align-items-center"
          data-nid="${nid}" data-href="${href}">
        <div class="mr-2">
          <a href="${href}" class="upl-link">${text}</a>
          ${time ? `<div class="small text-muted">${time}</div>` : ''}
        </div>
        <button class="btn btn-sm btn-outline-primary upl-open">Open</button>
      </li>
    `);
  }

  function fill(list) {
    const $list = $('#upl-list');
    const $empty = $('#upl-empty');
    $list.empty();
    if (!list.length) return $empty.show();

    $empty.hide();
    list.sort((a,b) => new Date(b.datetimeISO || b.datetime || 0) - new Date(a.datetimeISO || a.datetime || 0));
    list.forEach(n => $list.append(item(n)));
  }

  function show(list) {
    const $m = ensureModal();
    fill(list);
    $m.modal('show');
    if (window.bootstrap && window.bootstrap.Modal) {
      try { window.bootstrap.Modal.getOrCreateInstance(document.getElementById('unread-pop-lite')).show(); } catch (_) {}
    }
  }

  function fetchUnread(cb) {
    $.get('/api/notifications?unread=1&limit=10&sortBy=timestamp&sortDir=desc', (res) => {
      let arr = (res && (res.notifications || res.results || res)) || [];
      if (!Array.isArray(arr)) arr = [];
      cb(arr.filter(n => !n.read && !n.isRead));
    }).fail(() => cb([]));
  }

  function listenRealtime() {
    socket.on('event:new_notification', (n) => {
      if (!n || n.read || n.isRead) return;
      if (!$('#unread-pop-lite').is(':visible')) return;
      $('#upl-empty').hide();
      $('#upl-list').prepend(item(n));
    });
  }

  function maybeShowOnSignIn() {
    const uid = (app && app.user && parseInt(app.user.uid, 10)) || 0;
    if (uid > 0 && uid !== lastUid) {
      fetchUnread((list) => {
        if (list.length) show(list);
        lastUid = uid;
      });
      return;
    }
    if (uid <= 0 && lastUid !== 0) {
      lastUid = 0;
    }
  }

  $(window).on('action:connected', () => {
    listenRealtime();
    maybeShowOnSignIn();
  });

  $(window).on('action:ajaxify.end', () => {
    maybeShowOnSignIn();
  });

  $(function () {
    setTimeout(maybeShowOnSignIn, 0);
  });
})();