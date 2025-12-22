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

export type InputHandler = (input: string, key: Key) => void | boolean;

export type InputMiddleware = (input: string, key: Key, next: () => void) => void;

export type Subscriber = {
  id: string;
  handler: InputHandler;
  priority: number;
  isActive: boolean;
};

export type UseInputOptions = {
  isActive?: boolean;
  priority?: number;
};

export type InputContextValue = {
  subscribe: (handler: InputHandler, options?: UseInputOptions) => () => void;
  updateSubscriber: (id: string, options: Partial<UseInputOptions>) => void;
  addMiddleware: (middleware: InputMiddleware) => () => void;
  setRawMode: (value: boolean) => void;
  isRawModeSupported: boolean;
};
