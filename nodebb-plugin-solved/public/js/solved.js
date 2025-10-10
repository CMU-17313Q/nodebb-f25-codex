'use strict';

/* globals $, app, ajaxify */

(function () {

    setTimeout(init, 500);
    setTimeout(init, 1500);
    setTimeout(init, 3000);

    $(document).ready(init);
    $(window).on('action:ajaxify.end', function () {
        setTimeout(init, 1000);
    });

    function init() {
        setupUpvoteWatcher();
        addStyles();

        // restore solved posts once everything is loaded
        setTimeout(showExistingSolvedPosts, 1200);
    }

    function setupUpvoteWatcher() {
        $('body').off('click.qa1');
        $('body').on('click.qa1', function (e) {
            const target = $(e.target);
            if (target.closest('[component="post/upvote"]').length) {
                handleUpvoteClick(target.closest('[component="post/upvote"]'));
            }
        });

        $(document).off('click.qa2');
        $(document).on('click.qa2', '[component="post/upvote"]', function () {
            handleUpvoteClick($(this));
        });

        $('[component="post/upvote"]').off('click.qa3');
        $('[component="post/upvote"]').on('click.qa3', function () {
            handleUpvoteClick($(this));
        });

        $('body').off('click.qa4');
        $('body').on('click.qa4', '[component*="upvote"]', function () {
            handleUpvoteClick($(this));
        });
    }

    function handleUpvoteClick(upvoteBtn) {
        const post = upvoteBtn.closest('[component="post"]');
        const pid = post.attr('data-pid');
        const postIndex = post.attr('data-index');

        if (postIndex === '0') {
            return;
        }

        const temp = $('<div class="qa-temp" style="background: orange; color: white; padding: 5px; margin: 5px 0; border-radius: 4px;">⏳ Checking upvote status...</div>');
        post.find('[component="post/content"]').prepend(temp);

        checkUpvoteMultipleTimes(post, upvoteBtn, 0);
    }

    function checkUpvoteMultipleTimes(post, upvoteBtn, attempt) {
        if (attempt > 5) {
            post.find('.qa-temp').remove();
            return;
        }

        const delay = [200, 500, 800, 1200, 1500, 2000][attempt];
        const pid = post.attr('data-pid');

        setTimeout(function () {
            const isUpvoted = upvoteBtn.hasClass('upvoted');
            post.find('.qa-temp').remove();

            if (isUpvoted) {
                markAsSolved(pid);
                addBadge(post);
                return;
            } else {
                if (post.find('.qa-helpful-badge').length > 0) {
                    removeBadge(post);
                    unmarkAsSolved(pid);
                    return;
                }

                if (attempt < 5) {
                    checkUpvoteMultipleTimes(post, upvoteBtn, attempt + 1);
                }
            }
        }, delay);
    }

    function markAsSolved(pid) {
        $.ajax({
            url: '/solved/mark',
            method: 'POST',
            data: { pid: pid, solved: true }
        });
    }

    function unmarkAsSolved(pid) {
        $.ajax({
            url: '/solved/mark',
            method: 'POST',
            data: { pid: pid, solved: false }
        });
    }

    function addBadge(post) {
        const pid = post.attr('data-pid');
        if (post.find('.qa-helpful-badge').length > 0) return;

        post.css({
            'border-left': '8px solid #28a745',
            'background-color': 'rgba(40, 167, 69, 0.15)',
            'transition': 'all 0.3s ease'
        });

        const badge = $(`
            <div class="qa-helpful-badge" style="
                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                color: white;
                padding: 15px 25px;
                margin: 20px 0;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                text-align: center;
                animation: qa-appear 0.5s ease;
            ">
                HELPFUL ANSWER ✓ UPVOTED BY TOPIC OWNER
            </div>
        `);

        const content = post.find('[component="post/content"]');
        if (content.length) {
            content.prepend(badge);
        }
    }

    function removeBadge(post) {
        post.css({
            'border-left': '',
            'background-color': ''
        });

        post.find('.qa-helpful-badge').remove();
    }

    function addStyles() {
        if ($('#qa-plugin-styles').length > 0) return;

        const styles = `
            <style id="qa-plugin-styles">
                @keyframes qa-appear {
                    from {
                        opacity: 0;
                        transform: scale(0.5) translateY(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                .qa-helpful-badge:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.25) !important;
                }
            </style>
        `;
        $('head').append(styles);
    }

    function showExistingSolvedPosts(retry = 0) {
        if (!ajaxify.data || !ajaxify.data.posts) {
            if (retry < 10) {
                setTimeout(() => showExistingSolvedPosts(retry + 1), 500);
            }
            return;
        }

        const topicOwnerId = ajaxify.data.uid;
        let allReady = true;

        ajaxify.data.posts.forEach(postData => {
            const pid = postData.pid;
            const postEl = $(`[component="post"][data-pid="${pid}"]`);
            if (!postEl.length) return;

            const postIndex = postEl.attr('data-index');
            if (postIndex === '0') return;

            const isSolved = postData.isSolved === 1 || postData.isSolved === '1';
            
            if (isSolved) {
                const upvoteBtn = postEl.find('[component="post/upvote"]');
                const isUpvotedByCurrentUser = upvoteBtn.hasClass('upvoted');
                const upvoteCount = parseInt(upvoteBtn.attr('data-upvotes') || 0);

                if (app.user && app.user.uid === topicOwnerId && isUpvotedByCurrentUser) {
                    addBadge(postEl);
                } else if (app.user && app.user.uid === topicOwnerId && !isUpvotedByCurrentUser) {
                    removeBadge(postEl);
                    unmarkAsSolved(pid);
                } else {
                    addBadge(postEl);
                }
            }
        });

        if (!allReady && retry < 10) {
            setTimeout(() => showExistingSolvedPosts(retry + 1), 500);
        }
    }
})();