import type { ErrorReason } from '../ports.js';
import type {
  FileMetadata,
  LineRangeMetadata,
  CommandMetadata,
  DelegationMetadata,
} from './metadata-types.js';

export type BashToolMetadata = CommandMetadata & {
  stdout?: string;
  stderr?: string;
  stripped?: boolean;
};

export type FileReadMetadata = FileMetadata & {
  lineRange?: LineRangeMetadata;
  encoding?: string;
  bomStripped?: boolean;
};

export type FileEditMetadata = FileMetadata & {
  eol: 'lf' | 'crlf';
  oldTextLength: number;
  newTextLength: number;
  bytesWritten: number;
  beforeSha: string;
  afterSha: string;
  dryRun: boolean;
  lineNumbers: {
    oldStartLine: number;
    oldEndLine: number;
    newStartLine: number;
    newEndLine: number;
    oldLineCount: number;
    newLineCount: number;
  };
  noChange?: boolean;
};

export type FileNewMetadata = {
  file_path: string;
  bytes: number;
  lines: number;
  created: string;
  overwritten?: boolean;
};

export type DirLsMetadata = {
  limit: number;
  includeHidden: boolean;
};

export type WebSearchMetadata = {
  offset: number;
  totalRequested: number;
  hydrated: boolean;
};

export type WebFetchMetadata = {
  url: string;
  contentType: string;
  statusCode: number;
  format: 'markdown' | 'json' | 'text';
  size: number;
  fetchedAt: string;
};

export type TodoWriteMetadata = {
  todosWritten: number;
  conversationId: string;
  recentChanges: boolean;
  progress: string;
  allCompleted: boolean;
  items: Array<{
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'high' | 'medium' | 'low';
    createdAt: string;
  }>;
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
};

export type AssignTaskMetadata = DelegationMetadata;

export type ToolErrorMetadata = {
  errorReason?: ErrorReason;
  editInstruction?: string;
  path?: string;
  agentId?: string;
  code?: string | number;
  stackTrace?: string;
  retryable?: boolean;
};

export type ToolMetadataMap = {
  bash_tool: BashToolMetadata;
  file_read: FileReadMetadata;
  file_edit: FileEditMetadata;
  file_new: FileNewMetadata;
  dir_ls: DirLsMetadata;
  web_search: WebSearchMetadata;
  web_fetch: WebFetchMetadata;
  todo_write: TodoWriteMetadata;
  assign_task: AssignTaskMetadata;
};

export type ToolName = keyof ToolMetadataMap;
