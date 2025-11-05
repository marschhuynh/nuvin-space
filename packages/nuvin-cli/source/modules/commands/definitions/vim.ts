import type { CommandRegistry } from '../types.js';

export function registerVimCommand(registry: CommandRegistry) {
  registry.register({
    id: '/vim',
    type: 'function',
    description: 'Toggle Vim editing mode for the chat input',
    category: 'ui',
    handler({ eventBus }) {
      eventBus.emit('ui:input:toggleVimMode', undefined);
    },
  });
}
