"use client";

import Link from "next/link";
import type { ProgramMetadata } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { truncate, timeAgo } from "@/lib/utils";

function ProgramCard({ program }: { program: ProgramMetadata }) {
  return (
    <Link href={`/program/${program.programId}`} className="block">
      <div className="rounded-xl border border-sol-border bg-sol-card p-5 transition-all hover:-translate-y-0.5 hover:border-sol-purple">
        <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-sol-text">
          {program.name}
          <Badge variant={program.status}>{program.status}</Badge>
        </h3>
        <div className="break-all font-mono text-xs text-sol-muted">
          {program.programId}
        </div>
        {program.description && (
          <p className="mt-2 text-sm leading-relaxed text-sol-muted">
            {truncate(program.description, 150)}
          </p>
        )}
        <div className="mt-3 flex gap-4 text-xs text-sol-muted">
          <span>{program.instructionCount} instructions</span>
          <span>{program.accountCount} accounts</span>
          <span>{timeAgo(program.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ProgramGrid({ programs }: { programs: ProgramMetadata[] }) {
  if (programs.length === 0) {
    return (
      <div className="py-12 text-center text-sol-muted">
        No programs documented yet. The agent is working on it, or add one
        above!
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
