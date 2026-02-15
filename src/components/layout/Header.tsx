"use client";

import { useState } from "react";
import Link from "next/link";
import { NavLink } from "./NavLink";
import { StatusDot } from "@/components/ui/StatusDot";
import { useAgentStatus } from "@/hooks/useAgentStatus";

export function Header() {
  const status = useAgentStatus();
  const [menuOpen, setMenuOpen] = useState(false);

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

        {/* Desktop nav */}
        <nav className="ml-auto hidden items-center gap-4 sm:flex">
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="ml-auto flex items-center sm:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-sol-border bg-sol-dark px-4 pb-4 sm:hidden">
          <nav className="flex flex-col gap-3 pt-3">
            <NavLink href="/">Programs</NavLink>
            <NavLink href="/queue">Queue</NavLink>
            <div className="flex items-center gap-2 text-xs text-sol-muted">
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
      )}
    </header>
  );
}
