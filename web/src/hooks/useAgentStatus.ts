"use client";

import { useState, useEffect } from "react";
import type { AgentState } from "@/lib/types";
import { getAgentStatus } from "@/lib/api";

export function useAgentStatus(intervalMs = 10000) {
  const [status, setStatus] = useState<AgentState | null>(null);

  useEffect(() => {
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
  }, [intervalMs]);

  return status;
}
