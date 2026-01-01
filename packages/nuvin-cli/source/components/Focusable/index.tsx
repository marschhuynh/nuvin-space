import type React from 'react';
import { useFocus } from '@/contexts/InputContext/FocusContext.js';

interface FocusableProps {
  children: (context: { isFocused: boolean }) => React.ReactNode;
  autoFocus?: boolean;
}

export const Focusable: React.FC<FocusableProps> = ({ children, autoFocus }) => {
  const { isFocused } = useFocus({ active: true, autoFocus });
  return <>{children({ isFocused })}</>;
};

export default Focusable;
