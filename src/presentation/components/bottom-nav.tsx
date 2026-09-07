"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  BookOpen,
  Home,
  LayoutGrid,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Five tabs is the practical ceiling on a phone; Playlists moved into the
 * Reciters screen's reach rather than crowding this row further.
 */
const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/reciters", label: "Reciters", icon: AudioLines },
  { href: "/surah", label: "Read", icon: BookOpen },
  { href: "/playlists", label: "Playlists", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="flex items-center gap-2">
      <div className="glass flex flex-1 items-center justify-around rounded-full p-1.5">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              // 44px minimum touch target, per the accessibility constraint.
              className={cn(
                "flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1.5 transition-colors",
                active ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="text-[10px] leading-none font-medium">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>

      <Link
        href="/search"
        aria-label="Search"
        className="glass flex size-14 shrink-0 items-center justify-center rounded-full text-foreground"
      >
        <Search className="size-5" aria-hidden />
      </Link>
    </nav>
  );
}
