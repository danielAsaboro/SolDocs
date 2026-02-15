"use client";

import { useState } from "react";
import { addProgram } from "@/lib/api";
import { cn } from "@/lib/utils";

export function AddProgramForm({ onAdded }: { onAdded: () => void }) {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setMsg({ text: "Please enter a program ID", ok: false });
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      const data = await addProgram(trimmed);
      setMsg({ text: data.message || "Program added to queue!", ok: true });
      setValue("");
      setTimeout(onAdded, 1000);
    } catch (e) {
      setMsg({
        text: e instanceof Error ? e.message : "Failed to connect to server",
        ok: false,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mb-6 max-w-[700px]">
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Paste a Solana program ID to document..."
          className="flex-1 rounded-xl border border-sol-border bg-sol-card px-4 py-3 text-sm text-sol-text outline-none transition-colors focus:border-sol-green"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-xl bg-sol-purple px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add Program"}
        </button>
      </div>
      {msg && (
        <p
          className={cn(
            "mt-2 text-center text-sm",
            msg.ok ? "text-sol-green" : "text-red-400"
          )}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
