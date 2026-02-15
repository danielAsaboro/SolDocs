"use client";

import { useState, useEffect } from "react";
import type { AgentState } from "@/lib/types";
import { getAgentStatus } from "@/lib/api";
import { usePageVisible } from "./usePageVisible";

export function useAgentStatus(intervalMs = 10000) {
  const [status, setStatus] = useState<AgentState | null>(null);
  const visible = usePageVisible();

  useEffect(() => {
    if (!visible) return;

    let mounted = true;

    async function poll() {
      try {
        const data = await getAgentStatus();
        if (mounted) setStatus(data);
      } catch {
        // Server not ready
      }
    }

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs, visible]);

  return status;
}
