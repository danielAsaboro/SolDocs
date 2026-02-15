import { NextResponse } from "next/server";
import { getServerContext } from "@/lib/server/init";

export function GET() {
  try {
    const { agent } = getServerContext();
    return NextResponse.json(agent.getState());
  } catch {
    // If backend not configured, return a minimal offline state
    return NextResponse.json({
      running: false,
      programsDocumented: 0,
      programsFailed: 0,
      totalProcessed: 0,
      queueLength: 0,
      lastRunAt: null,
      startedAt: new Date().toISOString(),
      errors: [],
    });
  }
}
