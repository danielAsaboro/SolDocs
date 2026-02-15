"use client";

import Link from "next/link";
import type { QueueItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { timeAgo } from "@/lib/utils";

function QueueCardMobile({ item }: { item: QueueItem }) {
  return (
    <div className="rounded-xl border border-sol-border bg-sol-card p-4 sm:hidden">
      <div className="mb-2 flex items-center justify-between">
        <Badge variant={item.status}>{item.status}</Badge>
        <span className="text-xs text-sol-muted">{timeAgo(item.addedAt)}</span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Link
          href={`/program/${item.programId}`}
          className="break-all font-mono text-xs text-sol-link hover:underline"
        >
          {item.programId}
        </Link>
        <CopyButton
          text={item.programId}
          className="shrink-0 rounded-md border border-sol-border bg-sol-darker p-1 text-sol-muted hover:border-sol-purple hover:text-sol-text"
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-sol-muted">
        <span>Attempts: {item.attempts}</span>
        {item.lastError && (
          <span className="truncate text-red-400" title={item.lastError}>
            {item.lastError}
          </span>
        )}
      </div>
    </div>
  );
}

export function QueueTable({
  queue,
  loading,
}: {
  queue: QueueItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sol-green"><polyline points="20 6 9 17 4 12" /></svg>
        <p className="text-sol-muted">
          All programs processed! Agent is ready for new submissions.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="flex flex-col gap-3 sm:hidden">
        {queue.map((item) => (
          <QueueCardMobile key={item.programId} item={item} />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden overflow-x-auto rounded-xl border border-sol-border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-sol-border bg-sol-darker">
              <th className="px-4 py-3 text-left font-semibold text-sol-text">
                Program ID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-sol-text">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-sol-text">
                Added
              </th>
              <th className="px-4 py-3 text-left font-semibold text-sol-text">
                Attempts
              </th>
              <th className="px-4 py-3 text-left font-semibold text-sol-text">
                Error
              </th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => (
              <tr
                key={item.programId}
                className="border-b border-sol-border last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/program/${item.programId}`}
                      className="font-mono text-xs text-sol-link hover:underline"
                      title={item.programId}
                    >
                      {item.programId.slice(0, 16)}...{item.programId.slice(-4)}
                    </Link>
                    <CopyButton
                      text={item.programId}
                      className="shrink-0 rounded-md border border-sol-border bg-sol-darker p-1 text-sol-muted opacity-0 transition-opacity hover:border-sol-purple hover:text-sol-text [tr:hover_&]:opacity-100"
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={item.status}>{item.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-sol-muted">
                  {timeAgo(item.addedAt)}
                </td>
                <td className="px-4 py-3 text-xs text-sol-muted">
                  {item.attempts}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-xs text-red-400" title={item.lastError || undefined}>
                  {item.lastError || "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
