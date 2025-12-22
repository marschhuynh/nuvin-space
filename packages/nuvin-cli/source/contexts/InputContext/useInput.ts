import { useEffect, useRef, useContext } from 'react';
import { InputContext } from './InputContext.js';
import type { InputHandler, UseInputOptions } from './types.js';

export const useInput = (handler: InputHandler, options: UseInputOptions = {}) => {
  const { subscribe } = useContext(InputContext);
  const handlerRef = useRef(handler);
  const { isActive = true, priority = 0 } = options;

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!isActive) return;

    const wrappedHandler: InputHandler = (input, key) => {
      return handlerRef.current(input, key);
    };

    return subscribe(wrappedHandler, { isActive, priority });
  }, [subscribe, isActive, priority]);
};

export type { Key } from './types.js';
