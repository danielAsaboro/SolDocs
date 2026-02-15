"use client";

export function DownloadButton({
  markdown,
  filename,
}: {
  markdown: string;
  filename: string;
}) {
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
  }

  return (
    <button
      onClick={handleDownload}
      className="ml-auto self-center rounded-lg border border-sol-border bg-sol-card px-4 py-2 text-xs text-sol-text transition-colors hover:border-sol-green hover:text-sol-green"
    >
      Download .md
    </button>
  );
}
