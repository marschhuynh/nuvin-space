import { createContext } from 'react';
import type { InputContextValue } from './types.js';

const noop = () => () => {};

export const InputContext = createContext<InputContextValue>({
  subscribe: noop,
  updateSubscriber: () => {},
  addMiddleware: noop,
  setRawMode: () => {},
  isRawModeSupported: false,
});

InputContext.displayName = 'InputContext';
