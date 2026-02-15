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
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-sol-link hover:underline"
      >
        &larr; Back to programs
      </Link>

      <ProgramHeader program={program} docs={docs} />

      {docs ? (
        <DocTabs docs={docs} idl={idl} programName={docs.name || program.name} />
      ) : (
        <div className="py-12 text-center">
          <p className="text-sol-muted">
            Documentation is being generated...
          </p>
          <p className="mt-2 text-sm text-sol-muted">
            Check back in a few minutes.
          </p>
        </div>
      )}
    </>
  );
}
