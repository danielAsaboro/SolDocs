"use client";

import { useState, useRef } from "react";
import { addProgram } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

// Solana base58 program ID: 32-44 chars, no 0/O/I/l
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function AddProgramForm({ onAdded }: { onAdded: () => void }) {
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function validate(id: string): string | null {
    if (!id) return "Please enter a program ID";
    if (!BASE58_RE.test(id)) return "Invalid program ID. Must be a base58 address (32-44 characters).";
    return null;
  }

  async function handleSubmit() {
    const trimmed = value.trim();
    const error = validate(trimmed);
    if (error) {
      setMsg({ text: error, ok: false });
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      const data = await addProgram(trimmed);
      const message = data.message || "Program added to queue!";
      setMsg({ text: message, ok: true });
      toast(message, "success");
      setValue("");
      setTimeout(() => {
        onAdded();
        inputRef.current?.focus();
      }, 500);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to connect to server";
      setMsg({ text: message, ok: false });
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto mb-6 max-w-[700px]">
      <div className="flex gap-3">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (msg) setMsg(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Paste a Solana program ID to document..."
          className={cn(
            "flex-1 rounded-xl border bg-sol-card px-4 py-3 text-sm text-sol-text outline-none transition-colors focus:border-sol-green",
            msg && !msg.ok ? "border-red-500/50" : "border-sol-border"
          )}
          aria-label="Solana program ID"
          aria-invalid={msg && !msg.ok ? true : undefined}
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-sol-purple px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {submitting && <Spinner className="h-4 w-4" />}
          {submitting ? "Adding..." : "Add Program"}
        </button>
      </div>
      {msg && (
        <p
          className={cn(
            "mt-2 text-center text-sm",
            msg.ok ? "text-sol-green" : "text-red-400"
          )}
          role={msg.ok ? "status" : "alert"}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
