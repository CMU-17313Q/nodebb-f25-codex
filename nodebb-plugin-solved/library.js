'use strict';

const db = require.main.require('./src/database');

const plugin = {};

plugin.init = async function (params) {
  const { router, middleware } = params;

  console.log('[Solved Plugin] Initializing routes...');
  router.post('/solved/mark', middleware.ensureLoggedIn, async (req, res) => {
    try {
      const { pid, solved } = req.body;
      console.log('[Solved Plugin] Received solved mark for pid:', pid, '→', solved);
      await db.setObjectField(`post:${pid}`, 'isSolved', solved ? 1 : 0);
      res.json({ status: 'ok', pid, solved });
    } catch (err) {
      console.error('[Solved Plugin] Error saving solved flag:', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });
};

plugin.addSolvedField = async function (hookData) {
  if (!hookData?.posts?.length) return hookData;

  const keys = hookData.posts.map(p => `post:${p.pid}`);
  const solvedFlags = await db.getObjectsFields(keys, ['isSolved']);

  hookData.posts.forEach((post, i) => {
    post.isSolved = parseInt(solvedFlags[i]?.isSolved, 10) === 1 ? 1 : 0;
  });

  return hookData;
};

module.exports = plugin;
