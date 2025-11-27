import ansiEscapes from 'ansi-escapes';
import type { CommandRegistry } from '@/modules/commands/types.js';
import { sessionMetricsService } from '@/services/SessionMetricsService.js';

export function registerClearCommand(registry: CommandRegistry) {
  registry.register({
    id: '/clear',
    type: 'function',
    description: 'Clear all messages from the current conversation',
    category: 'session',
    async handler({ eventBus, orchestratorManager }) {
      const memory = orchestratorManager?.getMemory();
      if (memory) {
        await memory.delete('cli');
      }

      const sessionId = orchestratorManager?.getSession().sessionId;
      if (sessionId) {
        sessionMetricsService.reset(sessionId);
      }

      eventBus.emit('ui:lines:clear');
      console.log(ansiEscapes.clearTerminal);
      eventBus.emit('ui:header:refresh');

      eventBus.emit('ui:clear:complete');
    },
  });
}
