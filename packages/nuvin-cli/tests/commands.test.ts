import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandRegistry } from '../source/modules/commands/registry.js';
import { registerClearCommand } from '../source/modules/commands/definitions/clear.js';
import { registerNewCommand } from '../source/modules/commands/definitions/new.js';
import { registerSudoCommand } from '../source/modules/commands/definitions/sudo.js';
import type { TypedEventBus } from '../source/services/EventBus.js';
import type { OrchestratorManager } from '../source/services/OrchestratorManager.js';

const createMockConfigFunctions = () => ({
  get: vi.fn((key: string) => {
    if (key === 'memPersist') return false;
    return undefined;
  }),
  set: vi.fn(),
});

type EventHandler = (...args: unknown[]) => void;

const createMockEventBus = (): TypedEventBus => {
  const listeners = new Map<string, Set<EventHandler>>();

  return {
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)?.add(handler);
    }),
    off: vi.fn((event: string, handler: EventHandler) => {
      listeners.get(event)?.delete(handler);
    }),
    emit: vi.fn((event: string, ...args: unknown[]) => {
      const handlers = listeners.get(event);
      if (handlers) {
        for (const handler of handlers) {
          handler(...args);
        }
      }
    }),
  } as TypedEventBus;
};

const createMockMemory = () => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  has: vi.fn(),
  list: vi.fn(),
  clear: vi.fn(),
});

describe('/clear command', () => {
  let registry: CommandRegistry;
  let mockEventBus: TypedEventBus;
  let mockMemory: ReturnType<typeof createMockMemory>;
  let mockOrchestratorManager: OrchestratorManager;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockMemory = createMockMemory();
    
    mockOrchestratorManager = {
      getMemory: vi.fn(() => mockMemory),
      getSession: vi.fn(() => ({ sessionId: 'test-session-id' })),
    } as unknown as OrchestratorManager;

    registry = new CommandRegistry(mockOrchestratorManager);
    registry.setConfigFunctions(createMockConfigFunctions());

    // Replace the global eventBus with our mock
    (registry as { createContext: (input: string) => CommandContext }).createContext = function (input: string) {
      return {
        rawInput: input,
        eventBus: mockEventBus,
        registry: this,
        config: this.configFunctions,
        orchestratorManager: this.orchestratorManager,
      };
    };

    registerClearCommand(registry);
  });

  it('should be registered with correct id and description', () => {
    const command = registry.get('/clear');

    expect(command).toBeDefined();
    expect(command?.id).toBe('/clear');
    expect(command?.description).toBe('Clear all messages from the current conversation');
    expect(command?.category).toBe('session');
  });

  it('should clear memory when executed', async () => {
    await registry.execute('/clear');

    expect(mockMemory.delete).toHaveBeenCalledWith('cli');
  });

  it('should emit ui:lines:clear event', async () => {
    await registry.execute('/clear');

    expect(mockEventBus.emit).toHaveBeenCalledWith('ui:lines:clear');
  });

  it('should emit ui:clear:complete event', async () => {
    await registry.execute('/clear');

    expect(mockEventBus.emit).toHaveBeenCalledWith('ui:clear:complete');
  });
});

describe('/new command', () => {
  let registry: CommandRegistry;
  let mockEventBus: TypedEventBus;
  let mockMemory: ReturnType<typeof createMockMemory>;
  let mockConfig: ReturnType<typeof createMockConfigFunctions>;
  let mockOrchestratorManager: OrchestratorManager;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockMemory = createMockMemory();
    mockConfig = createMockConfigFunctions();
    
    mockOrchestratorManager = {
      getStatus: vi.fn(() => 'Ready'),
      getMemory: vi.fn(() => mockMemory),
      getSession: vi.fn(() => ({ sessionId: 'test-session-id' })),
    } as unknown as OrchestratorManager;

    registry = new CommandRegistry(mockOrchestratorManager);
    registry.setConfigFunctions(mockConfig);

    // Replace the global eventBus with our mock
    (registry as { createContext: (input: string) => CommandContext }).createContext = function (input: string) {
      return {
        rawInput: input,
        eventBus: mockEventBus,
        registry: this,
        config: this.configFunctions,
        orchestratorManager: this.orchestratorManager,
      };
    };

    registerNewCommand(registry);
  });

  it('should be registered with correct id and description', () => {
    const command = registry.get('/new');

    expect(command).toBeDefined();
    expect(command?.id).toBe('/new');
    expect(command?.description).toBe('Start a new conversation session');
    expect(command?.category).toBe('session');
  });

  it('should clear UI messages', async () => {
    await registry.execute('/new');

    expect(mockEventBus.emit).toHaveBeenCalledWith('ui:lines:clear');
  });

  it('should not clear memory (preserves session)', async () => {
    await registry.execute('/new');

    expect(mockMemory.delete).not.toHaveBeenCalled();
  });

  it('should emit ui:new:conversation with memPersist=false by default', async () => {
    await registry.execute('/new');

    expect(mockEventBus.emit).toHaveBeenCalledWith('ui:new:conversation', { memPersist: false });
  });

  it('should emit ui:new:conversation with memPersist=true when configured', async () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'session.memPersist') return true;
      return undefined;
    });

    await registry.execute('/new');

    expect(mockEventBus.emit).toHaveBeenCalledWith('ui:new:conversation', { memPersist: true });
  });

  it('should get session.memPersist config', async () => {
    await registry.execute('/new');

    expect(mockConfig.get).toHaveBeenCalledWith('session.memPersist');
  });
});

describe('/sudo command', () => {
  let registry: CommandRegistry;
  let mockEventBus: TypedEventBus;

  beforeEach(() => {
    registry = new CommandRegistry();
    registry.setConfigFunctions(createMockConfigFunctions());
    mockEventBus = createMockEventBus();

    // Replace the global eventBus with our mock
    (registry as { createContext: (input: string) => CommandContext }).createContext = function (input: string) {
      return {
        rawInput: input,
        eventBus: mockEventBus,
        registry: this,
        config: this.configFunctions,
        memory: this.memory,
        orchestrator: this.orchestrator,
      };
    };

    registerSudoCommand(registry);
  });

  it('should be registered with correct id and description', () => {
    const command = registry.get('/sudo');

    expect(command).toBeDefined();
    expect(command?.id).toBe('/sudo');
    expect(command?.description).toBe('Toggle sudo mode (bypass tool approval requirement).');
    expect(command?.category).toBe('debug');
  });

  it('should emit command:sudo:toggle event when executed', async () => {
    await registry.execute('/sudo');

    expect(mockEventBus.emit).toHaveBeenCalledWith('command:sudo:toggle', undefined);
  });

  it('should handle execution errors gracefully', async () => {
    // Make emit throw an error
    (mockEventBus.emit as vi.Mock).mockImplementation(() => {
      throw new Error('Event bus error');
    });

    const result = await registry.execute('/sudo');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
