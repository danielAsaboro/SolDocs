"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-20 text-center">
      <h2 className="mb-2 text-xl font-bold text-red-400">
        Something went wrong
      </h2>
      <p className="mb-6 text-sm text-sol-muted">
        {error.message || "An unexpected error occurred."}
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
