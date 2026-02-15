import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/server/init";
import { isValidProgramId } from "@/server/solana/program-info";
import { getIdlName } from "@/server/types";
import type { AnchorIdl } from "@/server/types";

export async function GET(
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
    const cached = store.getIdlCache(id);
    if (!cached) {
      return NextResponse.json({ error: "IDL not found" }, { status: 404 });
    }
    return NextResponse.json(cached);
  } catch {
    return NextResponse.json(
      { error: "Invalid program ID" },
      { status: 400 }
    );
  }
}

export async function POST(
  request: NextRequest,
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
    const idl = (await request.json()) as AnchorIdl;
    if (
      !idl ||
      !idl.instructions ||
      !Array.isArray(idl.instructions) ||
      !getIdlName(idl) ||
      getIdlName(idl) === "unknown_program"
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid IDL format. Must have "name" (or "metadata.name") and "instructions" array.',
        },
        { status: 400 }
      );
    }

    const store = getStore();
    store.saveIdlCache(id, idl);
    await store.addToQueueSafe(id);
    return NextResponse.json(
      {
        message: "IDL uploaded and program queued for documentation",
        programId: id,
      },
      { status: 202 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to save IDL" },
      { status: 400 }
    );
  }
}
