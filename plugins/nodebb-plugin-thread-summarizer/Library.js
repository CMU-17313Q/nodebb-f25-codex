'use strict';

const routesHelpers = require.main.require('./src/routes/helpers');
const topics = require.main.require('./src/topics');
const meta = require.main.require('./src/meta');

const Summarizer = {};

Summarizer.init = async function (params) {
  const { router, middleware /*, controllers*/ } = params;

  // ACP menu entry (optional — you can add settings later)
  routesHelpers.setupAdminPageRoute(router, '/admin/plugins/summarizer', (req, res) => {
    res.render('admin/plugins/summarizer', {});
  });

  // Public API route to get a summary for a topic
  router.get('/api/summarize/topic/:tid', middleware.authenticate, async (req, res) => {
    try {
      const tid = req.params.tid;
      const data = await topics.getTopicWithPosts({ tid, uid: req.uid, posts: { perPage: 50, page: 1 } });
      const text = (data.posts || [])
        .map(p => (p && p.content) ? p.content.replace(/<[^>]+>/g, '') : '')
        .join(' ');
      const summary = naiveSummary(text);
      res.json({ summary });
    } catch (err) {
      res.status(500).json({ error: err.message || String(err) });
    }
  });
};

Summarizer.initApi = async function () {
  // (Not strictly needed for this simple route, but handy if you add more API later)
};

Summarizer.injectButton = async function (hookData) {
  // Add a button into topic tool area
  hookData.templateData = hookData.templateData || {};
  hookData.templateData.summarizer = { enabled: true };
  return hookData;
};

// very naive extractive summary: take first ~3 sentences up to ~400 chars
function naiveSummary(text) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'No content to summarize.';
  const sentences = cleaned.split(/(?<=[.?!])\s+/).slice(0, 5);
  const joined = sentences.join(' ');
  return joined.length > 400 ? joined.slice(0, 400) + '…' : joined;
}

module.exports = Summarizer;
