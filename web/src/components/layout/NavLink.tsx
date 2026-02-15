"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "text-sm transition-colors",
        active ? "text-sol-green font-semibold" : "text-sol-muted hover:text-sol-text"
      )}
    >
      {children}
    </Link>
  );
}
