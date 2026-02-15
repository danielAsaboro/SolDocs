import type { ProgramMetadata, Documentation } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/ui/CopyButton";
import { timeAgo } from "@/lib/utils";

export function ProgramHeader({
  program,
  docs,
}: {
  program: ProgramMetadata;
  docs: Documentation | null;
}) {
  return (
    <div className="mb-6">
      <h1 className="mb-2 flex flex-wrap items-center gap-3 text-2xl font-bold text-sol-text">
        {docs?.name || program.name}
        <Badge variant={program.status}>{program.status}</Badge>
      </h1>
      <div className="flex items-center gap-2">
        <div className="break-all font-mono text-sm text-sol-muted">
          {program.programId}
        </div>
        <CopyButton text={program.programId} />
      </div>
      {docs && (
        <div className="mt-2 text-xs text-sol-muted">
          Generated {timeAgo(docs.generatedAt)} &middot;{" "}
          {program.instructionCount} instructions &middot;{" "}
          {program.accountCount} accounts
        </div>
      )}
      {program.errorMessage && (
        <p className="mt-2 text-sm text-red-400">{program.errorMessage}</p>
      )}
    </div>
  );
}
