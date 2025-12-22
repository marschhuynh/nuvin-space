import type React from 'react';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useStdin, useStdout } from 'ink';
import { InputContext } from './InputContext.js';
import { parseKeypress, setKittyProtocolEnabled } from './parseKeypress.js';
import type { Subscriber, InputMiddleware, InputContextValue, InputHandler, UseInputOptions, Key } from './types.js';

// Kitty keyboard protocol escape codes
// CSI > flags u - push keyboard mode
// CSI < u - pop keyboard mode
// Flag 0b1 (1) = Disambiguate escape codes (fixes Shift+Enter, etc.)
const KITTY_KEYBOARD_ENABLE = '\x1b[>1u';
const KITTY_KEYBOARD_DISABLE = '\x1b[<u';

// Detect terminals that support Kitty keyboard protocol
function supportsKittyProtocol(): boolean {
  const term = process.env.TERM || '';
  const termProgram = process.env.TERM_PROGRAM || '';

  // Direct Kitty detection
  if (term === 'xterm-kitty' || process.env.KITTY_WINDOW_ID) {
    return true;
  }

  // Other terminals known to support Kitty protocol
  // See: https://sw.kovidgoyal.net/kitty/keyboard-protocol/
  const supportedTerminals = ['kitty', 'ghostty', 'WezTerm', 'foot', 'rio'];

  if (supportedTerminals.some((t) => termProgram.toLowerCase().includes(t.toLowerCase()))) {
    return true;
  }

  // Check KITTY_* env vars
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('KITTY_')) {
      return true;
    }
  }

  return false;
}

type Props = {
  children: React.ReactNode;
  middleware?: InputMiddleware[];
  enableKittyProtocol?: boolean | 'auto';
};

export const InputProvider: React.FC<Props> = ({
  children,
  middleware: initialMiddleware = [],
  enableKittyProtocol = 'auto',
}) => {
  const {
    stdin: _stdin,
    setRawMode,
    isRawModeSupported,
    internal_eventEmitter,
  } = useStdin() as ReturnType<typeof useStdin> & { internal_eventEmitter: import('node:events').EventEmitter };

  const { stdout } = useStdout();

  const subscribersRef = useRef<Map<string, Subscriber>>(new Map());
  const middlewareRef = useRef<InputMiddleware[]>(initialMiddleware);
  const idCounterRef = useRef(0);
  const rawModeEnabledRef = useRef(false);
  const kittyProtocolEnabledRef = useRef(false);

  useEffect(() => {
    middlewareRef.current = initialMiddleware;
  }, [initialMiddleware]);

  // Enable Kitty keyboard protocol on mount
  useEffect(() => {
    const shouldEnable = enableKittyProtocol === true || (enableKittyProtocol === 'auto' && supportsKittyProtocol());

    if (shouldEnable && stdout && !kittyProtocolEnabledRef.current) {
      stdout.write(KITTY_KEYBOARD_ENABLE);
      kittyProtocolEnabledRef.current = true;
      setKittyProtocolEnabled(true);
    }

    return () => {
      if (kittyProtocolEnabledRef.current && stdout) {
        stdout.write(KITTY_KEYBOARD_DISABLE);
        kittyProtocolEnabledRef.current = false;
        setKittyProtocolEnabled(false);
      }
    };
  }, [enableKittyProtocol, stdout]);

  const subscribe = useCallback(
    (handler: InputHandler, options: UseInputOptions = {}) => {
      const id = `input_sub_${++idCounterRef.current}`;
      const subscriber: Subscriber = {
        id,
        handler,
        priority: options.priority ?? 0,
        isActive: options.isActive ?? true,
      };

      subscribersRef.current.set(id, subscriber);

      if (isRawModeSupported && !rawModeEnabledRef.current) {
        setRawMode(true);
        rawModeEnabledRef.current = true;
      }

      return () => {
        subscribersRef.current.delete(id);

        if (subscribersRef.current.size === 0 && rawModeEnabledRef.current) {
          setRawMode(false);
          rawModeEnabledRef.current = false;
        }
      };
    },
    [isRawModeSupported, setRawMode],
  );

  const updateSubscriber = useCallback((id: string, options: Partial<UseInputOptions>) => {
    const subscriber = subscribersRef.current.get(id);
    if (subscriber) {
      if (options.isActive !== undefined) {
        subscriber.isActive = options.isActive;
      }
      if (options.priority !== undefined) {
        subscriber.priority = options.priority;
      }
    }
  }, []);

  const addMiddleware = useCallback((middleware: InputMiddleware) => {
    middlewareRef.current.push(middleware);
    return () => {
      const index = middlewareRef.current.indexOf(middleware);
      if (index !== -1) {
        middlewareRef.current.splice(index, 1);
      }
    };
  }, []);

  const distributeInput = useCallback((input: string, key: Key) => {
    const sortedSubscribers = Array.from(subscribersRef.current.values())
      .filter((s) => s.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const subscriber of sortedSubscribers) {
      const result = subscriber.handler(input, key);
      if (result === true) break;
    }
  }, []);

  useEffect(() => {
    if (!internal_eventEmitter) return;

    const handleInput = (data: string) => {
      const { input, key } = parseKeypress(data);

      const middleware = middlewareRef.current;
      let index = 0;

      const next = () => {
        if (index < middleware.length) {
          const currentMiddleware = middleware[index];
          index++;
          currentMiddleware?.(input, key, next);
        } else {
          distributeInput(input, key);
        }
      };

      next();
    };

    internal_eventEmitter.on('input', handleInput);

    return () => {
      internal_eventEmitter.off('input', handleInput);
    };
  }, [internal_eventEmitter, distributeInput]);

  const contextValue: InputContextValue = useMemo(
    () => ({
      subscribe,
      updateSubscriber,
      addMiddleware,
      setRawMode,
      isRawModeSupported,
    }),
    [subscribe, updateSubscriber, addMiddleware, setRawMode, isRawModeSupported],
  );

  return <InputContext.Provider value={contextValue}>{children}</InputContext.Provider>;
};
