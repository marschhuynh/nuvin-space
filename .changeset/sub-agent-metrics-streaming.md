---
"@nuvin/nuvin-cli": minor
"@nuvin/nuvin-core": minor
---

feat: stream sub-agent metrics to UI in real-time

- Add `SubAgentMetrics` event type to stream metrics during sub-agent execution
- Create metrics port in AgentManager to emit live metrics (llmCallCount, totalTokens, totalCost)
- Handle `SubAgentMetrics` event in CLI eventProcessor to update SubAgentState
- Display live metrics in SubAgentActivity during "Working..." state
- Show final metrics in ToolResultView when sub-agent completes (calls, tokens, cost, duration)
- Increase default maxTokens for sub-agents from 4000 to 64000
