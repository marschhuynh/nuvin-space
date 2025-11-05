# Code Style and Conventions: nuvin-cli

## TypeScript Configuration
- Target: ES2020
- Module system: ESNext with bundler resolution
- JSX: React JSX transform
- Strict mode: Disabled (for flexibility)
- Type checking: Relaxed (noImplicitAny: false, noUnusedLocals: false)

## Code Formatting (Biome.js)
- **Indentation**: 2 spaces
- **Line width**: 120 characters maximum
- **Quote style**: Single quotes for strings
- **Semicolons**: Automatic (JavaScript formatter)
- **File extensions**: Process .ts and .tsx files only

## Linting Rules
- Recommended rules enabled
- Suspicious rules: `noExplicitAny` set to error
- Organize imports: Disabled (assist actions)
- React prop-types validation: Off

## Component Patterns
- **React Components**: Functional components with hooks
- **State Management**: useState, useEffect, useCallback hooks
- **Event System**: Centralized EventBus for inter-component communication
- **Performance**: Static wrapper for performance-critical rendering

## File Organization
- **Exports**: Use `index.ts` files for clean exports in directories
- **File Naming**: PascalCase for components (e.g., ChatDisplay.tsx)
- **Hook Naming**: camelCase with `use` prefix (e.g., useKeyboardInput)
- **Service Classes**: PascalCase (e.g., OrchestratorManager)

## TypeScript Patterns
- **Type Definitions**: Centralized in `types.ts`
- **Interfaces**: Use for object shapes and component props
- **Utility Types**: Leverage built-in TypeScript utility types
- **Imports**: ES module syntax with explicit .js extensions in import statements

## Code Structure
- **Component Architecture**: Separation of concerns with dedicated components
- **Hook Logic**: Complex state logic encapsulated in custom hooks
- **Event Handling**: Declarative event system with cleanup
- **Performance**: Message clamping (MAX_RENDERED_LINES = 20)
- **Memory Management**: Proper cleanup in useEffect and abort controllers

## Documentation Style
- **Comments**: Minimal - code should be self-documenting
- **Type Names**: Descriptive and clear (e.g., MessageLine, ToolApprovalDecision)
- **Function Names**: Action-oriented (e.g., appendLine, handleError, handleSubmit)
- **Constant Names**: UPPER_SNAKE_CASE (e.g., MAX_RENDERED_LINES)

## Error Handling
- **Type Safety**: Error checking with instanceof Error
- **User Messages**: Graceful error display in UI
- **Async Operations**: Proper error boundaries and catch blocks
- **Cleanup**: Abort controllers and resource cleanup in useEffect