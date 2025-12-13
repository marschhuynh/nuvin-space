---
"@nuvin/nuvin-cli": minor
"@nuvin/nuvin-core": minor
---

Major UI/UX improvements and tool system refactoring

### Tool Registry System
- Added centralized tool registry for managing tool metadata, display names, status strategies, parameter renderers, and collapse behavior
- Eliminates scattered tool name mapping and provides single source of truth
- Supports extensibility for new tools and consistent behavior across the application

### Enhanced Tool Approval Flow
- Integrated proper denied tool handling with visual feedback
- Added `isAwaitingApproval` state for better user experience
- Enhanced error categorization with `ErrorReason.Denied`
- Improved tool result event emission for denied operations

### Component Architecture Improvements  
- **BaseRenderer**: Created reusable base component for tool result rendering with configurable truncation modes
- **ParamLayout**: Extracted common layout logic for consistent parameter display styling
- **Constants Centralization**: Added `LAYOUT` and `TRUNCATION` constants for uniform spacing and content limits

### UI/UX Enhancements
- Refined message spacing and visual hierarchy
- Improved truncation behavior for different content types (head vs tail modes)
- Better visual distinction between tool execution states
- Consistent border styling and layout across all tool displays

### Core Functionality
- Added streaming support for sub-agent task delegation
- Made `max_tokens` parameter conditional in LLM API calls for efficiency
- Enhanced agent template configuration with streaming options

### Code Quality
- Eliminated code duplication across parameter renderers
- Improved TypeScript interfaces and type safety
- Better component composition and reusability
- Enhanced maintainability through centralized configuration