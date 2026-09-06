"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

export function NavLink({
  href,
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname.startsWith(String(href));

  return (
    <Link
      href={href}
      className={`${active ? "text-foreground" : "text-muted-foreground"} hover:text-primary ${className}`}
      {...props}
    />
  );
}
