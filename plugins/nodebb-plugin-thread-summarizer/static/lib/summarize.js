/* global $, ajaxify */
'use strict';

(function () {
  function ensureModal() {
    if ($('#summarizer-modal').length) return $('#summarizer-modal');
    const $m = $(`
      <div class="modal fade" id="summarizer-modal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-md" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Topic Summary</h5>
              <button type="button" class="close btn-close" data-dismiss="modal" data-bs-dismiss="modal">&times;</button>
            </div>
            <div class="modal-body">
              <div id="summarizer-body" class="text-muted">Generating…</div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-sm btn-secondary" data-dismiss="modal" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `);
    $('body').append($m);

    // Make close work on both BS4 and BS5
    $(document).on('click', '#summarizer-modal [data-dismiss="modal"], #summarizer-modal [data-bs-dismiss="modal"], #summarizer-modal .close, #summarizer-modal .btn-close', function (e) {
      e.preventDefault();
      $('#summarizer-modal').modal('hide');
      const el = document.getElementById('summarizer-modal');
      if (window.bootstrap && window.bootstrap.Modal) {
        try { window.bootstrap.Modal.getOrCreateInstance(el).hide(); } catch (_) {}
      }
    });

    return $m;
  }

  async function openSummary() {
    const tid = ajaxify.data && ajaxify.data.tid;
    if (!tid) return;

    const $m = ensureModal();
    $('#summarizer-body').text('Generating…');

    try {
      const res = await $.get(`/api/summarize/topic/${tid}`);
      $('#summarizer-body').text(res.summary || 'No summary.');
    } catch (err) {
      $('#summarizer-body').text('Failed to summarize.');
    }

    $m.modal('show');
    if (window.bootstrap && window.bootstrap.Modal) {
      try { window.bootstrap.Modal.getOrCreateInstance(document.getElementById('summarizer-modal')).show(); } catch (_) {}
    }
  }

  function insertButton() {
    // Topic toolbar is rendered; add our button if not present
    if (!ajaxify.data || !ajaxify.data.template || ajaxify.data.template !== 'topic') return;
    if ($('#summasrize-btn').length) return;
    const $bar = $('.topic .thread-tools, .topic .title .btn-group').first();
    if (!$bar.length) return;

    const $btn = $(`<button id="summarize-btn" class="btn btn-sm btn-outline-primary">Summarize</button>`);
    $btn.on('click', openSummary);
    $bar.prepend($btn);
  }

  $(window).on('action:ajaxify.end', insertButton);
  $(insertButton);
})();
