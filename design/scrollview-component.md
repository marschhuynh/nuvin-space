# ScrollView Component Design

## Overview
A scrollable text view component for Ink that displays text content with arrow key navigation.

## Props
```typescript
type ScrollViewProps = {
  children: string;           // Text content to display
  maxHeight?: number;         // Visible lines (default: 5)
  focus?: boolean;            // Manual focus control (Option 1 pattern)
  showScrollIndicators?: boolean; // Show ▲/▼ indicators (default: true)
};
```

## Implementation Plan

### 1. Create ScrollView Component
- Location: `packages/nuvin-cli/source/components/ScrollView/ScrollView.tsx`
- Use `useInput` with `{ isActive: focus }` for keyboard handling
- Split content by newlines, track `scrollOffset` state
- Display visible window using slice

### 2. Keyboard Navigation
- `↑` or `k`: Scroll up (decrement offset)
- `↓` or `j`: Scroll down (increment offset)
- Clamp offset between 0 and `maxOffset` (totalLines - maxHeight)

### 3. Focus State Styling
- `focus={true}`: Normal text color
- `focus={false}`: `dimColor` text

### 4. Scroll Indicators
- Top: `▲ N more` when `scrollOffset > 0`
- Bottom: `▼ N more` when content below viewport

### 5. Export
- Add to `packages/nuvin-cli/source/components/index.ts`

## Usage Example
```tsx
const [focusedComponent, setFocusedComponent] = useState<'input' | 'scroll'>('input');

<ScrollView focus={focusedComponent === 'scroll'} maxHeight={10}>
  {longTextContent}
</ScrollView>
<InputArea focus={focusedComponent === 'input'} />
```

## Dependencies
- `truncateLines` from `@/utils/index.js` (optional, for content prep)
- Ink: `Box`, `Text`, `useInput`
