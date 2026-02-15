export interface ProgramMetadata {
  programId: string;
  name: string;
  description: string;
  instructionCount: number;
  accountCount: number;
  status: 'pending' | 'processing' | 'documented' | 'failed';
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

export interface IdlCache {
  programId: string;
  idl: AnchorIdl;
  hash: string;
  fetchedAt: string;
}

export interface QueueItem {
  programId: string;
  status: 'pending' | 'processing' | 'failed';
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

// Anchor IDL types
export interface AnchorIdl {
  version?: string;
  name?: string;
  address?: string;
  instructions: AnchorInstruction[];
  accounts?: AnchorAccountDef[];
  types?: AnchorTypeDef[];
  events?: AnchorEvent[];
  errors?: AnchorError[];
  metadata?: { name?: string; version?: string; spec?: string; [key: string]: unknown };
}

// Helper to get the program name from either IDL v1 (name) or v2 (metadata.name) format
export function getIdlName(idl: AnchorIdl): string {
  return idl.name || idl.metadata?.name || 'unknown_program';
}

export function getIdlVersion(idl: AnchorIdl): string {
  return idl.version || idl.metadata?.version || '0.0.0';
}

export interface AnchorInstruction {
  name: string;
  docs?: string[];
  accounts: AnchorAccountItem[];
  args: AnchorArg[];
  returns?: unknown;
}

export interface AnchorAccountItem {
  name: string;
  isMut: boolean;
  isSigner: boolean;
  docs?: string[];
  optional?: boolean;
  pda?: unknown;
}

export interface AnchorArg {
  name: string;
  type: unknown;
  docs?: string[];
}

export interface AnchorAccountDef {
  name: string;
  type: {
    kind: string;
    fields: AnchorField[];
  };
}

export interface AnchorTypeDef {
  name: string;
  type: {
    kind: string;
    fields?: AnchorField[];
    variants?: AnchorVariant[];
  };
}

export interface AnchorField {
  name: string;
  type: unknown;
  docs?: string[];
}

export interface AnchorVariant {
  name: string;
  fields?: unknown[];
}

export interface AnchorEvent {
  name: string;
  fields: AnchorField[];
}

export interface AnchorError {
  code: number;
  name: string;
  msg?: string;
}
