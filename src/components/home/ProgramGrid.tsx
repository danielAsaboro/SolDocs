"use client";

import Link from "next/link";
import type { ProgramMetadata, AgentState } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { truncate, timeAgo } from "@/lib/utils";

function ProgramCard({ program }: { program: ProgramMetadata }) {
  return (
    <Link href={`/program/${program.programId}`} className="group block">
      <div className="rounded-xl border border-sol-border bg-sol-card p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-sol-purple">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-sol-text">
          {program.name}
          <Badge variant={program.status}>{program.status}</Badge>
        </h3>
        <div className="flex items-center gap-2">
          <div className="break-all font-mono text-xs text-sol-muted">
            {program.programId.slice(0, 16)}...{program.programId.slice(-4)}
          </div>
          <CopyButton
            text={program.programId}
            className="shrink-0 rounded-md border border-sol-border bg-sol-darker p-1 text-sol-muted opacity-0 transition-opacity hover:border-sol-purple hover:text-sol-text group-hover:opacity-100"
          />
        </div>
        {program.description && (
          <p className="mt-2 text-sm leading-relaxed text-sol-muted">
            {truncate(program.description, 150)}
          </p>
        )}
        <div className="mt-3 flex gap-4 text-xs text-sol-muted">
          <span>{program.instructionCount} instructions</span>
          <span>{program.accountCount} accounts</span>
          <span title={program.updatedAt}>{timeAgo(program.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ProgramGrid({
  programs,
  status,
}: {
  programs: ProgramMetadata[];
  status?: AgentState | null;
}) {
  if (programs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="text-4xl opacity-30">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-sol-muted"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
        </div>
        <p className="text-sol-muted">
          {status?.running
            ? status.queueLength > 0
              ? `Agent is processing ${status.queueLength} program${status.queueLength > 1 ? "s" : ""}...`
              : "Agent is running and looking for programs to document."
            : "No programs documented yet. Paste a program ID above to get started!"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {programs.map((p) => (
        <ProgramCard key={p.programId} program={p} />
      ))}
    </div>
  );
}
