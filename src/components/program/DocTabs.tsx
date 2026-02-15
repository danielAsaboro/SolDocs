"use client";

import { useState } from "react";
import type { Documentation, AnchorIdl } from "@/lib/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { IdlViewer } from "./IdlViewer";
import { DownloadButton } from "./DownloadButton";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "instructions" | "accounts" | "security" | "full" | "idl";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "instructions", label: "Instructions" },
  { key: "accounts", label: "Accounts & Types" },
  { key: "security", label: "Security" },
  { key: "full", label: "Full Docs" },
  { key: "idl", label: "Raw IDL" },
];

export function DocTabs({
  docs,
  idl,
  programName,
}: {
  docs: Documentation;
  idl: AnchorIdl | null;
  programName: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <>
      {/* Tab bar — scrollable on mobile, with download button below on small screens */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
        <div className="flex items-center gap-0 overflow-x-auto border-b border-sol-border scrollbar-thin">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors sm:px-5",
                activeTab === tab.key
                  ? "border-sol-green text-sol-green"
                  : "border-transparent text-sol-muted hover:text-sol-text"
              )}
              aria-selected={activeTab === tab.key}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto">
          <DownloadButton markdown={docs.fullMarkdown} filename={programName} />
        </div>
      </div>

      {activeTab === "idl" ? (
        idl ? (
          <IdlViewer idl={idl} />
        ) : (
          <div className="py-8 text-center text-sol-muted">
            IDL not available
          </div>
        )
      ) : (
        <MarkdownRenderer
          content={
            activeTab === "overview"
              ? docs.overview
              : activeTab === "instructions"
                ? docs.instructions
                : activeTab === "accounts"
                  ? docs.accounts
                  : activeTab === "security"
                    ? docs.security
                    : docs.fullMarkdown
          }
        />
      )}
    </>
  );
}
