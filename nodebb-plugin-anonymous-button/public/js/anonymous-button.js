/* global $, require, app, socket */
'use strict';

(function () {
    let isAnonymous = false;

    require(['hooks', 'api'], function (hooks, api) {
        
        // the floating button
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
            });

            $('body').append($btn);
        }

        hooks.on('action:ajaxify.end', initButton);

        // check composer data before submission
        hooks.on('filter:composer.submit', function (data) {
            
            if (isAnonymous) {
                data.composerData = data.composerData || {};
                data.composerData.isAnonymous = 1;
                
            }
          
            return data;
        });

        // hooks to make sure the flag is passed through
        hooks.on('action:composer.submit', function (data) {
            
            if (isAnonymous) {
                if (data.composerData) {
                    data.composerData.isAnonymous = 1;
                }
                if (data.postData) {
                    data.postData.isAnonymous = 1;
                }
            }
        });

        // rendering anonymous posts
        function makePostAnonymous($post) {
            
            // replaces the entire author section with Anonymous
            $post.find('[component="post/author"]').each(function() {
                $(this).html('<div>Anonymous</div>');
            });
            
            $post.find('[itemprop="author"]').each(function() {
                $(this).html('<div>Anonymous</div>');
            });
            
            $post.find('.username-field').each(function() {
                $(this).html('<div>Anonymous</div>');
            });
            
            $post.find('a[href*="/user/"]').each(function() {
                const $link = $(this);
                if ($link.text().trim() !== 'Anonymous') {
                    $link.replaceWith('<div class="anonymous-user">Anonymous</div>');
                }
            });
            
            // replace icon with anon.png image
            $post.find('[component="user/picture"]').each(function() {
                $(this).html('<div class="anonymous-avatar"><img src="nodebb-plugin-anonymous-button/public/anon.jpg" alt="Anonymous" style="width:46px;height:46px;"></div>');
            });
            
            $post.find('.avatar').each(function() {
                $(this).replaceWith('<div class="anonymous-avatar"><img src="nodebb-plugin-anonymous-button/public/anon.jpg" alt="Anonymous" style="width:46px;height:46px;"></div>');
            });
            
            $post.find('img.avatar').each(function() {
                $(this).replaceWith('<div class="anonymous-avatar"><img src="nodebb-plugin-anonymous-button/public/anon.jpg" alt="Anonymous" style="width:46px;height:46px;"></div>');
            });
            
            // anonymous image 
            const $authorSection = $post.find('[component="post/author"]').first().parent();
            if ($authorSection.length && !$post.find('.anon-badge').length) {
                $authorSection.append('<div class="anon-badge"><span class="badge bg-secondary ms-1"><img src="nodebb-plugin-anonymous-button/public/anon.jpg" alt="Anonymous" style="width:20px;height:20px;vertical-align:middle;margin-right:4px;"> Anonymous</span></div>');
            }
            
            // mark the post as done
            $post.attr('data-anonymous-processed', 'true');
            
        }

        // check new posts being added
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
            
            // Also scan all posts on the page as backup
            $('[component="post"]').each(function() {
                const $post = $(this);
                const pid = $post.attr('data-pid');
                
                if (pid && data && data.posts) {
                    const post = data.posts.find(p => p.pid == pid);
                    if (post && (post.isAnonymous === 1 || post.isAnonymous === true || post.isAnonymous === '1')) {
                        makePostAnonymous($post);
                    }
                }
            });
        });

        // newly created posts immediately
        hooks.on('action:posts.post-added', function (data) {

            
            if (data && data.post) {
                const post = data.post;
                const pid = post.pid;

                
                // check if this was an anonymous post
                if (post.isAnonymous === 1 || post.isAnonymous === true || post.isAnonymous === '1') {
                    const $post = $('[component="post"][data-pid="' + pid + '"]');
                    if ($post.length) {
                        makePostAnonymous($post);
                    }
                }
            }
        });

        //  check on topic load
        hooks.on('action:topic.loaded', function (data) {
            
            // check if data has posts array with isAnonymous info
            if (data && data.posts) {
                data.posts.forEach(function(post) {
                    if (post.isAnonymous === 1 || post.isAnonymous === true || post.isAnonymous === '1') {
                        const $post = $('[component="post"][data-pid="' + post.pid + '"]');
                        if ($post.length) {
                            makePostAnonymous($post);
                        }
                    }
                });
            }
            
            $('[component="post"]').each(function () {
                const $post = $(this);
                const pid = $post.attr('data-pid');
                
                if (pid) {
                    socket.emit('posts.getPost', pid, function (err, postData) {
                        if (!err && postData && (postData.isAnonymous === 1 || postData.isAnonymous === true || postData.isAnonymous === '1')) {
                            makePostAnonymous($post);
                        }
                    });
                }
            });
        });

        // post is submitted,check that it was saved
        hooks.on('action:composer.submitted', function (data) {
            
            if (data && data.data && data.data.pid) {
                const pid = data.data.pid;
                
                // verify the post was saved with isAnonymous flag
                setTimeout(function () {
                    socket.emit('posts.getPost', pid, function (err, postData) {
                        if (err) {
                            return;
                        }                        
                    });
                }, 500);
            }
            
            // reset the anonymous mode
            isAnonymous = false;
            $('#anon-toggle-floating').removeClass('btn-success').addClass('btn-secondary');
        });

    });
})();