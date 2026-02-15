"use client";

import Link from "next/link";
import type { QueueItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils";

export function QueueTable({
  queue,
  loading,
}: {
  queue: QueueItem[];
  loading: boolean;
}) {
  if (loading) {
    return <p className="py-8 text-center text-sol-muted">Loading queue...</p>;
  }

  if (queue.length === 0) {
    return (
      <p className="py-8 text-center text-sol-muted">
        Queue is empty. All programs are processed!
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-sol-border">
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
                <Link
                  href={`/program/${item.programId}`}
                  className="font-mono text-xs text-sol-link hover:underline"
                >
                  {item.programId.slice(0, 16)}...
                </Link>
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
              <td className="max-w-[200px] truncate px-4 py-3 text-xs text-red-400">
                {item.lastError || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
