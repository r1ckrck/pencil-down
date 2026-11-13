"use client";

import {
  CalendarDot,
  Cards,
  ChartLineUp,
  GearSix,
  ListChecks,
  PencilSimpleLine,
  type Icon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export const NAV_ITEMS: { href: string; label: string; short: string; icon: Icon }[] = [
  { href: "/", label: "Today", short: "Today", icon: CalendarDot },
  { href: "/part-a", label: "Part A", short: "Part A", icon: ListChecks },
  { href: "/part-b", label: "Part B", short: "Part B", icon: PencilSimpleLine },
  { href: "/knowledge", label: "Knowledge", short: "Cards", icon: Cards },
  { href: "/progress", label: "Progress", short: "Progress", icon: ChartLineUp },
  { href: "/settings", label: "Settings", short: "Settings", icon: GearSix },
];

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Left rail (≥768px). */
export function RailNav({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: I }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-touch items-center gap-3 rounded-sm border px-3 text-small transition-colors duration-(--dur-fast) ease-measured",
                active
                  ? "border-hairline bg-tint font-medium text-fg"
                  : "border-transparent text-mute hover:bg-tint hover:text-fg",
              )}
            >
              <I size={20} weight="duotone" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Bottom tab bar (<768px). */
export function TabNav({ pathname }: { pathname: string | null }) {
  return (
    <ul className="grid grid-cols-6">
      {NAV_ITEMS.map(({ href, short, icon: I }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 text-label tracking-normal transition-colors duration-(--dur-fast) ease-measured",
                active ? "font-medium text-fg" : "text-mute",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-0 h-0.5 w-6 rounded-xs bg-fg transition-opacity duration-(--dur-fast)",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <I size={22} weight="duotone" aria-hidden />
              {short}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ActiveRailNav() {
  return <RailNav pathname={usePathname()} />;
}

export function ActiveTabNav() {
  return <TabNav pathname={usePathname()} />;
}
