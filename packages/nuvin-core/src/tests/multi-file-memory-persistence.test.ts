import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { MultiFileMemoryPersistence } from '../persistent/MultiFileMemoryPersistence.js';
import type { Message } from '../ports.js';

describe('MultiFileMemoryPersistence', () => {
  let testDir: string;
  let persistence: MultiFileMemoryPersistence<Message>;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `test-multi-file-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    persistence = new MultiFileMemoryPersistence<Message>({ directory: testDir });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('save', () => {
    it('should create separate files for agent keys', async () => {
      const snapshot = {
        'agent:researcher:session-123': [
          { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date().toISOString() },
          { id: '2', role: 'assistant' as const, content: 'Hi there', timestamp: new Date().toISOString() },
        ],
        'agent:coder:session-456': [
          { id: '3', role: 'user' as const, content: 'Write code', timestamp: new Date().toISOString() },
        ],
      };

      await persistence.save(snapshot);

      const files = fs.readdirSync(testDir);
      expect(files).toContain('history.agent:researcher:session-123.json');
      expect(files).toContain('history.agent:coder:session-456.json');
      expect(files).toHaveLength(2);
    });

    it('should NOT save non-agent keys', async () => {
      const snapshot = {
        cli: [{ id: '1', role: 'user' as const, content: 'Main conversation', timestamp: new Date().toISOString() }],
        'agent:test:id1': [{ id: '2', role: 'user' as const, content: 'Agent', timestamp: new Date().toISOString() }],
      };

      await persistence.save(snapshot);

      const files = fs.readdirSync(testDir);
      expect(files).toContain('history.agent:test:id1.json');
      expect(files).not.toContain('history.cli.json');
      expect(files).toHaveLength(1);
    });

    it('should write valid JSON content', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Test message', timestamp: '2026-01-02T00:00:00Z' },
      ];
      const snapshot = { 'agent:test:session1': messages };

      await persistence.save(snapshot);

      const filepath = path.join(testDir, 'history.agent:test:session1.json');
      const content = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      expect(content).toEqual(messages);
    });
  });

  describe('load', () => {
    it('should load all agent files into snapshot', async () => {
      // Create test files
      const msg1: Message[] = [{ id: '1', role: 'user', content: 'Hello', timestamp: '2026-01-02T00:00:00Z' }];
      const msg2: Message[] = [{ id: '2', role: 'assistant', content: 'Hi', timestamp: '2026-01-02T00:00:01Z' }];

      fs.writeFileSync(path.join(testDir, 'history.agent:a:id1.json'), JSON.stringify(msg1));
      fs.writeFileSync(path.join(testDir, 'history.agent:b:id2.json'), JSON.stringify(msg2));
      fs.writeFileSync(path.join(testDir, 'history.json'), JSON.stringify([{ id: '3', role: 'user', content: 'CLI' }]));

      const snapshot = await persistence.load();

      expect(Object.keys(snapshot)).toHaveLength(2);
      expect(snapshot['agent:a:id1']).toEqual(msg1);
      expect(snapshot['agent:b:id2']).toEqual(msg2);
      // Should NOT load cli history
      expect(snapshot['cli']).toBeUndefined();
    });

    it('should return empty snapshot for non-existent directory', async () => {
      const nonExistentPersistence = new MultiFileMemoryPersistence<Message>({
        directory: '/non/existent/path',
      });

      const snapshot = await nonExistentPersistence.load();

      expect(snapshot).toEqual({});
    });

    it('should skip invalid JSON files', async () => {
      fs.writeFileSync(path.join(testDir, 'history.agent:valid:id1.json'), '[{"id":"1","role":"user","content":"OK"}]');
      fs.writeFileSync(path.join(testDir, 'history.agent:invalid:id2.json'), 'not valid json');

      const snapshot = await persistence.load();

      expect(Object.keys(snapshot)).toHaveLength(1);
      expect(snapshot['agent:valid:id1']).toBeDefined();
    });
  });

  describe('round-trip', () => {
    it('should save and load messages correctly', async () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'Question', timestamp: '2026-01-02T00:00:00Z' },
        { id: '2', role: 'assistant', content: 'Answer', timestamp: '2026-01-02T00:00:01Z' },
      ];
      const snapshot = { 'agent:test:session-abc': messages };

      await persistence.save(snapshot);
      const loaded = await persistence.load();

      expect(loaded['agent:test:session-abc']).toEqual(messages);
    });
  });
});
