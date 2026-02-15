"use client";

import type { AgentState } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/StatusDot";
import { timeAgo, formatNumber } from "@/lib/utils";

export function AgentStatusCard({ status }: { status: AgentState | null }) {
  if (!status) {
    return (
      <Card className="mb-8">
        <p className="text-center text-sol-muted">Loading agent status...</p>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <StatusDot active={status.running} />
        <h2 className="text-lg font-bold text-sol-text">
          Agent {status.running ? "Running" : "Stopped"}
        </h2>
        {status.lastRunAt && (
          <span className="text-xs text-sol-muted">
            Last run {timeAgo(status.lastRunAt)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <div className="text-xl font-bold text-sol-green">
            {formatNumber(status.programsDocumented)}
          </div>
          <div className="text-xs text-sol-muted">Documented</div>
        </div>
        <div>
          <div className="text-xl font-bold text-sol-text">
            {formatNumber(status.queueLength)}
          </div>
          <div className="text-xs text-sol-muted">In Queue</div>
        </div>
        <div>
          <div className="text-xl font-bold text-sol-text">
            {formatNumber(status.totalProcessed)}
          </div>
          <div className="text-xs text-sol-muted">Processed</div>
        </div>
        <div>
          <div className="text-xl font-bold text-red-400">
            {formatNumber(status.programsFailed)}
          </div>
          <div className="text-xs text-sol-muted">Failed</div>
        </div>
      </div>

      {status.errors.length > 0 && (
        <div className="mt-4 border-t border-sol-border pt-4">
          <h3 className="mb-2 text-sm font-semibold text-sol-muted">
            Recent Errors
          </h3>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {status.errors.slice(0, 5).map((err, i) => (
              <div key={i} className="text-xs">
                <span className="font-mono text-red-400">
                  {err.programId.slice(0, 8)}...
                </span>{" "}
                <span className="text-sol-muted">{err.message}</span>
                <span className="ml-2 text-sol-muted/60">
                  {timeAgo(err.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
