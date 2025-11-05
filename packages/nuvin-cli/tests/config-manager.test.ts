import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ConfigManager } from '../source/config/manager.js';

// Helper to create a temporary test directory
function createTempDir(): string {
  const tempDir = path.join(os.tmpdir(), `nuvin-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

// Helper to clean up test directory
function cleanupTempDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('ConfigManager.delete()', () => {
  beforeEach(() => {
    // Reset singleton instance before each test
    ConfigManager.resetInstance();
  });

  it('removes a top-level key', async () => {
    const tempDir = createTempDir();
    const configPath = path.join(tempDir, 'config.yaml');

    try {
      const manager = ConfigManager.getInstance();
      manager.globalDir = tempDir;

      // Set initial config with a key to delete
      await manager.set('testKey', 'testValue', 'global');

      // Verify key exists
      let value = manager.get('testKey');
      expect(value).toBe('testValue');

      // Delete the key
      await manager.delete('testKey', 'global');

      // Verify key is deleted
      value = manager.get('testKey');
      expect(value).toBeUndefined();

      // Verify file was updated
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      expect(fileContent).not.toContain('testKey');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('removes a nested key', async () => {
    const tempDir = createTempDir();
    const configPath = path.join(tempDir, 'config.yaml');

    try {
      const manager = ConfigManager.getInstance();
      manager.globalDir = tempDir;

      // Set nested config
      await manager.set('agentsEnabled.agent1', true, 'global');
      await manager.set('agentsEnabled.agent2', true, 'global');
      await manager.set('agentsEnabled.agent3', false, 'global');

      // Verify keys exist
      const agentsEnabled = manager.get('agentsEnabled') as Record<string, boolean>;
      expect(agentsEnabled).toEqual({
        agent1: true,
        agent2: true,
        agent3: false,
      });

      // Delete one nested key
      await manager.delete('agentsEnabled.agent2', 'global');

      // Verify only agent2 is deleted
      const updatedAgentsEnabled = manager.get('agentsEnabled') as Record<string, boolean>;
      expect(updatedAgentsEnabled).toEqual({
        agent1: true,
        agent3: false,
      });

      // Verify file was updated
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      expect(fileContent).not.toContain('agent2');
      expect(fileContent).toContain('agent1');
      expect(fileContent).toContain('agent3');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('does not mutate original data', async () => {
    const tempDir = createTempDir();

    try {
      const manager = ConfigManager.getInstance();
      manager.globalDir = tempDir;

      // Set nested config
      await manager.set('agentsEnabled.agent1', true, 'global');
      await manager.set('agentsEnabled.agent2', true, 'global');

      // Get reference before delete
      const beforeDelete = manager.get('agentsEnabled') as Record<string, boolean>;
      const beforeDeleteCopy = { ...beforeDelete };

      // Delete a key
      await manager.delete('agentsEnabled.agent1', 'global');

      // Verify original reference wasn't mutated
      expect(beforeDelete).toEqual(beforeDeleteCopy);

      // Verify new get() returns updated config
      const afterDelete = manager.get('agentsEnabled') as Record<string, boolean>;
      expect(afterDelete).toEqual({ agent2: true });
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('handles non-existent keys gracefully', async () => {
    const tempDir = createTempDir();

    try {
      const manager = ConfigManager.getInstance();
      manager.globalDir = tempDir;

      // Try to delete a key that doesn't exist
      await expect(async () => {
        await manager.delete('nonExistent', 'global');
      }).not.toThrow();

      // Try to delete a nested key that doesn't exist
      await expect(async () => {
        await manager.delete('parent.nonExistent', 'global');
      }).not.toThrow();
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('handles deeply nested keys', async () => {
    const tempDir = createTempDir();

    try {
      const manager = ConfigManager.getInstance();
      manager.globalDir = tempDir;

      // Set deeply nested config
      await manager.set('level1.level2.level3.key', 'value', 'global');
      await manager.set('level1.level2.otherKey', 'otherValue', 'global');

      // Verify structure
      const level1 = manager.get('level1') as Record<string, unknown>;
      expect((level1.level2 as Record<string, unknown>).level3).toBeDefined();
      expect(((level1.level2 as Record<string, unknown>).level3 as Record<string, unknown>).key).toBe('value');
      expect((level1.level2 as Record<string, unknown>).otherKey).toBe('otherValue');

      // Delete deeply nested key
      await manager.delete('level1.level2.level3.key', 'global');

      // Verify deletion - the key is deleted but parent object remains (empty)
      const updatedLevel1 = manager.get('level1') as Record<string, unknown>;
      expect((updatedLevel1.level2 as Record<string, unknown>).level3).toEqual({});
      expect(((updatedLevel1.level2 as Record<string, unknown>).level3 as Record<string, unknown>).key).toBeUndefined();
      expect((updatedLevel1.level2 as Record<string, unknown>).otherKey).toBe('otherValue');
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  it('preserves other scope data', async () => {
    const tempDir = createTempDir();
    const localDir = path.join(tempDir, 'local');
    fs.mkdirSync(localDir, { recursive: true });

    try {
      const manager = ConfigManager.getInstance();
      manager.globalDir = tempDir;
      manager.localDir = localDir;

      // Set data in both scopes
      await manager.set('globalKey', 'globalValue', 'global');
      await manager.set('localKey', 'localValue', 'local');

      // Delete from global scope
      await manager.delete('globalKey', 'global');

      // Verify global key is deleted
      expect(manager.get('globalKey', 'global')).toBeUndefined();

      // Verify local key is preserved
      expect(manager.get('localKey', 'local')).toBe('localValue');

      // Verify combined config only has local key
      expect(manager.get('globalKey')).toBeUndefined();
      expect(manager.get('localKey')).toBe('localValue');
    } finally {
      cleanupTempDir(tempDir);
      cleanupTempDir(localDir);
    }
  });

  it('throws error for direct scope', async () => {
    const manager = ConfigManager.getInstance();

    await expect(async () => {
      await manager.delete('someKey', 'direct');
    }).rejects.toThrow('Cannot delete from runtime-only config scope.');
  });

  it('throws error for non-existent explicit scope', async () => {
    const manager = ConfigManager.getInstance();

    await expect(async () => {
      await manager.delete('someKey', 'explicit');
    }).rejects.toThrow('Cannot delete from explicit config because no --config file was loaded.');
  });
});
