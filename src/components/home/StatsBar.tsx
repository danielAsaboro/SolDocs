"use client";

import type { AgentState } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[140px] rounded-xl border border-sol-border bg-sol-card px-6 py-4 text-center">
      <div className="text-2xl font-bold text-sol-green">
        {formatNumber(value)}
      </div>
      <div className="mt-1 text-xs text-sol-muted">{label}</div>
    </div>
  );
}

export function StatsBar({ status }: { status: AgentState | null }) {
  if (!status) return null;

  return (
    <div className="mb-8 flex flex-wrap justify-center gap-4">
      <Stat value={status.programsDocumented} label="Documented" />
      <Stat value={status.queueLength} label="In Queue" />
      <Stat value={status.totalProcessed} label="Processed" />
      <Stat value={status.programsFailed} label="Failed" />
    </div>
  );
}
