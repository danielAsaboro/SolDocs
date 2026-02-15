import { cn } from "@/lib/utils";

const variants: Record<string, { className: string; icon: string }> = {
  documented: { className: "bg-sol-green/15 text-sol-green", icon: "\u2713" },
  pending: { className: "bg-sol-purple/15 text-sol-purple", icon: "\u25CB" },
  processing: { className: "bg-amber-500/15 text-amber-400", icon: "\u25E6" },
  failed: { className: "bg-red-500/15 text-red-400", icon: "\u2717" },
};

export function Badge({
  variant,
  children,
}: {
  variant: string;
  children: React.ReactNode;
}) {
  const v = variants[variant] || { className: "bg-sol-card text-sol-muted", icon: "" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold",
        v.className
      )}
    >
      <span aria-hidden="true">{v.icon}</span>
      {children}
    </span>
  );
}
