import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/server/init";
import { isValidProgramId } from "@backend/solana/program-info";

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    if (!isValidProgramId(id)) {
      return NextResponse.json(
        { error: "Invalid program ID format" },
        { status: 400 }
      );
    }

    try {
      const store = getStore();
      const program = store.getProgram(id);
      if (!program) {
        return NextResponse.json(
          { error: "Program not found" },
          { status: 404 }
        );
      }
      const docs = store.getDocs(id);
      return NextResponse.json({ program, docs });
    } catch {
      return NextResponse.json(
        { error: "Invalid program ID" },
        { status: 400 }
      );
    }
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidProgramId(id)) {
    return NextResponse.json(
      { error: "Invalid program ID format" },
      { status: 400 }
    );
  }

  try {
    const store = getStore();
    const program = store.getProgram(id);
    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }
    await store.removeProgramSafe(id);
    await store.removeFromQueueSafe(id);
    store.removeDocs(id);
    store.removeIdlCache(id);
    return NextResponse.json({ message: "Program deleted" });
  } catch {
    return NextResponse.json(
      { error: "Invalid program ID" },
      { status: 400 }
    );
  }
}
