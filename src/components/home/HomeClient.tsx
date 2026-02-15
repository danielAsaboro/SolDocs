"use client";

import { usePrograms } from "@/hooks/usePrograms";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { SearchBar } from "./SearchBar";
import { AddProgramForm } from "./AddProgramForm";
import { StatsBar } from "./StatsBar";
import { ProgramGrid } from "./ProgramGrid";
import { Skeleton } from "@/components/ui/Skeleton";

export function HomeClient() {
  const { programs, loading, error, search, setSearch, refresh } =
    usePrograms();
  const status = useAgentStatus();

  return (
    <>
      <SearchBar value={search} onChange={setSearch} />
      <AddProgramForm onAdded={refresh} />
      <StatsBar status={status} />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </div>
          <button
            onClick={refresh}
            className="rounded-lg border border-sol-border bg-sol-card px-4 py-2 text-sm text-sol-text transition-colors hover:border-sol-purple"
          >
            Retry
          </button>
        </div>
      ) : (
        <ProgramGrid programs={programs} status={status} />
      )}
    </>
  );
}
