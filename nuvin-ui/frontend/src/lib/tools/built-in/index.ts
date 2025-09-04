import { toolRegistry } from '../tool-registry';
import { bashTool } from './bashTool';
import { todoWriteTool } from './todoWriteTool';
import { taskTool } from './taskTool';
import { readFileTool } from './readFileTool';
import { editFileTool } from './editFileTool';
import { newFileTool } from './newFileTool';

export * from './bashTool';
export * from './todoWriteTool';
export * from './taskTool';
export * from './readFileTool';
export * from './editFileTool';
export * from './newFileTool';

/**
 * Register all built-in tools with the tool registry
 */
export function registerBuiltInTools(): void {
  try {
    toolRegistry.registerTool(bashTool);
    toolRegistry.registerTool(todoWriteTool);
    toolRegistry.registerTool(taskTool);
    toolRegistry.registerTool(readFileTool);
    toolRegistry.registerTool(editFileTool);
    toolRegistry.registerTool(newFileTool);
  } catch (error) {
    console.error('Failed to register built-in tools:', error);
  }
}

/**
 * Get all built-in tools
 */
export function getBuiltInTools() {
  return [bashTool, todoWriteTool, taskTool, readFileTool, editFileTool, newFileTool];
}
