export type Key = {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  pageDown: boolean;
  pageUp: boolean;
  return: boolean;
  escape: boolean;
  ctrl: boolean;
  shift: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  meta: boolean;
};

export type MouseEventType = 'click' | 'wheel-up' | 'wheel-down' | 'release' | 'drag' | 'move';

export type MouseEvent = {
  type: MouseEventType;
  button: number;
  x: number;
  y: number;
  count?: number;
};

export type InputHandler = (input: string, key: Key) => void | boolean;

export type MouseHandler = (event: MouseEvent) => void | boolean;

export type InputMiddleware = (input: string, key: Key, next: () => void) => void;

export type Subscriber = {
  id: string;
  handler: InputHandler;
  priority: number;
  isActive: boolean;
};

export type MouseSubscriber = {
  id: string;
  handler: MouseHandler;
  priority: number;
  isActive: boolean;
};

export type UseInputOptions = {
  isActive?: boolean;
  priority?: number;
};

export type UseMouseOptions = {
  isActive?: boolean;
  priority?: number;
};

export type InputContextValue = {
  subscribe: (handler: InputHandler, options?: UseInputOptions) => () => void;
  subscribeMouse: (handler: MouseHandler, options?: UseMouseOptions) => () => void;
  updateSubscriber: (id: string, options: Partial<UseInputOptions>) => void;
  addMiddleware: (middleware: InputMiddleware) => () => void;
  setRawMode: (value: boolean) => void;
  isRawModeSupported: boolean;
  enableMouseMode: () => void;
  disableMouseMode: () => void;
  isMouseModeEnabled: boolean;
};
