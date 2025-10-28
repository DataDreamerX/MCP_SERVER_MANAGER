export enum ServerStatus {
  ONLINE = 'Online',
  OFFLINE = 'Offline',
  STARTING = 'Starting',
  STOPPING = 'Stopping',
}

export enum TransportType {
  SSE = 'sse',
  STREAMABLE_HTTP = 'streamable-http',
}

export interface SourceFile {
  path: string;
  content: string;
}

export interface ServerConfig {
  id: string;
  name: string;
  command: string;
  status: ServerStatus;
  transport: TransportType;
  endpoint: string;
  agentsRunning: number;
  maxAgents: number;
  sourceFiles?: SourceFile[];
  createdBy: string;
  lastModified: string;
  isPublic: boolean;
}
