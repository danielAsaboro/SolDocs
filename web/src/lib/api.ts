import type {
  AgentState,
  ProgramListResponse,
  ProgramDetailResponse,
  QueueResponse,
  AnchorIdl,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new APIError(
      (body as { error?: string }).error || res.statusText,
      res.status
    );
  }
  return res.json();
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "APIError";
  }
}

// Health
export function getHealth() {
  return fetchJSON<{ status: string; timestamp: string }>("/api/health");
}

// Agent
export function getAgentStatus() {
  return fetchJSON<AgentState>("/api/agent/status");
}

// Programs
export function getPrograms(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return fetchJSON<ProgramListResponse>(`/api/programs${qs ? `?${qs}` : ""}`);
}

export function getProgram(id: string) {
  return fetchJSON<ProgramDetailResponse>(
    `/api/programs/${encodeURIComponent(id)}`
  );
}

export function getProgramIdl(id: string) {
  return fetchJSON<{ idl: AnchorIdl }>(
    `/api/programs/${encodeURIComponent(id)}/idl`
  );
}

export function addProgram(programId: string) {
  return fetchJSON<{ message: string; item: unknown }>("/api/programs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ programId }),
  });
}

export function deleteProgram(id: string) {
  return fetchJSON<{ message: string }>(
    `/api/programs/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

// Queue
export function getQueue() {
  return fetchJSON<QueueResponse>("/api/queue");
}
