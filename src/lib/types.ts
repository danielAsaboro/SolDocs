// Frontend mirror of backend types (src/types.ts)
// Only includes what the frontend needs for rendering

export interface ProgramMetadata {
  programId: string;
  name: string;
  description: string;
  instructionCount: number;
  accountCount: number;
  status: "pending" | "processing" | "documented" | "failed";
  idlHash: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface Documentation {
  programId: string;
  name: string;
  overview: string;
  instructions: string;
  accounts: string;
  security: string;
  fullMarkdown: string;
  generatedAt: string;
  idlHash: string;
}

export interface QueueItem {
  programId: string;
  status: "pending" | "processing" | "failed";
  addedAt: string;
  attempts: number;
  lastError?: string;
}

export interface AgentState {
  running: boolean;
  programsDocumented: number;
  programsFailed: number;
  totalProcessed: number;
  queueLength: number;
  lastRunAt: string | null;
  startedAt: string;
  errors: AgentError[];
}

export interface AgentError {
  programId: string;
  message: string;
  timestamp: string;
}

export interface ProgramListResponse {
  programs: ProgramMetadata[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProgramDetailResponse {
  program: ProgramMetadata;
  docs: Documentation | null;
}

export interface QueueResponse {
  queue: QueueItem[];
  total: number;
}

// Anchor IDL (simplified for frontend display)
export interface AnchorIdl {
  version?: string;
  name?: string;
  address?: string;
  instructions: unknown[];
  accounts?: unknown[];
  types?: unknown[];
  events?: unknown[];
  errors?: unknown[];
  metadata?: { name?: string; version?: string; spec?: string; [key: string]: unknown };
}
