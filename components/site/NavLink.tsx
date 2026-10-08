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

  // Tous les liens du menu s'écrivent dans l'encre du texte ; la page où l'on
  // se trouve se distingue par le trait sous le mot, pas par un gris plus pâle.
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`text-foreground hover:text-primary ${
        active
          ? "underline decoration-primary decoration-2 underline-offset-8"
          : ""
      } ${className}`}
      {...props}
    />
  );
}
