"use client";

import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

export function MarkdownRenderer({ content }: { content: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(content || "*No content available*") as string;
    return DOMPurify.sanitize(raw, {
      ADD_TAGS: ["code"],
      ADD_ATTR: ["class"],
    });
  }, [content]);

  return (
    <div
      className="prose-soldocs rounded-xl border border-sol-border bg-sol-card p-6 sm:p-8"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
