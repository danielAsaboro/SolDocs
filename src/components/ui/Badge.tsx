import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  documented: "bg-sol-green/15 text-sol-green",
  pending: "bg-sol-purple/15 text-sol-purple",
  processing: "bg-amber-500/15 text-amber-400",
  failed: "bg-red-500/15 text-red-400",
};

export function Badge({
  variant,
  children,
}: {
  variant: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
        variants[variant] || "bg-sol-card text-sol-muted"
      )}
    >
      {children}
    </span>
  );
}
