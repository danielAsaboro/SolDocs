import { cn } from "@/lib/utils";

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        active
          ? "bg-sol-green shadow-[0_0_6px_var(--color-sol-green)] animate-pulse-glow"
          : "bg-sol-muted"
      )}
      role="status"
      aria-label={active ? "Agent running" : "Agent stopped"}
    />
  );
}
