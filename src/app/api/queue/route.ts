import { NextResponse } from "next/server";
import { getStore } from "@/server/init";

export function GET() {
  const store = getStore();
  const queue = store.getQueue();
  return NextResponse.json({ queue, total: queue.length });
}
