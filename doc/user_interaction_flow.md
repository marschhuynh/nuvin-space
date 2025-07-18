# User Interaction Flow

This document describes how a message from the user travels through the system until a response is produced by an agent.

## 1. User Input

The chat interface is implemented in the `Messenger` component located at `src/screens/Dashboard/messenger.tsx`. The component renders a `ChatInput` field which captures user text and calls `handleSendMessage` when the message is submitted.

```tsx
// ChatInput sends the message
<ChatInput onSendMessage={handleSendMessage} ... />
```

## 2. Store Update

Inside `handleSendMessage` a `Message` object with role `user` is created and stored in the conversation via `useConversationStore.addMessage`.

```ts
const newMessage: Message = {
  id: generateUUID(),
  role: 'user',
  content,
  timestamp: new Date().toISOString(),
};
addMessage(activeConversationId, newMessage);
```

## 3. Calling the Agent Manager

`handleSendMessage` invokes the `sendMessage` function from the `useAgentManager` hook. This function forwards the text and streaming callbacks to the singleton `AgentManager` instance.

```ts
const response = await sendMessage(content, {
  conversationId: conversationId,
  stream: true,
  onChunk: (chunk) => { ... },
  onComplete: (finalContent) => { ... },
});
```

## 4. AgentManager Delegation

`AgentManager.sendMessage` (defined in `src/lib/agent-manager.ts`) checks the selected agent type and creates an instance of either `LocalAgent` or `A2AAgent`. Conversation history is passed so the agent can build context. The manager then calls `agentInstance.sendMessage`.

```ts
if (this.activeAgent.agentType === 'local') {
  this.agentInstance = new LocalAgent(this.activeAgent, this.activeProvider, this.conversationHistory);
} else {
  this.agentInstance = new A2AAgent(this.activeAgent, this.conversationHistory);
}
return await this.agentInstance.sendMessage(content, options);
```

## 5. LocalAgent Path

When using a local agent, `LocalAgent.sendMessage` converts the conversation into `ChatMessage[]` format and calls the selected LLM provider's API. If streaming is enabled, chunks are yielded via `onChunk` and accumulated until completion.

```ts
const stream = provider.generateCompletionStream({ ... });
for await (const chunk of stream) {
  accumulated += chunk;
  options.onChunk?.(chunk);
}
```

Once finished, the final assistant message is added to the conversation store and returned.

## 6. A2AAgent Path

For remote agents, `A2AAgent.sendMessage` sends the text via `a2aService` which implements the A2A protocol. If streaming is requested, events from the remote agent are processed and chunks forwarded to the UI. When a task completes the final message is stored similarly.

## 7. UI Update

Streaming chunks are displayed in real time by updating the `MessageList` with the current partial content. When `onComplete` fires, the final message replaces the streaming placeholder in the store.

## 8. Summary

The flow from user input to agent response can be summarised as:

```
User types message → ChatInput → handleSendMessage
    → useConversationStore.addMessage (user message)
    → useAgentManager.sendMessage
        → AgentManager
            ├── LocalAgent → Provider API (OpenAI, etc.)
            └── A2AAgent → a2aService → Remote Agent
    → Streaming chunks update MessageList
    → Final response stored in conversation
```

This process ensures a seamless chat experience with either local or remote agents.

