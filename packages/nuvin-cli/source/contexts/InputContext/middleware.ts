import type { InputMiddleware } from './types.js';
import { eventBus } from '@/services/EventBus.js';

export const ctrlCMiddleware: InputMiddleware = (input, key, next) => {
  if (key.ctrl && input === 'c') {
    eventBus.emit('ui:keyboard:ctrlc', undefined);
    return;
  }
  next();
};

export const pasteDetectionMiddleware: InputMiddleware = (input, key, next) => {
  if (input.startsWith('\x1b[200~') || input.startsWith('[200~')) {
    eventBus.emit('ui:keyboard:paste', undefined);
  } else if (key.ctrl && input === 'v') {
    eventBus.emit('ui:keyboard:paste', undefined);
  }
  next();
};

export const explainToggleMiddleware: InputMiddleware = (input, key, next) => {
  if (key.ctrl && input === 'e') {
    eventBus.emit('ui:keyboard:explainToggle', '');
    return;
  }
  next();
};

export const defaultMiddleware: InputMiddleware[] = [
  ctrlCMiddleware,
  pasteDetectionMiddleware,
  explainToggleMiddleware,
];
