# Task Completion Checklist: nuvin-cli

## Required Commands After Task Completion

### 1. Build Verification
```bash
pnpm run build
```
- Ensure TypeScript compilation succeeds
- Check that dist/ directory is populated correctly
- Verify no build errors or warnings

### 2. Code Quality Checks
```bash
pnpm run lint
```
- Run Biome.js linting
- Fix any linting errors
- Ensure no rule violations

### 3. Code Formatting
```bash
pnpm run format
```
- Apply Biome.js formatting
- Check formatting with:
```bash
npx biome check .
```

### 4. Type Checking
```bash
npx tsc --noEmit
```
- Run TypeScript compiler without emitting files
- Ensure no type errors

### 5. Test Execution (if applicable)
```bash
npx ava
```
- Run test suite if tests exist
- Ensure all tests pass

## Manual Testing Checklist

### CLI Functionality
- [ ] CLI starts without errors
- [ ] Help text displays correctly: `node dist/cli.js --help`
- [ ] All command-line flags work as expected
- [ ] Providers can be switched correctly
- [ ] Model selection works

### UI Testing
- [ ] Terminal UI renders correctly
- [ ] All components display properly
- [ ] Keyboard shortcuts work (↑↓ for history, ESC for abort)
- [ ] Message display works correctly
- [ ] Input area accepts text properly

### AI Agent Testing
- [ ] AI provider connections work
- [ ] Messages can be sent and received
- [ ] Tool execution works (if applicable)
- [ ] Tool approval prompts work
- [ ] Error handling works correctly

### Persistence Testing
- [ ] Memory persistence works (with --mem-persist)
- [ ] History loading works (/history command)
- [ ] Session management works

## Performance Considerations
- [ ] Verify message clamping works (MAX_RENDERED_LINES = 20)
- [ ] Check for memory leaks in long-running sessions
- [ ] Ensure abort controllers properly clean up requests
- [ ] Verify event listeners are properly cleaned up

## Integration Testing
- [ ] MCP server connections work
- [ ] Event bus communication works
- [ ] All services initialize correctly
- [ ] Cleanup works on exit

## Pre-Commit Checklist
- [ ] All builds pass
- [ ] Linting passes
- [ ] Formatting applied
- [ ] Type checking passes
- [ ] Tests pass (if applicable)
- [ ] Manual testing completed
- [ ] Documentation updated (if needed)
- [ ] No console warnings or errors

## Common Issues to Check
- **Import paths**: Verify all imports use correct paths and extensions
- **Type errors**: Check TypeScript any usage and casting
- **Memory leaks**: Verify useEffect cleanup and abort controllers
- **Event listeners**: Ensure proper subscription/unsubscription
- **Component state**: Verify state updates don't cause infinite loops
- **Async operations**: Check proper error handling and cleanup

## Post-Task Commands
```bash
# Final build check
pnpm run build

# Final linting check
pnpm run lint

# Final formatting check
pnpm run format

# If all checks pass, ready for commit/PR
```