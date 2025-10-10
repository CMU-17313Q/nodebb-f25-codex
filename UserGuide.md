# Thread Summarizer Plugin – User Guide
Course: 17-313 Foundations of Software Engineering (Fall 2025)  
Author: Salwa Al-Kuwari

---

## 1. Overview

The Thread Summarizer plugin adds an automated summarization feature to NodeBB.  
It allows users to generate a short summary of a discussion thread using an AI model.  
This helps readers quickly understand the main ideas of long conversations without reading every post.

The plugin provides a REST API route at:

    /api/thread-summarizer/v2/:tid

---

## 2. Features Implemented

- New API route for summarizing topics.
- Integration with the OpenAI API (default model: gpt-4o-mini).
- Optional stub mode (TS_STUB=1) for offline testing.
- LRU cache with a 10-minute expiry to avoid repeated API calls.
- 30-second per-user cooldown to prevent spam.
- Permission checks using privileges.topics.can.
- Clear JSON responses for all outcomes.

---

## 3. How It Works

1. A “Summarize this topic” button appears in the topic tools menu.
2. When clicked, the server gathers up to 40 posts from that topic.
3. The content is formatted and sent to the OpenAI API.
4. The model returns 5–8 bullet points and a short TL;DR line.
5. The result is cached for later reuse.
6. If the same topic is summarized again soon, the cached summary is returned immediately.

---

## 4. Configuration

The plugin uses environment variables for configuration.

- **OPENAI_API_KEY** – your OpenAI API key (required for real summaries)  
- **OPENAI_MODEL** – model name, default is gpt-4o-mini  
- **TS_STUB** – set to 1 to enable stub mode for offline testing (default is 0)

Examples:

To test without an API key:
    export TS_STUB=1
    curl -sS "http://localhost:4570/api/thread-summarizer/v2/1" | jq

To run in real mode:
    export OPENAI_API_KEY="your-api-key"
    unset TS_STUB
    curl -sS "http://localhost:4570/api/thread-summarizer/v2/1" | jq

---

## 5. Automated Testing

Automated tests are located in the `test/` directory.  
They use Mocha, Supertest, and nyc for coverage measurement.

Main test files:

- `test/thread-summarizer.plugin.test.js` – checks basic route behavior, stub summaries, and error handling (400, 403, 429).
- `test/thread-summarizer.cache.test.js` – checks OpenAI integration, caching, and multi-user cooldown handling.

---

## 6. Running Tests

To lint and run tests:

    npm run lint
    npm test

After the tests finish, coverage reports are available in the `.nyc_cov/` folder, and a summary appears in the terminal.

Example current coverage:

- Statements: around 79%
- Functions: around 83%
- Lines: around 80%
- Branches: around 56%

---

## 7. Test Coverage and Justification

The test suite covers:

- Successful summarization (stub and real mode).
- Invalid topic IDs (400).
- Permission denied errors (403).
- Cooldown enforcement (429).
- Missing API key error (500).
- Caching across different users and requests.

These tests are sufficient because they cover all main control flows and failure cases, ensuring the feature behaves as expected under normal and edge conditions.

---

## 8. Repository Structure

Important files and directories:

- `nodebb-plugin-thread-summarizer/library.js` – main plugin logic and API route.
- `nodebb-plugin-thread-summarizer/package.json` – plugin dependencies and scripts.
- `test/` – all automated test files.
- `UserGuide.md` – this documentation.

---

## 9. Development Notes

- The plugin uses an in-memory LRU cache to store topic summaries temporarily.
- A cooldown mechanism prevents repeated summarization requests by the same user.
- In stub mode, summaries are faked so testing does not depend on API access.
- If the OpenAI key is missing, the plugin safely returns an error without crashing.

---

**AI Assistance Disclosure**

This feature was developed with  assistance from ChatGPT (OpenAI), since it was very complicated.
ChatGPT was used throughout the implementation, debugging, and testing of the Thread Summarizer plugin.  
All code and explanations were implimented, reviewed, modified, and verified by me (Salwa Al-Kuwari).
