import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgram, getProgramIdl } from "@/lib/api";
import { ProgramHeader } from "@/components/program/ProgramHeader";
import { DocTabs } from "@/components/program/DocTabs";
import type { AnchorIdl } from "@/lib/types";

// ISR: revalidate every 60 seconds
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const { program, docs } = await getProgram(id);
    return {
      title: `${docs?.name || program.name} - SolDocs`,
      description: docs?.overview?.slice(0, 160) || program.description,
    };
  } catch {
    return { title: "Program - SolDocs" };
  }
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let programData;
  try {
    programData = await getProgram(id);
  } catch {
    notFound();
  }

  const { program, docs } = programData;

  let idl: AnchorIdl | null = null;
  try {
    const idlData = await getProgramIdl(id);
    idl = (idlData as { idl?: AnchorIdl }).idl || null;
  } catch {
    // IDL may not exist
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-sol-muted">
        <Link href="/" className="text-sol-link hover:underline">
          Programs
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-sol-text">{docs?.name || program.name}</span>
      </nav>

      <ProgramHeader program={program} docs={docs} />

      {docs ? (
        <DocTabs docs={docs} idl={idl} programName={docs.name || program.name} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <svg className="animate-spin text-sol-purple" width="32" height="32" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-sol-muted">
            Documentation is being generated...
          </p>
          <p className="text-sm text-sol-muted">
            This typically takes 2-5 minutes. Check the{" "}
            <Link href="/queue" className="text-sol-link hover:underline">
              queue page
            </Link>{" "}
            for progress.
          </p>
        </div>
      )}
    </>
  );
}
