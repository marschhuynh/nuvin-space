# Architecture Patterns: nuvin-cli

## Core Architecture

### Event-Driven Architecture
- **EventBus**: Centralized event system for decoupled communication
- **Event Types**: `ui:*`, `orchestrator:*`, `keyboard:*` namespaces
- **Pattern**: Publish-subscribe model for component communication

### Component Architecture
```
App (Main Orchestrator)
├── Header (Branding/Status)
├── ChatDisplay (Message Rendering)
├── InputArea (User Input)
├── Footer (System Info)
├── HistorySelection (Session Management)
└── ToolApprovalPrompt (Safety System)
```

### Hook-Based State Management
- **useOrchestrator**: AI agent lifecycle and state
- **useKeyboardInput**: Keyboard event handling
- **useSessionManagement**: History and persistence
- **useMessageQueue**: Message processing pipeline
- **useNotification**: User feedback system

### Service Layer Architecture
- **OrchestratorManager**: AI agent coordination
- **MCPServerManager**: MCP protocol server management
- **EventBus**: Event system implementation

## Key Design Patterns

### Observer Pattern
- EventBus implementation for reactive updates
- Components subscribe to events and update accordingly
- Decoupled communication between UI and business logic

### Strategy Pattern
- Multiple AI provider support (OpenRouter, GitHub, Zai, Echo)
- interchangeable provider implementations
- Runtime provider selection

### Command Pattern
- Slash command system (/clear, /history, /exit, /approval)
- Command handlers encapsulate specific actions
- Extensible command registration

### Factory Pattern
- User message payload preparation
- Tool approval decision handling
- Session history loading

### State Management Patterns
- **Local State**: useState for component-specific state
- **Shared State**: EventBus for cross-component communication
- **Persistent State**: Memory service for conversation history
- **Queue State**: Message queue for request management

## Performance Patterns

### Message Clamping
- MAX_RENDERED_LINES constant (20 lines)
- Prevents memory growth in long sessions
- Maintains responsive UI

### Static Rendering Optimization
- Ink Static wrapper for performance-critical components
- Reduces unnecessary re-renders
- Optimizes terminal display performance

### Resource Management
- AbortController for request cancellation
- Proper cleanup in useEffect
- Event listener management

## Data Flow Patterns

### User Input Flow
1. InputArea → EventBus → Keyboard handlers
2. Command processing or message preparation
3. OrchestratorManager → AI provider
4. Response processing → EventBus → UI updates

### Event Flow
```
User Input → Keyboard Event → EventBus
  → Command Handler → Service Layer
  → AI Provider → Response
  → EventBus → UI Components
```

### Message Processing Pipeline
1. User input validation
2. Message queue management (busy/processing states)
3. Orchestrator submission
4. Stream response handling
5. UI display updates

## Configuration Patterns

### CLI Configuration
- meow library for command-line parsing
- Environment variable fallbacks
- Runtime configuration options

### Provider Configuration
- Unified provider interface
- Provider-specific authentication
- Model selection abstraction

### Memory Configuration
- Persistent vs session-only memory
- Session directory management
- History loading/clearing

## Error Handling Patterns

### Graceful Degradation
- Fallback to echo provider on failure
- Error boundaries in UI components
- User-friendly error messages

### Recovery Patterns
- Abort controllers for request cancellation
- Retry logic where appropriate
- State cleanup on errors

### Validation Patterns
- Input validation before processing
- Type checking at runtime boundaries
- Configuration validation

## Testing Patterns

### Component Testing
- Ink Testing Library for React components
- Event simulation for user interactions
- State verification

### Integration Testing
- Service layer testing
- EventBus communication testing
- Provider mocking

### End-to-End Testing
- CLI command testing
- Full session workflows
- Error scenario testing