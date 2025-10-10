'use strict';

// Add a "Summarize" button on topic pages and show a modal with the summary
(function () {
  function onTopicReady() {
    const $ = window.jQuery;
    const ajaxify = window.ajaxify;
    const bootbox = window.bootbox;

    if (!ajaxify || ajaxify.data?.template?.name !== 'topic') return;

    const tid = ajaxify.data.tid;
    if (!tid) return;

    // Avoid duplicate buttons on SPA navigations
    if (document.querySelector('#ts-summarize-btn')) return;

    const toolbar = document.querySelector('.topic .topic-tools') ||
                    document.querySelector('.thread-tools, .topic-main-buttons');
    if (!toolbar) return;

    const btn = document.createElement('button');
    btn.id = 'ts-summarize-btn';
    btn.className = 'btn btn-sm btn-primary';
    btn.textContent = 'Summarize';
    btn.style.marginLeft = '8px';
    toolbar.appendChild(btn);

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        if (bootbox && bootbox.dialog) {
          bootbox.dialog({ title: 'Summarizing…', message: '<p>Please wait…</p>', closeButton: false });
        }

        const resp = await fetch(`/api/thread-summarizer/v2/${encodeURIComponent(tid)}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        const html = `
          <div style="text-align:left">
            <div><strong>Topic #${data.tid}</strong></div>
            <div style="margin-top:8px; white-space:pre-wrap">${(data.summary || '').replace(/</g, '&lt;')}</div>
            <div style="margin-top:12px;color:#777;font-size:12px">Posts scanned: ${data.postCount ?? 'n/a'}${data.cached ? ' · (cached)' : ''}</div>
          </div>
        `;

        if (bootbox && bootbox.alert) {
          bootbox.hideAll();
          bootbox.alert({ title: 'Thread Summary', message: html });
        } else if (window.app?.alert) {
          window.app.alert({ message: data.summary || 'No summary' });
        } else {
          alert(data.summary || 'No summary');
        }
      } catch (err) {
        console.error('[thread-summarizer] summarize failed', err);
        if (window.app?.alertError) window.app.alertError('Failed to summarize this topic.');
        else alert('Failed to summarize this topic.');
      } finally {
        if (bootbox?.hideAll) bootbox.hideAll();
        btn.disabled = false;
      }
    });
  }

  $(window).on('action:ajaxify.end', onTopicReady);
  onTopicReady();
})();
