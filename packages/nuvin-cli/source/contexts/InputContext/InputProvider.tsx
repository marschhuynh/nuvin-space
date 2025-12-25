import type React from 'react';
import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useStdin, useStdout } from 'ink';
import { InputContext } from './InputContext.js';
import { parseKeypress, setKittyProtocolEnabled, parseMouseEvent } from './parseKeypress.js';
import { FocusProvider } from './FocusContext.js';
import { logger } from '../../utils/file-logger.js';
import type {
  Subscriber,
  MouseSubscriber,
  InputMiddleware,
  InputContextValue,
  InputHandler,
  MouseHandler,
  UseInputOptions,
  UseMouseOptions,
  Key,
  MouseEvent,
} from './types.js';

const KITTY_KEYBOARD_ENABLE = '\x1b[>1u';
const KITTY_KEYBOARD_DISABLE = '\x1b[<u';

const MOUSE_MODE_ENABLE = '\x1b[?1000h\x1b[?1002h\x1b[?1006h';
const MOUSE_MODE_DISABLE = '\x1b[?1006l\x1b[?1002l\x1b[?1000l';

function supportsKittyProtocol(): boolean {
  const term = process.env.TERM || '';
  const termProgram = process.env.TERM_PROGRAM || '';

  if (term === 'xterm-kitty' || process.env.KITTY_WINDOW_ID) {
    return true;
  }

  const supportedTerminals = ['kitty', 'ghostty', 'WezTerm', 'foot', 'rio'];

  if (supportedTerminals.some((t) => termProgram.toLowerCase().includes(t.toLowerCase()))) {
    return true;
  }

  for (const key of Object.keys(process.env)) {
    if (key.startsWith('KITTY_')) {
      return true;
    }
  }

  return false;
}

type Props = {
  children: React.ReactNode;
  stdout?: NodeJS.WriteStream;
  middleware?: InputMiddleware[];
  enableKittyProtocol?: boolean | 'auto';
};

/**
 * InputProvider manages keyboard and mouse input distribution to subscribers.
 *
 * Features:
 * - Priority-based event distribution (higher priority = executed first)
 * - Auto-incrementing priority for declarative component order
 * - Middleware chain for preprocessing input
 * - Optional Kitty Protocol support for enhanced keyboard input
 * - Mouse mode support with reference counting
 */
