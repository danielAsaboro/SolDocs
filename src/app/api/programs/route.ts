import { NextRequest, NextResponse } from "next/server";
import { getServerContext, getStore } from "@/server/init";
import { isValidProgramId } from "@/server/solana/program-info";

export function GET(request: NextRequest) {
  const store = getStore();
  let programs = store.getProgramIndex();

  // Search filter
  const search = (request.nextUrl.searchParams.get("search") || "").toLowerCase();
  if (search) {
    programs = programs.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.programId.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
    );
  }

  // Sort by most recently updated
  programs.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Pagination
  const rawPage = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10);
  const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 50 : rawLimit));
  const total = programs.length;
  const offset = (page - 1) * limit;
  const paginated = programs.slice(offset, offset + limit);

  return NextResponse.json({
    programs: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { programId } = body;

    if (!programId || typeof programId !== "string") {
      return NextResponse.json(
        { error: "programId is required" },
        { status: 400 }
      );
    }

    if (!isValidProgramId(programId.trim())) {
      return NextResponse.json(
        { error: "Invalid Solana program ID" },
        { status: 400 }
      );
    }

    const store = getStore();
    const trimmed = programId.trim();
    const { item, isNew } = await store.addToQueueSafe(trimmed);

    if (isNew) {
      return NextResponse.json(
        { message: "Program added to queue", item },
        { status: 202 }
      );
    } else if (item.status === "pending") {
      return NextResponse.json({
        message: "Program re-queued for processing",
        item,
      });
    } else {
      return NextResponse.json({ message: "Program already in queue", item });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
