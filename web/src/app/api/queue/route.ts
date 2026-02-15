import { NextResponse } from "next/server";
import { getStore } from "@/lib/server/init";

export function GET() {
  const store = getStore();
  const queue = store.getQueue();
  return NextResponse.json({ queue, total: queue.length });
}
