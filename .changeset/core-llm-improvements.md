---
"@nuvin/nuvin-core": minor
"@nuvin/nuvin-cli": minor
---

feat: Enhance LLM streaming and Github provider

- **Core**: Improved `BaseLLM` streaming handling to support unknown fields (e.g. reasoning metadata) dynamically.
- **Core**: Better tool call merging and usage tracking in streaming responses.
- **GitHub Provider**: Updates to GitHub transport and model definitions.
- **CLI**: Updated LLM factory and orchestrator to leverage new core capabilities.
