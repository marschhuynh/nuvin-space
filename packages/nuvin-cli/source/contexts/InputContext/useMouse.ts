import { useEffect, useRef, useContext } from 'react';
import { InputContext } from './InputContext.js';
import type { MouseHandler, UseMouseOptions } from './types.js';

export const useMouse = (handler: MouseHandler, options: UseMouseOptions = {}) => {
  const { subscribeMouse, enableMouseMode, disableMouseMode } = useContext(InputContext);
  const handlerRef = useRef(handler);
  const { isActive = true, priority = 0 } = options;

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!isActive) return;

    enableMouseMode();

    const wrappedHandler: MouseHandler = (event) => {
      return handlerRef.current(event);
    };

    const unsubscribe = subscribeMouse(wrappedHandler, { isActive, priority });

    return () => {
      unsubscribe();
      disableMouseMode();
    };
  }, [subscribeMouse, enableMouseMode, disableMouseMode, isActive, priority]);
};

export type { MouseEvent } from './types.js';
