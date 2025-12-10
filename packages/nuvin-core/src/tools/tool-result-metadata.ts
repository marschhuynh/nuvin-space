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
  changesMade?: {
    linesAdded: number;
    linesRemoved: number;
    bytesChanged: number;
  };
  backup?: {
    path: string;
    created: string;
  };
};

export type FileNewMetadata = FileMetadata & {
  overwritten?: boolean;
};

export type DirLsMetadata = {
  path: string;
  totalEntries?: number;
  entriesReturned?: number;
  truncated?: boolean;
};

export type WebSearchMetadata = {
  query: string;
  totalResults?: number;
  resultsReturned: number;
  searchTime?: number;
  provider?: string;
};

export type WebFetchMetadata = {
  url: string;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
  fetchTime?: number;
  markdown?: boolean;
};

export type TodoWriteMetadata = {
  todosWritten: number;
  conversationId?: string;
};

export type AssignTaskMetadata = DelegationMetadata;

export type ToolErrorMetadata = {
  errorReason?: ErrorReason;
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
