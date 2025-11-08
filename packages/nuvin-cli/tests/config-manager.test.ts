import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'node:path';
import { ConfigManager } from '../source/config/manager.js';

vi.mock('node:fs', () => {
  const mockFs: Record<string, string> = {};

  const promises = {
    mkdir: vi.fn(async () => {}),
    writeFile: vi.fn(async (filePath: string, content: string) => {
      mockFs[filePath] = content;
    }),
    readFile: vi.fn(async (filePath: string) => {
      if (!(filePath in mockFs)) {
        const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`) as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      return mockFs[filePath];
    }),
  };

  return {
    default: {
      existsSync: vi.fn((filePath: string) => filePath in mockFs),
      readFileSync: vi.fn((filePath: string) => {
        if (!(filePath in mockFs)) {
          const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`) as NodeJS.ErrnoException;
          error.code = 'ENOENT';
          throw error;
        }
        return mockFs[filePath];
      }),
      writeFileSync: vi.fn((filePath: string, content: string) => {
        mockFs[filePath] = content;
      }),
      mkdirSync: vi.fn(() => {}),
      rmSync: vi.fn(() => {}),
      readdirSync: vi.fn(() => []),
      promises,
    },
    existsSync: vi.fn((filePath: string) => filePath in mockFs),
    readFileSync: vi.fn((filePath: string) => {
      if (!(filePath in mockFs)) {
        const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`) as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      return mockFs[filePath];
    }),
    writeFileSync: vi.fn((filePath: string, content: string) => {
      mockFs[filePath] = content;
    }),
    mkdirSync: vi.fn(() => {}),
    rmSync: vi.fn(() => {}),
    readdirSync: vi.fn(() => []),
    promises,
    __mockFs: mockFs,
  };
});

vi.mock('node:os', () => ({
  default: {
    homedir: () => '/mock-home',
    tmpdir: () => '/mock-tmp',
  },
  homedir: () => '/mock-home',
  tmpdir: () => '/mock-tmp',
}));

describe('ConfigManager.delete()', () => {
  beforeEach(async () => {
    ConfigManager.resetInstance();
    const fs = (await import('node:fs')) as typeof import('node:fs') & { __mockFs: Record<string, string> };
    const mockFs = fs.__mockFs;
    for (const key in mockFs) {
      delete mockFs[key];
    }
  });

  it('removes a top-level key', async () => {
    const fs = await import('node:fs');
    const testDir = '/test-dir';
    const configPath = path.join(testDir, 'config.yaml');
    const manager = ConfigManager.getInstance();
    manager.globalDir = testDir;
    manager.localDir = testDir;

    await manager.set('testKey', 'testValue', 'global');

    let value = manager.get('testKey');
    expect(value).toBe('testValue');

    await manager.delete('testKey', 'global');

    value = manager.get('testKey');
    expect(value).toBeUndefined();

    const fileContent = fs.readFileSync(configPath, 'utf-8');
    expect(fileContent).not.toContain('testKey');
  });

  it('removes a nested key', async () => {
    const fs = await import('node:fs');
    const testDir = '/test-dir';
    const configPath = path.join(testDir, 'config.yaml');
    const manager = ConfigManager.getInstance();
    manager.globalDir = testDir;
    manager.localDir = testDir;

    await manager.set('agentsEnabled.agent1', true, 'global');
    await manager.set('agentsEnabled.agent2', true, 'global');
    await manager.set('agentsEnabled.agent3', false, 'global');

    const agentsEnabled = manager.get('agentsEnabled') as Record<string, boolean>;
    expect(agentsEnabled).toEqual({
      agent1: true,
      agent2: true,
      agent3: false,
    });

    await manager.delete('agentsEnabled.agent2', 'global');

    const updatedAgentsEnabled = manager.get('agentsEnabled') as Record<string, boolean>;
    expect(updatedAgentsEnabled).toEqual({
      agent1: true,
      agent3: false,
    });

    const fileContent = fs.readFileSync(configPath, 'utf-8');
    expect(fileContent).not.toContain('agent2');
    expect(fileContent).toContain('agent1');
    expect(fileContent).toContain('agent3');
  });

  it('does not mutate original data', async () => {
    const testDir = '/test-dir';
    const manager = ConfigManager.getInstance();
    manager.globalDir = testDir;
    manager.localDir = testDir;

    await manager.set('agentsEnabled.agent1', true, 'global');
    await manager.set('agentsEnabled.agent2', true, 'global');

    const beforeDelete = manager.get('agentsEnabled') as Record<string, boolean>;
    const beforeDeleteCopy = { ...beforeDelete };

    await manager.delete('agentsEnabled.agent1', 'global');

    expect(beforeDelete).toEqual(beforeDeleteCopy);

    const afterDelete = manager.get('agentsEnabled') as Record<string, boolean>;
    expect(afterDelete).toEqual({ agent2: true });
  });

  it('handles non-existent keys gracefully', async () => {
    const testDir = '/test-dir';
    const manager = ConfigManager.getInstance();
    manager.globalDir = testDir;
    manager.localDir = testDir;

    await expect(async () => {
      await manager.delete('nonExistent', 'global');
    }).not.toThrow();

    await expect(async () => {
      await manager.delete('parent.nonExistent', 'global');
    }).not.toThrow();
  });

  it('handles deeply nested keys', async () => {
    const testDir = '/test-dir';
    const manager = ConfigManager.getInstance();
    manager.globalDir = testDir;
    manager.localDir = testDir;

    await manager.set('level1.level2.level3.key', 'value', 'global');
    await manager.set('level1.level2.otherKey', 'otherValue', 'global');

    const level1 = manager.get('level1') as Record<string, unknown>;
    expect((level1.level2 as Record<string, unknown>).level3).toBeDefined();
    expect(((level1.level2 as Record<string, unknown>).level3 as Record<string, unknown>).key).toBe('value');
    expect((level1.level2 as Record<string, unknown>).otherKey).toBe('otherValue');

    await manager.delete('level1.level2.level3.key', 'global');

    const updatedLevel1 = manager.get('level1') as Record<string, unknown>;
    expect((updatedLevel1.level2 as Record<string, unknown>).level3).toEqual({});
    expect(((updatedLevel1.level2 as Record<string, unknown>).level3 as Record<string, unknown>).key).toBeUndefined();
    expect((updatedLevel1.level2 as Record<string, unknown>).otherKey).toBe('otherValue');
  });

  it('preserves other scope data', async () => {
    const testDir = '/test-dir';
    const localDir = '/test-dir/local';
    const manager = ConfigManager.getInstance();
    manager.globalDir = testDir;
    manager.localDir = localDir;

    await manager.set('globalKey', 'globalValue', 'global');
    await manager.set('localKey', 'localValue', 'local');

    await manager.delete('globalKey', 'global');

    expect(manager.get('globalKey', 'global')).toBeUndefined();
    expect(manager.get('localKey', 'local')).toBe('localValue');
    expect(manager.get('globalKey')).toBeUndefined();
    expect(manager.get('localKey')).toBe('localValue');
  });

  it('throws error for direct scope', async () => {
    const testDir = '/test-dir';
    const manager = ConfigManager.getInstance();
    manager.globalDir = testDir;
    manager.localDir = testDir;

    await expect(async () => {
      await manager.delete('someKey', 'direct');
    }).rejects.toThrow('Cannot delete from runtime-only config scope.');
  });

  it('throws error for non-existent explicit scope', async () => {
    const testDir = '/test-dir';
    const manager = ConfigManager.getInstance();
    manager.globalDir = testDir;
    manager.localDir = testDir;

    await expect(async () => {
      await manager.delete('someKey', 'explicit');
    }).rejects.toThrow('Cannot delete from explicit config because no --config file was loaded.');
  });
});
