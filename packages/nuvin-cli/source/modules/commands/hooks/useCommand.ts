import { useState, useEffect, useCallback, useMemo } from 'react';
import { eventBus } from '@/services/EventBus.js';
import { commandRegistry } from '@/modules/commands/registry.js';
import type { CommandDefinition, ActiveCommand, CommandContext } from '@/modules/commands/types.js';

interface UseCommandReturn {
  commands: CommandDefinition[];
  activeCommand: ActiveCommand | null;
  execute: (input: string) => Promise<void>;
  setActiveCommand: (commandId: string, context: CommandContext) => void;
  clearActiveCommand: () => void;
}

export function useCommand(): UseCommandReturn {
  const [commands, _setCommands] = useState<CommandDefinition[]>(() => commandRegistry.list({ includeHidden: false }));
  const [activeCommand, setActiveCommandState] = useState<ActiveCommand | null>(() => commandRegistry.getActive());

  useEffect(() => {
    const updateActiveCommand = () => {
      setActiveCommandState(commandRegistry.getActive());
    };

    // Listen for registry changes
    eventBus.on('ui:command:activated', updateActiveCommand);
    eventBus.on('ui:command:deactivated', updateActiveCommand);

    return () => {
      eventBus.off('ui:command:activated', updateActiveCommand);
      eventBus.off('ui:command:deactivated', updateActiveCommand);
    };
  }, []);

  const execute = useCallback(async (input: string) => {
    await commandRegistry.execute(input);
  }, []);

  const setActiveCommand = useCallback((commandId: string, context: CommandContext) => {
    commandRegistry.setActive(commandId, context);
  }, []);

  const clearActiveCommand = useCallback(() => {
    commandRegistry.clearActive();
  }, []);

  return useMemo(
    () => ({
      commands,
      activeCommand,
      execute,
      setActiveCommand,
      clearActiveCommand,
    }),
    [commands, activeCommand, execute, setActiveCommand, clearActiveCommand],
  );
}
