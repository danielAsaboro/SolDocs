"use client";

import Link from "next/link";
import { NavLink } from "./NavLink";
import { StatusDot } from "@/components/ui/StatusDot";
import { useAgentStatus } from "@/hooks/useAgentStatus";

export function Header() {
  const status = useAgentStatus();

  return (
    <header className="border-b border-sol-border bg-sol-dark">
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-4 py-4 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-sol-text no-underline"
        >
          <span className="text-3xl text-sol-green">&#9670;</span>
          SolDocs
        </Link>

        <span className="hidden text-sm text-sol-muted sm:inline">
          AI-powered Solana documentation
        </span>

        <nav className="ml-auto flex items-center gap-4">
          <NavLink href="/">Programs</NavLink>
          <NavLink href="/queue">Queue</NavLink>

          <div className="flex items-center gap-2 rounded-full border border-sol-border bg-sol-card px-3 py-1.5 text-xs text-sol-muted">
            <StatusDot active={status?.running ?? false} />
            <span>
              {status
                ? status.running
                  ? `${status.programsDocumented} documented`
                  : "Stopped"
                : "..."}
            </span>
          </div>
        </nav>
      </div>
    </header>
  );
}
