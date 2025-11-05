import type React from 'react';
import type { ToolParamRendererProps } from './types.js';

export const TodoWriteParamRender: React.FC<ToolParamRendererProps> = ({ args }: ToolParamRendererProps) => {
  const { todos } = (args as { todos?: unknown[] }) || {};

  let displayInfo = {};

  if (Array.isArray(todos)) {
    displayInfo = { todo_count: todos.length };
  } else if (todos !== undefined) {
    // If todos exists but isn't an array, fall back to showing other args
    const { todos: _, ...otherArgs } = args;
    displayInfo = otherArgs;
  } else {
    displayInfo = args;
  }

  const displayArgs = Object.entries(displayInfo);

  if (displayArgs.length === 0) {
    return null;
  }

  return null;
};
