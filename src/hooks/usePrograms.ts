"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProgramMetadata } from "@/lib/types";
import { getPrograms } from "@/lib/api";

export function usePrograms() {
  const [programs, setPrograms] = useState<ProgramMetadata[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPrograms({
        search: search || undefined,
        page,
        limit: 50,
      });
      setPrograms(data.programs);
      setTotal(data.total);
    } catch {
      setError("Failed to load programs. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return { programs, total, loading, error, search, setSearch, page, setPage, refresh };
}