export const InputProvider: React.FC<Props> = ({
  children,
  stdout: externalStdout,
  middleware: initialMiddleware = [],
  enableKittyProtocol = 'auto',
}) => {
  const {
    stdin: _stdin,
    setRawMode,
    isRawModeSupported,
    internal_eventEmitter,
  } = useStdin() as ReturnType<typeof useStdin> & { internal_eventEmitter: import('node:events').EventEmitter };

  const { stdout: _stdout } = useStdout();

  const stdout = externalStdout || _stdout;

  const subscribersRef = useRef<Map<string, Subscriber>>(new Map());
  const mouseSubscribersRef = useRef<Map<string, MouseSubscriber>>(new Map());
  const middlewareRef = useRef<InputMiddleware[]>(initialMiddleware);
  const idCounterRef = useRef(0);
  const priorityStackCounterRef = useRef(0);
  const rawModeEnabledRef = useRef(false);
  const kittyProtocolEnabledRef = useRef(false);
  const mouseEnableCountRef = useRef(0);
  const [isMouseModeEnabled, setIsMouseModeEnabled] = useState(false);

  useEffect(() => {
    middlewareRef.current = initialMiddleware;
  }, [initialMiddleware]);

  useEffect(() => {
    if (isRawModeSupported && !rawModeEnabledRef.current) {
      setRawMode(true);
      rawModeEnabledRef.current = true;
    }

    return () => {
      if (rawModeEnabledRef.current) {
        setRawMode(false);
        rawModeEnabledRef.current = false;
      }
    };
  }, [isRawModeSupported, setRawMode]);

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

  const enableMouseMode = useCallback(() => {
    mouseEnableCountRef.current++;
    if (mouseEnableCountRef.current === 1 && stdout) {
      stdout.write(MOUSE_MODE_ENABLE);
      setIsMouseModeEnabled(true);
    }
  }, [stdout]);

  const disableMouseMode = useCallback(() => {
    mouseEnableCountRef.current = Math.max(0, mouseEnableCountRef.current - 1);
    if (mouseEnableCountRef.current === 0 && stdout) {
      stdout.write(MOUSE_MODE_DISABLE);
      setIsMouseModeEnabled(false);
    }
  }, [stdout]);

  useEffect(() => {
    return () => {
      if (stdout && mouseEnableCountRef.current > 0) {
        stdout.write(MOUSE_MODE_DISABLE);
      }
    };
  }, [stdout]);

  /**
   * Subscribe to keyboard input events.
   *
   * Priority system:
   * - If priority is explicitly set, that value is used
   * - If not set, priority auto-increments (later registrations = higher priority)
   * - This means components lower in the tree naturally take precedence
   *
   * @param handler - Function to handle input events
   * @param options - Configuration options (isActive, priority)
   * @returns Unsubscribe function
   */
  const subscribe = useCallback((handler: InputHandler, options: UseInputOptions = {}) => {
    const id = `input_sub_${++idCounterRef.current}`;
    const priority = options.priority ?? ++priorityStackCounterRef.current;

    logger.error('[subscribe] id=' + id + ', priority=' + priority + ', isActive=' + (options.isActive ?? true));

    const subscriber: Subscriber = {
      id,
      handler,
      priority,
      isActive: options.isActive ?? true,
    };

    subscribersRef.current.set(id, subscriber);

    return () => {
      logger.error('[unsubscribe] id=' + id);
      subscribersRef.current.delete(id);
    };
  }, []);

  /**
   * Subscribe to mouse events.
   * Uses same priority system as keyboard input.
   */
  const subscribeMouse = useCallback((handler: MouseHandler, options: UseMouseOptions = {}) => {
    const id = `mouse_sub_${++idCounterRef.current}`;
    const priority = options.priority ?? ++priorityStackCounterRef.current;

    const subscriber: MouseSubscriber = {
      id,
      handler,
      priority,
      isActive: options.isActive ?? true,
    };

    mouseSubscribersRef.current.set(id, subscriber);

    return () => {
      mouseSubscribersRef.current.delete(id);
    };
  }, []);

  const updateSubscriber = useCallback((id: string, options: Partial<UseInputOptions>) => {
    const subscriber = subscribersRef.current.get(id) || mouseSubscribersRef.current.get(id);
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

  /**
   * Distribute input to all active subscribers in priority order.
   * Stops when a handler returns true.
   */
  const distributeInput = useCallback((input: string, key: Key) => {
    const sortedSubscribers = Array.from(subscribersRef.current.values())
      .filter((s) => s.isActive)
      .sort((a, b) => b.priority - a.priority);

    logger.error('[distributeInput] key.tab=' + key.tab + ', key.ctrl=' + key.ctrl + ', input=' + JSON.stringify(input) + ', subscribers=' + sortedSubscribers.length);
    
    for (const subscriber of sortedSubscribers) {
      const result = subscriber.handler(input, key);
      logger.error('[distributeInput] handler id=' + subscriber.id + ', priority=' + subscriber.priority + ', result=' + result);
      if (result === true) break;
    }
  }, []);

  /**
   * Distribute mouse events to all active subscribers in priority order.
   * Stops when a handler returns true.
   */
  const distributeMouse = useCallback((event: MouseEvent) => {
    const sortedSubscribers = Array.from(mouseSubscribersRef.current.values())
      .filter((s) => s.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const subscriber of sortedSubscribers) {
      const result = subscriber.handler(event);
      if (result === true) break;
    }
  }, []);

  useEffect(() => {
    if (!internal_eventEmitter) return;

    const handleInput = (data: string) => {
      const { mouse, consumed } = parseMouseEvent(data);
      if (consumed && mouse) {
        distributeMouse(mouse);
        return;
      }

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
  }, [internal_eventEmitter, distributeInput, distributeMouse]);

  const contextValue: InputContextValue = useMemo(
    () => ({
      subscribe,
      subscribeMouse,
      updateSubscriber,
      addMiddleware,
      setRawMode,
      isRawModeSupported,
      enableMouseMode,
      disableMouseMode,
      isMouseModeEnabled,
    }),
    [
      subscribe,
      subscribeMouse,
      updateSubscriber,
      addMiddleware,
      setRawMode,
      isRawModeSupported,
      enableMouseMode,
      disableMouseMode,
      isMouseModeEnabled,
    ],
  );

  return (
    <InputContext.Provider value={contextValue}>
      <FocusProvider>{children}</FocusProvider>
    </InputContext.Provider>
  );
};
