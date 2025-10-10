'use strict';

const { LRUCache } = require('lru-cache');
const cache = new LRUCache({ max: 200, ttl: 1000 * 60 * 10 }); // 10 minutes
const STUB = process.env.TS_STUB === '1';

let topics, privileges, posts;

const COOLDOWN_MS = 30 * 1000;
const lastCall = new Map();

async function init(params) {
  const { router } = params;

  topics = require.main.require('./src/topics');
  privileges = require.main.require('./src/privileges');
  posts = require.main.require('./src/posts');

  const ENV = {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  };

  router.get('/api/thread-summarizer/v2/:tid', async (req, res) => {
    try {
      const uid = req.user?.uid || 0;
      const tid = parseInt(req.params.tid, 10);
      if (!Number.isFinite(tid) || tid <= 0) {
        return res.status(400).json({ error: 'Bad topic id' });
      }

      // permissions
      const canRead = await privileges.topics.can('read', tid, uid);
      if (!canRead) {
        return res.status(403).json({ error: 'No permission to read this topic.' });
      }

      // cooldown
      const key = `${uid}:${tid}`;
      const now = Date.now();
      const prev = lastCall.get(key) || 0;
      if (now - prev < COOLDOWN_MS) {
        const secs = Math.ceil((COOLDOWN_MS - (now - prev)) / 1000);
        return res.status(429).json({ error: `Please wait ${secs}s before summarizing again.` });
      }
      lastCall.set(key, now);

      // cache
      const cacheKey = `sum:${tid}:${ENV.model}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.json({ tid, summary: cached.summary, postCount: cached.postCount, cached: true });
      }

      // stub mode
      if (STUB) {
        const fake = `• Stub summary for topic ${tid}\n• postCount=(skipped)\nTL;DR: route & perms OK.`;
        return res.json({ tid, summary: fake, postCount: null, cached: false, stub: true });
      }

      // load posts (RAW, unparsed)
      const MAX_POSTS = 40;
      const pids = await topics.getPids(tid, 0, MAX_POSTS - 1);
      if (!pids || pids.length === 0) {
        return res.json({ tid, summary: '(No content to summarize.)', postCount: 0 });
      }

      const postList = await posts.getPostsByPids(pids, uid, { parse: false });
      const postCount = postList?.length || 0;
      if (!postCount) {
        return res.json({ tid, summary: '(No content to summarize.)', postCount: 0 });
      }

      // build thread text
      const threadText = postList.map(p => {
        const author = p.username || p.user?.username || (p.uid != null ? `uid:${p.uid}` : 'anonymous');
        const content = String(p.content || '').replace(/\s+/g, ' ').trim();
        return `@${author}: ${content}`.slice(0, 1200);
      }).join('\n');

      // call LLM
      const prompt = buildPrompt(threadText);
      if (!ENV.apiKey) {
        return res.status(500).json({ error: 'Summarization failed.', detail: 'Missing OPENAI_API_KEY' });
      }
      const summary = await callOpenAI({ apiKey: ENV.apiKey, model: ENV.model, prompt });

      const clipped = summary.trim().slice(0, 4000);
      cache.set(cacheKey, { summary: clipped, postCount });

      res.json({ tid, summary: clipped, postCount, cached: false });
    } catch (err) {
      console.error('[thread-summarizer] error', err);
      res.status(500).json({ error: 'Summarization failed.', detail: String(err?.message || err) });
    }
  });
}

function addThreadTool(data) {
  data.tools = data.tools || [];
  data.tools.push({
    class: 'thread-summarizer',
    title: 'Summarize this topic',
    icon: 'fa fa-align-left',
    onClick: 'window.app.require("forum/summarizer").summarizeCurrentTopic',
  });
  return data;
}

function buildPrompt(text) {
  return `Summarize the following forum thread as:
- 5–8 bullet points capturing the key ideas
- One-line TL;DR at the end prefixed with "TL;DR:"
Be neutral and faithful to the content. Do not invent facts.

THREAD:
${text}
---
Now produce the summary.`;
}

async function callOpenAI({ apiKey, model, prompt }) {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey });

  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a concise, faithful summarizer.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
  });

  const text = resp.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty completion from model');
  return text;
}

exports.init = init;
exports.addThreadTool = addThreadTool;
