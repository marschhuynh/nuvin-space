import type { ToolParameterMap, ToolName } from './tool-params.js';

export type ValidationResult<T = unknown> =
  | { valid: true; data: T }
  | { valid: false; errors: string[] };

export type ToolValidator<T extends ToolName> = (
  params: Record<string, unknown>
) => ValidationResult<ToolParameterMap[T]>;

export const validateBashToolParams: ToolValidator<'bash_tool'> = (params) => {
  const errors: string[] = [];
  
  if (!params.cmd || typeof params.cmd !== 'string') {
    errors.push('Required parameter "cmd" must be a non-empty string');
  }
  
  if (params.cwd !== undefined && typeof params.cwd !== 'string') {
    errors.push('Parameter "cwd" must be a string');
  }
  
  if (params.timeoutMs !== undefined) {
    if (typeof params.timeoutMs !== 'number' || params.timeoutMs < 1) {
      errors.push('Parameter "timeoutMs" must be a positive number');
    }
  }
  
  if (params.description !== undefined && typeof params.description !== 'string') {
    errors.push('Parameter "description" must be a string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      cmd: params.cmd as string,
      cwd: params.cwd as string | undefined,
      timeoutMs: params.timeoutMs as number | undefined,
      description: params.description as string | undefined,
    },
  };
};

export const validateFileReadParams: ToolValidator<'file_read'> = (params) => {
  const errors: string[] = [];
  
  if (!params.path || typeof params.path !== 'string') {
    errors.push('Required parameter "path" must be a non-empty string');
  }
  
  if (params.lineStart !== undefined) {
    if (typeof params.lineStart !== 'number' || params.lineStart < 1) {
      errors.push('Parameter "lineStart" must be a positive integer');
    }
  }
  
  if (params.lineEnd !== undefined) {
    if (typeof params.lineEnd !== 'number' || params.lineEnd < 1) {
      errors.push('Parameter "lineEnd" must be a positive integer');
    }
  }
  
  if (params.description !== undefined && typeof params.description !== 'string') {
    errors.push('Parameter "description" must be a string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      path: params.path as string,
      lineStart: params.lineStart as number | undefined,
      lineEnd: params.lineEnd as number | undefined,
      description: params.description as string | undefined,
    },
  };
};

export const validateFileEditParams: ToolValidator<'file_edit'> = (params) => {
  const errors: string[] = [];
  
  if (!params.file_path || typeof params.file_path !== 'string') {
    errors.push('Required parameter "file_path" must be a non-empty string');
  }
  
  if (!params.old_text || typeof params.old_text !== 'string') {
    errors.push('Required parameter "old_text" must be a string');
  }
  
  if (params.new_text === undefined || typeof params.new_text !== 'string') {
    errors.push('Required parameter "new_text" must be a string');
  }
  
  if (params.dry_run !== undefined && typeof params.dry_run !== 'boolean') {
    errors.push('Parameter "dry_run" must be a boolean');
  }
  
  if (params.description !== undefined && typeof params.description !== 'string') {
    errors.push('Parameter "description" must be a string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      file_path: params.file_path as string,
      old_text: params.old_text as string,
      new_text: params.new_text as string,
      dry_run: params.dry_run as boolean | undefined,
      description: params.description as string | undefined,
    },
  };
};

export const validateFileNewParams: ToolValidator<'file_new'> = (params) => {
  const errors: string[] = [];
  
  if (!params.file_path || typeof params.file_path !== 'string') {
    errors.push('Required parameter "file_path" must be a non-empty string');
  }
  
  if (params.content === undefined || typeof params.content !== 'string') {
    errors.push('Required parameter "content" must be a string');
  }
  
  if (params.description !== undefined && typeof params.description !== 'string') {
    errors.push('Parameter "description" must be a string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      file_path: params.file_path as string,
      content: params.content as string,
      description: params.description as string | undefined,
    },
  };
};

export const validateDirLsParams: ToolValidator<'dir_ls'> = (params) => {
  const errors: string[] = [];
  
  if (params.path !== undefined && typeof params.path !== 'string') {
    errors.push('Parameter "path" must be a string');
  }
  
  if (params.limit !== undefined) {
    if (typeof params.limit !== 'number' || params.limit < 1) {
      errors.push('Parameter "limit" must be a positive integer');
    }
  }
  
  if (params.description !== undefined && typeof params.description !== 'string') {
    errors.push('Parameter "description" must be a string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      path: params.path as string | undefined,
      limit: params.limit as number | undefined,
      description: params.description as string | undefined,
    },
  };
};

