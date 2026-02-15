"use client";

import Link from "next/link";

export default function ProgramError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-20 text-center">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-sol-link hover:underline"
      >
        &larr; Back to programs
      </Link>
      <h2 className="mb-2 text-xl font-bold text-red-400">
        Failed to load program
      </h2>
      <p className="mb-6 text-sm text-sol-muted">
        {error.message || "Is the server running?"}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-sol-purple px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
      >
        Try again
      </button>
    </div>
  );
}
