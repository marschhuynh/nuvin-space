---
"@nuvin/nuvin-core": patch
---

Refactor HTTP transport layer and improve test coverage

**Transport Changes:**
- Unified `postJson` and `postStream` into single `post()` method
- Simplified transport interface from 3 methods to 2 (get, post)
- Updated BaseLLM to use unified post method for both streaming and non-streaming requests
- Updated all transport implementations (BaseBearerAuthTransport, GithubAuthTransport, FetchTransport)

**Test Improvements:**
- Enhanced test coverage with proper TypeScript type safety
- Fixed all test mocking to use proper vi.spyOn patterns instead of direct mock assignments
- Added proper beforeEach/afterEach cleanup in all test files
- Enabled typecheck in vitest configuration
- Updated test configuration: `vitest --typecheck` in package.json
- Fixed all type errors in test files
- Improved test isolation with proper mock setup and teardown

**Bug Fixes:**
- Increased retry count from 3 to 10 in AnthropicAISDKLLM for better reliability
- Fixed formatting inconsistencies across codebase
