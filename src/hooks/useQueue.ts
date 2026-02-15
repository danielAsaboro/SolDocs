"use client";

import { useState, useEffect } from "react";
import type { QueueItem } from "@/lib/types";
import { getQueue } from "@/lib/api";
import { usePageVisible } from "./usePageVisible";

export function useQueue(intervalMs = 5000) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const visible = usePageVisible();

  useEffect(() => {
    if (!visible) return;

    let mounted = true;

    async function poll() {
      try {
        const data = await getQueue();
        if (mounted) {
          setQueue(data.queue);
          setTotal(data.total);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs, visible]);

  return { queue, total, loading };
}
