import { promises as fs } from 'fs';
import * as path from 'path';
import type { ToolDefinition } from '../ports.js';
import type { FunctionTool, ExecResult, ToolExecutionContext } from './types.js';
import { ok, err } from './result-helpers.js';

export type DirLsParams = {
  /** Directory path relative to workspace root. Defaults to current directory if not provided. */
  path?: string;

  /** Maximum number of entries to return. Default: 1000 */
  limit?: number;
};

type DirLsToolOptions = {
  /** Workspace root for safe path resolution. Defaults to process.cwd(). */
  rootDir?: string;

  /** Allow absolute paths (still must reside inside rootDir). Default: false */
  allowAbsolute?: boolean;
};

export type DirEntry = {
  name: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  size?: number;
  mtime?: number;
  mode?: number;
  lineCount?: number;
};

export class DirLsTool implements FunctionTool<DirLsParams, ToolExecutionContext> {
  name = 'dir_ls' as const;

  private readonly rootDir: string;
  private readonly allowAbsolute: boolean;

  constructor(opts: DirLsToolOptions = {}) {
    this.rootDir = path.resolve(opts.rootDir ?? process.cwd());
    this.allowAbsolute = !!opts.allowAbsolute;
  }

  parameters = {
    type: 'object',
    properties: {
      // description: { type: 'string', description: 'Explanation of what directory is being listed and why (e.g., "List source files in the components directory")' },
      path: {
        type: 'string',
        description: 'List contents of this directory path',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        description: 'Maximum number of directory entries to return',
      },
    },
  } as const;

  definition(): ToolDefinition['function'] {
    return {
      name: this.name,
      description: [
        'List files and directories in a specified directory.',
        'Returns entries sorted alphabetically by name in ls -la format.',
        '',
        'Typical uses:',
        '1) List all files in current directory',
        '2) List only directories with metadata',
        '3) List files including hidden ones',
      ].join('\n'),
      parameters: this.parameters,
    };
  }

  private async isTextFile(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath, { encoding: null });
      const chunk = buffer.slice(0, Math.min(1024, buffer.length));

      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === 0) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async countLines(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  async execute(params: DirLsParams, context?: ToolExecutionContext): Promise<ExecResult> {
    try {
      const targetPath = params.path ?? '.';
      const includeHidden = true;
      const limit = Math.min(params.limit ?? 1000, 10000);

      const abs = this.resolveSafePath(targetPath, context);

      const st = await fs.stat(abs).catch(() => null);
      if (!st) {
        return err(`Directory not found: ${targetPath}`);
      }
      if (!st.isDirectory()) {
        return err(`Path is not a directory: ${targetPath}`);
      }

      const entries = await fs.readdir(abs);
      const results: DirEntry[] = [];

      for (const entry of entries) {
        if (!includeHidden && entry.startsWith('.')) {
          continue;
        }

        if (results.length >= limit) {
          break;
        }

        const entryPath = path.join(abs, entry);
        let entryStat: Awaited<ReturnType<typeof fs.stat>> | null = null;

        try {
          entryStat = await fs.stat(entryPath);
        } catch {
          continue;
        }

        let entryType: DirEntry['type'] = 'other';
        if (entryStat.isFile()) entryType = 'file';
        else if (entryStat.isDirectory()) entryType = 'directory';
        else if (entryStat.isSymbolicLink()) entryType = 'symlink';

        const dirEntry: DirEntry = {
          name: entry,
          type: entryType,
        };

        if (entryStat) {
          dirEntry.size = entryStat.size;
          dirEntry.mtime = entryStat.mtimeMs;
          dirEntry.mode = entryStat.mode;

          if (entryType === 'file' && (await this.isTextFile(entryPath))) {
            dirEntry.lineCount = await this.countLines(entryPath);
          }
        }

        results.push(dirEntry);
      }

      results.sort((a, b) => a.name.localeCompare(b.name));

      const lines = results.map((entry) => this.formatAsLsLine(entry));
      const output = lines.join('\n');

      return ok(output);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return err(message);
    }
  }

  private formatAsLsLine(entry: DirEntry): string {
    const mode = entry.mode ? this.formatMode(entry.mode) : '----------';
    const size = entry.size !== undefined ? entry.size.toString().padStart(10) : '         0';

    const date = entry.mtime ? new Date(entry.mtime) : new Date();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate().toString().padStart(2);
    const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    const dateStr = `${month} ${day} ${time}`;

    const typeIndicator = entry.type === 'directory' ? '/' : entry.type === 'symlink' ? '@' : '';
    const name = `${entry.name}${typeIndicator}`;

    return `${mode} ${size} ${dateStr} ${name}`;
  }

  private formatMode(mode: number): string {
    const fileType = (mode & 0o170000) === 0o040000 ? 'd' : (mode & 0o170000) === 0o120000 ? 'l' : '-';

    const perms = [
      mode & 0o400 ? 'r' : '-',
      mode & 0o200 ? 'w' : '-',
      mode & 0o100 ? 'x' : '-',
      mode & 0o040 ? 'r' : '-',
      mode & 0o020 ? 'w' : '-',
      mode & 0o010 ? 'x' : '-',
      mode & 0o004 ? 'r' : '-',
      mode & 0o002 ? 'w' : '-',
      mode & 0o001 ? 'x' : '-',
    ];

    return fileType + perms.join('');
  }

  private resolveSafePath(target: string, context?: ToolExecutionContext): string {
    const baseFromCtx = context?.workspaceRoot || context?.cwd || this.rootDir;
    const base = path.resolve(String(baseFromCtx ?? this.rootDir));
    const abs = path.resolve(base, target);

    if (!this.allowAbsolute && path.isAbsolute(target) && !abs.startsWith(base)) {
      throw new Error('Absolute paths are not allowed. Provide a path relative to the workspace root.');
    }

    if (!this.allowAbsolute) {
      const rel = path.relative(base, abs);
      if (rel.startsWith('..') || path.isAbsolute(rel)) {
        throw new Error(`Path escapes workspace root: ${target}`);
      }
    }

    return abs;
  }
}
