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

---


# Notifications Pop Up Plugin – User Guide
Course: 17-313 Foundations of Software Engineering (Fall 2025)  
Author: Moza Al Fahad 

---

## 1. Overview

The Notifications Pop Up plugin displays the unread notifications for the user when they first sign in. It gets automatically updated when new notifications arrive. From the pop up which first appears after login, the users have the choice to open the notification or mark all notifications as read. When the user chooses to read the notification, the page redirects them to the notification. 

---

## 2. Features Implemented

- A pop up modal automatically appears when a user logs in and has unread notifications.
- Uses NodeBB’s built-in WebSockets to update the modal instantly when a new notification arrives.
- Users can mark individual notifications or mark all as read directly from the pop-up.
- Simple UI designed to fit within NodeBB’s theme layout for clarity and accessibility.
- Implemented with a single JS file (unread-pop-lite.js) registered as a NodeBB client script.

---

## 3. How It Works

1. When a user logs in, the plugin checks for any unread notifications.
2. If unread notifications exist, a pop-up modal is dynamically created and displayed.
3. Each notification includes a short preview and a link to the related post/topic.
4. Users can:
    - Click on a notification to open it, which automatically marks it as read.
    - Click “Mark All as Read” to clear all unread notifications.
5. Real-time updates are handled through NodeBB socket events, ensuring new notifications appear immediately without page refreshes.
6. If no unread notifications exist, the modal does not appear.

---

## 5. Automated Testing & Running Tests

Main test file:
- Located in test/unread-pop-lite.spec.js

To lint and run tests:
    npm run lint
    npm run test:popup
All tests should pass. 

---

## 6. Front-end Testing

1. Log into NodeBB with a test account.  
2. Trigger a notification (e.g., mention the test account from another user).  
3. Verify that:  
   - On login, a popup appears listing unread notifications.  
   - Clicking a notification opens the linked post and removes it from the list.  
   - Clicking “Mark all read” clears the list

---

## 10. Author and Acknowledgement

Author: Moza Al Fahad   
Course: 17-313 Foundations of Software Engineering (Fall 2025)  
Institution: Carnegie Mellon University in Qatar  

This plugin was developed at Sprint 1 and automated test suite was developed in Sprint 2, focusing on automated testing and user documentation for software features.

---

**AI Assistance Disclosure**

This feature was developed with  assistance from ChatGPT (OpenAI). It was used for debugging, generating automated tests, and implementing the pop up feature.  
All code and explanations were implimented, reviewed, modified, and verified by me (Moza Al Fahad).


---

# Thread Anonymous Plugin – User Guide
Course: 17-313 Foundations of Software Engineering (Fall 2025)  
Author: Raghd Al-Khalifa & Lujain Al-Mulaifi
---

## 1. Overview

The Anonymous Button plugin displays an anonymous button for the user when they open up NodeBB. When clicking you toggle it on/off, it highlights green if its on/gray if off. When the feature is clicked, every post the user makes shows up as Anonymous. Hiding their name and pfp. 

---

## 2. Features Implemented

- A button automatically appears when a user opens NodeBB.
- Uses a new field with posts, that handles cases where user is anonymous. 
- Users can click and toggle on/off
- Implemented with a plugin folder nodebb-plugin-anonymous-button with its respective JS files inside.

---

## 3. How It Works

1. When a user opens nodebb, there is a floating button in the corner.
2. If the user clicks it, it turns on isAnonymous (highlighted green)
3. If its toggled green, any post that the user makes will be masked with Anonymous.
4. To toggle it off, they click the button again.

---

## 5. Automated Testing & Running Tests

Main test file:
- Located in test/anonymous-button.test.js

To lint and run tests:
    npm run lint
    npm run test:anonymous-button
All tests should pass. 

---

## 6. Front-end Testing

1. Log into NodeBB with an account.  
2. Turn on the anon button at the bottom 
3. Verify that:  
   - If Anon is green, all posts made during that is masked as Anonymous
   - If Anon is gray, all posts that are made show the user as it is not anonymous.

---

## 10. Author and Acknowledgement

Author: Raghd Al-Khalifa & Lujain Al Mulaifi  
Course: 17-313 Foundations of Software Engineering (Fall 2025)  
Institution: Carnegie Mellon University in Qatar  

This plugin was developed at Sprint 1 and automated test suite was developed in Sprint 2, focusing on automated testing and user documentation for software features.

---

**AI Assistance Disclosure**

This feature was developed with  assistance from ChatGPT (OpenAI). It was used for debugging, generating automated tests, and implementing the pop up feature.  
All code and explanations were implimented, reviewed, modified, and verified by me (Raghd Al-Khalifa & Lujain Al-Mulaifi).


---

# Thread Mark as Solved Plugin – User Guide
Course: 17-313 Foundations of Software Engineering (Fall 2025)  
Author: Raghd Al-Khalifa 

---

## 1. Overview

The Mark as Solved plugin displays a banner and green highlight that says it was upvoted by the original owner of the post. It means that the author found the response as helpful. If it was unvoted, the banner would be removed. 

---

## 2. Features Implemented

- A banner that automatically appears if a original post owner upvotes a reply.
- Uses sockets and a brand new plugin to display it, without modifiying existing posts.
- Original topic owners can upvote it to have the banner to show.
- Simple and clear banner that highlights the response in a good UI design.
- Implemented with a plugin folder that has a js file that handles this.

---

## 3. How It Works

1. When a topic owner upvotes, it shows a banner that highlights the reply saying it was found helpful/solved. 
2. When the topic owner removes the upvote, it goes away
3. The badge stays even if the page is refreshed, and shows for everyone

---

## 5. Automated Testing & Running Tests

Main test file:
- Located in test/solved-plugin.test.js

To lint and run tests:
    npm run lint
    npm run test:solved-plugin
All tests should pass. 

---

## 6. Front-end Testing

1. Log into NodeBB with a test account.
2. Log into it with another
3. Make a topic post
4. Reply to it from another account
5. Back to the main account (topic owner) upvote the reply
6. Verify that:  
   - A green badge/highlight shows over the answer saying it was marked as helpful
   - Refresh and ensures it stays there
   - If upvotes, ensure it goes away.

---

## 10. Author and Acknowledgement

Author: Raghd Al-Khalifa
Course: 17-313 Foundations of Software Engineering (Fall 2025)  
Institution: Carnegie Mellon University in Qatar  

This plugin was developed at Sprint 2 and automated test suite was developed in Sprint 2.

---

**AI Assistance Disclosure**

This feature was developed with assistance from ChatGPT (OpenAI). It was used for debugging, generating automated tests, and implementing the pop up feature.  
All code and explanations were implimented, reviewed, modified, and verified byRaghd Al-Khalifa.


---







