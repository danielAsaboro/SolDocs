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
        <div className="py-12 text-center text-red-400">{error}</div>
      ) : (
        <ProgramGrid programs={programs} />
      )}
    </>
  );
}
