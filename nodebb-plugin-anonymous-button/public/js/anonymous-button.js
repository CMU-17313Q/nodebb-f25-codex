/* global $, require, app, socket */
'use strict';
console.log('[anonymous-button] client script loaded');

(function () {
    let isAnonymous = false;

    require(['hooks', 'api'], function (hooks, api) {
        
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

        hooks.on('filter:composer.submit', function (data) {
            console.log('[anonymous-button] filter:composer.submit - data before:', JSON.stringify(data));
            
            if (isAnonymous) {
                data.composerData = data.composerData || {};
                data.composerData.isAnonymous = 1;
                
                console.log('[anonymous-button] Added isAnonymous flag to composerData');
            }
            
            return data;
        });

        hooks.on('action:composer.submit', function (data) {
            
            if (isAnonymous) {
                if (data.composerData) {
                    data.composerData.isAnonymous = 1;
                }
                if (data.postData) {
                    data.postData.isAnonymous = 1;
                }
                console.log('[anonymous-button] Attached isAnonymous to composer data');
            }
        });

        function makePostAnonymous($post) {
            console.log('[anonymous-button] Making post anonymous in DOM');
            
            $post.find('[component="post/author"]').text('Anonymous');
            $post.find('[itemprop="author"]').text('Anonymous');
            $post.find('.username-field').text('Anonymous');
            $post.find('a[href^="/user/"]').text('Anonymous').attr('href', '#');
            
            $post.find('[component="user/picture"]').html('<i class="fa fa-user-secret fa-2x"></i>');
            $post.find('.avatar').html('<i class="fa fa-user-secret fa-2x"></i>');
            
            const $author = $post.find('[component="post/author"]').first();
            if ($author.length && !$author.next('.anon-badge').length) {
                $author.after(' <span class="anon-badge badge bg-secondary"><i class="fa fa-user-secret"></i></span>');
            }
        }

        hooks.on('action:posts.loaded', function (data) {
            
            if (data && data.posts) {
                data.posts.forEach(function (post) {
                    
                    if (post.isAnonymous === 1 || post.isAnonymous === true || post.isAnonymous === '1') {
                        const $post = $('[component="post"][data-pid="' + post.pid + '"]');
                        if ($post.length) {
                            makePostAnonymous($post);
                        }
                    }
                });
            }
        });

        hooks.on('action:posts.post-added', function (data) {
            
            if (data && data.post) {
                const post = data.post;
                

                if (post.isAnonymous === 1 || post.isAnonymous === true) {
                    const $post = $('[component="post"][data-pid="' + post.pid + '"]');
                    if ($post.length) {
                        makePostAnonymous($post);
                    }
                }
            }
        });

        hooks.on('action:topic.loaded', function (data) {
            
            $('[component="post"]').each(function () {
                const $post = $(this);
                const pid = $post.attr('data-pid');
                
                if (pid) {
                    socket.emit('posts.getPost', pid, function (err, postData) {
                        if (!err && postData && (postData.isAnonymous === 1 || postData.isAnonymous === true)) {
                            makePostAnonymous($post);
                        }
                    });
                }
            });
        });

        hooks.on('action:composer.submitted', function (data) {
            console.log('[anonymous-button] Post submitted:', data);
            
            if (data && data.data && data.data.pid) {
                const pid = data.data.pid;
                
                setTimeout(function () {
                    socket.emit('posts.getPost', pid, function (err, postData) {
                        if (err) {
                            console.error('[anonymous-button] Error fetching post:', err);
                            return;
                        }
                        
                        console.log('[anonymous-button] Post PID:', pid);
                        console.log('[anonymous-button] Full post data:', postData);
                        
                    });
                }, 500);
            }
            
            isAnonymous = false;
            $('#anon-toggle-floating').removeClass('btn-success').addClass('btn-secondary');
        });

        console.log('[anonymous-button] All hooks registered');
    });
})();