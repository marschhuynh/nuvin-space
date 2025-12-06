import { promises as fs } from 'fs';
import * as path from 'path';
import type { ToolDefinition } from '../ports.js';
import type { FunctionTool, ExecResult, ToolExecutionContext } from './types.js';
import { ok, err } from './result-helpers.js';

export type FileNewParams = {
  /** Target path (workspace-relative). */
  file_path: string;
  /** File content as UTF-8 text. */
  content: string;
};

export class FileNewTool implements FunctionTool<FileNewParams, ToolExecutionContext> {
  name = 'file_new' as const;
  private readonly rootDir: string;

  constructor(opts: { rootDir?: string } = {}) {
    this.rootDir = path.resolve(opts.rootDir ?? process.cwd());
  }

  parameters = {
    type: 'object',
    properties: {
      // description: { type: 'string', description: 'Explanation of what file is being created and its purpose (e.g., "Create configuration file for database connection")' },
      file_path: { type: 'string', description: 'Path where the new file will be created' },
      content: { type: 'string', description: 'Text content to write to the new file' },
    },
    required: ['file_path', 'content'],
    additionalProperties: false,
  } as const;

  definition(): ToolDefinition['function'] {
    return {
      name: this.name,
      description: 'Create a new file with text content. IMPORTANT: The file_path must be absolute, not relative',
      parameters: this.parameters,
    };
  }

  async execute(p: FileNewParams, ctx?: ToolExecutionContext): Promise<ExecResult> {
    try {
      if (!p.file_path?.trim()) return err('Parameter "file_path" is required.');
      if (typeof p.content !== 'string') return err('"content" must be a string.');

      const abs = this.resolveSafePath(p.file_path, ctx);

      // Ensure parent directories exist
      await fs.mkdir(path.dirname(abs), { recursive: true });

      // Write UTF-8 text
      const bytes = Buffer.from(p.content, 'utf8');
      await this.writeAtomic(abs, bytes);

      return ok(`File written at ${p.file_path}.`, { file_path: p.file_path, bytes: bytes.length });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return err(message);
    }
  }

  // helpers
  private async writeAtomic(target: string, bytes: Buffer) {
    const dir = path.dirname(target);
    const tmp = path.join(dir, `.tmp.${path.basename(target)}.${Math.random().toString(36).slice(2, 8)}`);
    await fs.writeFile(tmp, bytes);
    await fs.rename(tmp, target);
  }
  private resolveSafePath(target: string, ctx?: ToolExecutionContext): string {
    const base = path.resolve(String(ctx?.workspaceRoot ?? ctx?.cwd ?? this.rootDir));
    const abs = path.resolve(base, target);
    // const rel = path.relative(base, abs);
    // if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`Path escapes workspace: ${target}`);
    return abs;
  }
}
