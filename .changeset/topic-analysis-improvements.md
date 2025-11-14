---
'@nuvin/nuvin-cli': minor
---

**New Features:**

- Topic analyzer now includes all previous user messages for better context analysis
- Conversation topics are automatically analyzed and updated after each user input
- `/history` command now displays conversation topics instead of last messages

**Improvements:**

- Enhanced topic analysis with full conversation history context
- Better topic extraction by analyzing only user messages (excluding assistant and tool messages)
- Session metadata now includes topic information for easier conversation identification
