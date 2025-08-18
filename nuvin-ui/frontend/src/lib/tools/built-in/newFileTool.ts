import { Tool } from '@/types/tools';
import { promises as fs } from 'fs';
import path from 'path';

export const newFileTool: Tool = {
  definition: {
    name: 'new_file',
    description: 'Creates a new file with the provided content. Fails if the file already exists.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path of the file to create'
        },
        content: {
          type: 'string',
          description: 'Content to write to the new file'
        }
      },
      required: ['path', 'content']
    }
  },

  async execute(parameters) {
    try {
      const { path: filePath, content } = parameters as { path: string; content: string };

      if (!filePath || typeof filePath !== 'string') {
        return {
          status: 'error',
          type: 'text',
          result: 'path parameter is required and must be a string'
        };
      }

      try {
        await fs.access(filePath);
        return { status: 'error', type: 'text', result: 'File already exists' };
      } catch {
        // file does not exist
      }

      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');

      return { status: 'success', type: 'text', result: 'File created' };
    } catch (err) {
      return {
        status: 'error',
        type: 'text',
        result: `Failed to create file: ${err instanceof Error ? err.message : err}`
      };
    }
  },

  validate(parameters) {
    if (!parameters.path || typeof parameters.path !== 'string') {
      return false;
    }
    if (typeof parameters.content !== 'string') {
      return false;
    }
    return true;
  },

  category: 'filesystem',
  version: '1.0.0',
  author: 'system'
};
