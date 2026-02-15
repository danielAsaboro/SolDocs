"use client";

import { useToast } from "@/components/ui/Toast";

export function DownloadButton({
  markdown,
  filename,
}: {
  markdown: string;
  filename: string;
}) {
  const { toast } = useToast();

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Downloaded ${filename}.md`, "success");
  }

  return (
    <button
      onClick={handleDownload}
      className="inline-flex items-center gap-2 self-center rounded-lg border border-sol-border bg-sol-card px-4 py-2 text-xs text-sol-text transition-colors hover:border-sol-green hover:text-sol-green"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
      Download .md
    </button>
  );
}