export const validateWebSearchParams: ToolValidator<'web_search'> = (params) => {
  const errors: string[] = [];
  
  if (!params.query || typeof params.query !== 'string') {
    errors.push('Required parameter "query" must be a non-empty string');
  }
  
  if (params.count !== undefined) {
    if (typeof params.count !== 'number' || params.count < 1 || params.count > 50) {
      errors.push('Parameter "count" must be a number between 1 and 50');
    }
  }
  
  if (params.offset !== undefined) {
    if (typeof params.offset !== 'number' || params.offset < 0) {
      errors.push('Parameter "offset" must be a non-negative number');
    }
  }
  
  if (params.domains !== undefined) {
    if (!Array.isArray(params.domains) || !params.domains.every((d) => typeof d === 'string')) {
      errors.push('Parameter "domains" must be an array of strings');
    }
  }
  
  if (params.recencyDays !== undefined) {
    if (typeof params.recencyDays !== 'number' || params.recencyDays < 1) {
      errors.push('Parameter "recencyDays" must be a positive number');
    }
  }
  
  if (params.lang !== undefined && typeof params.lang !== 'string') {
    errors.push('Parameter "lang" must be a string');
  }
  
  if (params.region !== undefined && typeof params.region !== 'string') {
    errors.push('Parameter "region" must be a string');
  }
  
  if (params.safe !== undefined && typeof params.safe !== 'boolean') {
    errors.push('Parameter "safe" must be a boolean');
  }
  
  if (params.type !== undefined) {
    if (params.type !== 'web' && params.type !== 'images') {
      errors.push('Parameter "type" must be either "web" or "images"');
    }
  }
  
  if (params.hydrateMeta !== undefined && typeof params.hydrateMeta !== 'boolean') {
    errors.push('Parameter "hydrateMeta" must be a boolean');
  }
  
  if (params.description !== undefined && typeof params.description !== 'string') {
    errors.push('Parameter "description" must be a string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      query: params.query as string,
      count: params.count as number | undefined,
      offset: params.offset as number | undefined,
      domains: params.domains as string[] | undefined,
      recencyDays: params.recencyDays as number | undefined,
      lang: params.lang as string | undefined,
      region: params.region as string | undefined,
      safe: params.safe as boolean | undefined,
      type: params.type as 'web' | 'images' | undefined,
      hydrateMeta: params.hydrateMeta as boolean | undefined,
      description: params.description as string | undefined,
    },
  };
};

export const validateWebFetchParams: ToolValidator<'web_fetch'> = (params) => {
  const errors: string[] = [];
  
  if (!params.url || typeof params.url !== 'string') {
    errors.push('Required parameter "url" must be a non-empty string');
  }
  
  if (params.description !== undefined && typeof params.description !== 'string') {
    errors.push('Parameter "description" must be a string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      url: params.url as string,
      description: params.description as string | undefined,
    },
  };
};

export const validateTodoWriteParams: ToolValidator<'todo_write'> = (params) => {
  const errors: string[] = [];
  
  if (!params.todos || !Array.isArray(params.todos)) {
    errors.push('Required parameter "todos" must be an array');
  } else {
    for (let i = 0; i < params.todos.length; i++) {
      const todo = params.todos[i];
      if (typeof todo !== 'object' || todo === null) {
        errors.push(`todos[${i}] must be an object`);
        continue;
      }
      
      if (!todo.id || typeof todo.id !== 'string') {
        errors.push(`todos[${i}].id must be a non-empty string`);
      }
      
      if (!todo.content || typeof todo.content !== 'string') {
        errors.push(`todos[${i}].content must be a non-empty string`);
      }
      
      if (!todo.status || !['pending', 'in_progress', 'completed'].includes(todo.status)) {
        errors.push(`todos[${i}].status must be one of: pending, in_progress, completed`);
      }
      
      if (!todo.priority || !['high', 'medium', 'low'].includes(todo.priority)) {
        errors.push(`todos[${i}].priority must be one of: high, medium, low`);
      }
      
      if (todo.createdAt !== undefined && typeof todo.createdAt !== 'string') {
        errors.push(`todos[${i}].createdAt must be a string`);
      }
    }
  }
  
  if (params.description !== undefined && typeof params.description !== 'string') {
    errors.push('Parameter "description" must be a string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      todos: params.todos as Array<{
        id: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed';
        priority: 'high' | 'medium' | 'low';
        createdAt?: string;
      }>,
      description: params.description as string | undefined,
    },
  };
};

export const validateAssignTaskParams: ToolValidator<'assign_task'> = (params) => {
  const errors: string[] = [];
  
  if (!params.agent || typeof params.agent !== 'string') {
    errors.push('Required parameter "agent" must be a non-empty string');
  }
  
  if (!params.task || typeof params.task !== 'string') {
    errors.push('Required parameter "task" must be a non-empty string');
  }
  
  if (!params.description || typeof params.description !== 'string') {
    errors.push('Required parameter "description" must be a non-empty string');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      agent: params.agent as string,
      task: params.task as string,
      description: params.description as string,
    },
  };
};

export const toolValidators: Partial<{
  [K in ToolName]: ToolValidator<K>;
}> = {
  bash_tool: validateBashToolParams,
  file_read: validateFileReadParams,
  file_edit: validateFileEditParams,
  file_new: validateFileNewParams,
  dir_ls: validateDirLsParams,
  web_search: validateWebSearchParams,
  web_fetch: validateWebFetchParams,
  todo_write: validateTodoWriteParams,
  assign_task: validateAssignTaskParams,
};
