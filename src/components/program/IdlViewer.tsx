"use client";

import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

SyntaxHighlighter.registerLanguage("json", json);

export function IdlViewer({ idl }: { idl: unknown }) {
  const code = JSON.stringify(idl, null, 2);

  return (
    <div className="overflow-hidden rounded-xl border border-sol-border">
      <SyntaxHighlighter
        language="json"
        style={atomOneDark}
        customStyle={{
          background: "var(--color-sol-darker)",
          padding: "1rem",
          margin: 0,
          maxHeight: "600px",
          fontSize: "0.8rem",
        }}
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
