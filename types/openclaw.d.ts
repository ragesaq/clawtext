/**
 * OpenClaw Runtime Type Definitions
 * 
 * These are simplified type definitions for the OpenClaw extension API
 */

export interface OpenClawRuntime {
  /** Configuration access */
  config?: {
    get: (key: string) => Promise<any>;
    set?: (key: string, value: any) => Promise<void>;
  };
  
  /** Memory store with search capability */
  memory?: MemoryStore & {
    search: (query: string, options?: MemorySearchOptions) => Promise<Memory[]>;
  };
  
  /** Lifecycle hooks */
  hooks?: {
    onSessionStart?: (handler: SessionHandler) => void;
    onSessionEnd?: (handler: SessionHandler) => void;
    onMemoryCreate?: (handler: MemoryHandler) => void;
  };
  
  /** Task scheduler */
  scheduler?: {
    schedule: (cronExpression: string, handler: () => Promise<void>) => void;
    cancel?: (id: string) => void;
  };
  
  /** CLI commands */
  commands?: {
    register: (name: string, handler: CommandHandler) => void;
    unregister?: (name: string) => void;
  };
  
  /** Metrics reporting */
  metrics?: {
    gauge: (name: string, value: number, tags?: Record<string, string>) => void;
    counter?: (name: string, value?: number, tags?: Record<string, string>) => void;
    histogram?: (name: string, value: number, tags?: Record<string, string>) => void;
  };
  
  /** Logger */
  logger?: {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
  };
}

export interface MemoryStore {
  search: (query: string, options?: MemorySearchOptions) => Promise<Memory[]>;
  get?: (id: string) => Promise<Memory | null>;
  create?: (memory: Partial<Memory>) => Promise<Memory>;
  update?: (id: string, memory: Partial<Memory>) => Promise<Memory>;
  delete?: (id: string) => Promise<void>;
}

export interface Memory {
  id: string;
  content: string;
  path?: string;
  startLine?: number;
  endLine?: number;
  score?: number;
  metadata?: MemoryMetadata;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemoryMetadata {
  type?: 'preference' | 'decision' | 'fact' | 'project_context' | 'code' | string;
  confidence?: number;
  project?: string;
  tags?: string[];
  pinned?: boolean;
  [key: string]: any;
}

export interface MemorySearchOptions {
  maxResults?: number;
  projectId?: string;
  types?: string[];
  minConfidence?: number;
  recencyBoost?: boolean;
  [key: string]: any;
}

export interface Session {
  id: string;
  topic?: string;
  userQuery?: string;
  projectId?: string;
  metadata?: SessionMetadata;
  context?: string;
  setContext?: (context: string) => void;
  getContext?: () => string;
}

export interface SessionMetadata {
  startTime?: Date;
  userId?: string;
  channel?: string;
  [key: string]: any;
}

export type SessionHandler = (session: Session) => Promise<any>;
export type MemoryHandler = (memory: Memory) => Promise<void>;
export type CommandHandler = () => Promise<{ content: string; type: string } | string>;

// Extension exports
export interface Extension {
  name: string;
  version: string;
  description?: string;
  register: (runtime: OpenClawRuntime) => Promise<void>;
  unregister?: (runtime: OpenClawRuntime) => Promise<void>;
}