import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h2 className="mb-2 text-xl font-bold text-sol-text">Page not found</h2>
      <p className="mb-6 text-sm text-sol-muted">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded-xl bg-sol-purple px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
      >
        Back to home
      </Link>
    </div>
  );
}
