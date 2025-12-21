# CLI App Virtualized Refactor Plan

## Current Issues

1. **Static + Dynamic mixing** - `ChatDisplay` uses ink's `<Static>` component which permanently renders content above dynamic content. When dynamic content height changes (menu opens/closes), visual artifacts occur.

2. **Layout shifting** - The `<Spacer />` between ChatDisplay and InteractionArea causes layout to shift when InteractionArea height changes.

3. **Menu clipping** - Absolute positioned menu gets clipped by parent `overflow: hidden`.

## Current Architecture

```
┌─────────────────────────────────────────┐
│ <Static> - Permanent output             │ ← Written once, stays forever
│   - Logo/Welcome                        │
│   - Old messages (staticCount)          │
├─────────────────────────────────────────┤
│ Dynamic messages (visible)              │ ← Re-rendered each frame
│                                         │
│ <Spacer /> ← Pushes content down        │
│                                         │
│ <InteractionArea>                       │ ← Height changes with menu
│   - Command menu (when open)            │
│   - Input line                          │
│ </InteractionArea>                      │
│                                         │
│ <Footer />                              │
└─────────────────────────────────────────┘
```

## Proposed Architecture

```
┌─────────────────────────────────────────┐
│ <FixedLayout>                           │
│   header: null (or optional header)     │
│   headerHeight: 0                       │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ <VirtualizedChat>               │   │ ← Fixed height = total - footer
│   │   - Welcome/Logo (first item)   │   │
│   │   - All messages (virtualized)  │   │
│   │   - Auto-scroll to bottom       │   │
│   └─────────────────────────────────┘   │
│                                         │
│   footer: <BottomSection />             │
│   footerHeight: inputHeight + 3         │
│   ┌─────────────────────────────────┐   │
│   │ <CommandMenu /> (if open)       │   │ ← Part of footer, fixed height
│   │ <InputArea />                   │   │
│   │ <Footer />                      │   │
│   └─────────────────────────────────┘   │
│                                         │
│ </FixedLayout>                          │
└─────────────────────────────────────────┘
```

## Key Changes

### 1. Remove `<Static>` Component Usage

**Why:** Static component causes the mixing problem. All content should be dynamic but virtualized.

**File:** `packages/nuvin-cli/source/components/ChatDisplay.tsx`

**Change:** Replace Static-based rendering with VirtualizedList.

### 2. Create `VirtualizedChat` Component

**File:** `packages/nuvin-cli/source/components/VirtualizedChat.tsx`

```tsx
type VirtualizedChatProps = {
  messages: MessageLine[];
  height: number;
  welcomeContent?: ReactNode;
  onScrollChange?: (isAtBottom: boolean) => void;
};
```

**Features:**
- Virtualized rendering of messages
- Welcome/logo as first item
- Auto-scroll to bottom on new messages
- Manual scroll detection (stop auto-scroll when user scrolls up)

### 3. Create `BottomSection` Component

**File:** `packages/nuvin-cli/source/components/BottomSection.tsx`

```tsx
type BottomSectionProps = {
  showMenu: boolean;
  menuHeight: number;
  inputAreaRef: RefObject<InputAreaHandle>;
  // ... other props passed to InputArea and Footer
};
```

**Features:**
- Fixed height container
- Menu renders within fixed space (not as overlay)
- Input and Footer always visible

### 4. Refactor `app.tsx` Layout

**File:** `packages/nuvin-cli/source/app.tsx`

```tsx
const footerHeight = 3; // Footer base height
const inputHeight = 1;  // Input line
const menuHeight = showCommandMenu ? 6 : 0;
const bottomSectionHeight = footerHeight + inputHeight + menuHeight;

return (
  <FixedLayout
    width={cols}
    height={rows}
    footer={<BottomSection ... />}
    footerHeight={bottomSectionHeight}
  >
    <VirtualizedChat
      messages={messages}
      height={rows - bottomSectionHeight}
      welcomeContent={<WelcomeLogo sessions={sessions} />}
    />
  </FixedLayout>
);
```

### 5. Message Height Calculation

**Challenge:** Messages have variable heights (code blocks, multi-line text, etc.)

**Solution:** Create height estimation function:

```tsx
function estimateMessageHeight(message: MessageLine, width: number): number {
  // Base height
  let height = 1;
  
  // Account for content wrapping
  const contentLength = message.content?.length || 0;
  height += Math.ceil(contentLength / (width - 4)); // padding
  
  // Account for code blocks, tool results, etc.
  if (message.type === 'tool') {
    height += 2; // borders
  }
  
  return Math.max(1, height);
}
```

**Alternative:** Fixed height per message type (simpler, less accurate):
- user: 2 lines
- assistant: dynamic based on content
- tool: 3 lines
- tool_result: 4 lines

### 6. State Management for Menu

**Current:** Menu state is inside InputArea, causes height change.

**New:** Lift menu state to app level, pass to BottomSection.

```tsx
// app.tsx
const [showCommandMenu, setShowCommandMenu] = useState(false);
const menuHeight = showCommandMenu ? 6 : 0;
```

## Implementation Order

### Phase 1: Create New Components (without changing existing)

1. [ ] Create `VirtualizedChat` component
2. [ ] Create `BottomSection` component  
3. [ ] Create message height estimation utility

### Phase 2: Integrate with App

4. [ ] Lift menu state to app.tsx
5. [ ] Update app.tsx to use FixedLayout
6. [ ] Replace ChatDisplay with VirtualizedChat
7. [ ] Replace InteractionArea + Footer with BottomSection

### Phase 3: Cleanup

8. [ ] Remove old ChatDisplay (or keep as fallback)
9. [ ] Remove Static component usage
10. [ ] Test and fix edge cases

## File Changes Summary

| File | Action |
|------|--------|
| `components/VirtualizedChat.tsx` | **New** - Virtualized message list |
| `components/BottomSection.tsx` | **New** - Fixed bottom container |
| `utils/messageHeight.ts` | **New** - Height estimation |
| `app.tsx` | **Modify** - Use FixedLayout |
| `components/ChatDisplay.tsx` | **Keep/Deprecate** - May keep for comparison |
| `components/InputArea.tsx` | **Modify** - Expose menu state |
| `components/InteractionArea.tsx` | **Modify** - Simplify or merge into BottomSection |

## Risk Mitigation

1. **Performance** - Virtualization may have overhead. Profile with large message lists.

2. **Height accuracy** - Inaccurate height estimation causes visual glitches. May need to measure actual rendered height.

3. **Scroll behavior** - Auto-scroll logic must handle edge cases (user scrolling, new messages, resize).

4. **Backwards compatibility** - Keep old implementation behind feature flag initially.

## Testing Checklist

- [ ] New messages appear at bottom
- [ ] Auto-scroll works when at bottom
- [ ] Manual scroll up stops auto-scroll
- [ ] Menu opens/closes without layout shift
- [ ] Resize terminal works correctly
- [ ] Long messages wrap properly
- [ ] Code blocks render correctly
- [ ] Tool calls/results display properly
- [ ] Welcome screen shows on start
- [ ] Performance with 1000+ messages
