"use client";

import Link from "next/link";
import type { ReciterDto } from "@/application/dto";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { gradientFor, initialsOf } from "@/presentation/lib/format";
import { cn } from "@/lib/utils";

/**
 * The circular reciter tile used by every carousel on Home and Reciters.
 * Reciters without a photo get a deterministic gradient monogram, so the
 * rows stay visually even instead of pocked with grey placeholders.
 */
export function ReciterCard({
  reciter,
  showNewBadge = false,
}: {
  reciter: ReciterDto;
  showNewBadge?: boolean;
}) {
  return (
    <Link
      href={`/reciters/${reciter.slug}`}
      className="flex w-28 shrink-0 flex-col items-center gap-2"
    >
      <div className="relative">
        <Avatar className="size-28">
          <AvatarImage src={reciter.avatarUrl ?? undefined} alt="" />
          <AvatarFallback
            className={cn(
              "bg-gradient-to-br text-xl font-semibold text-white",
              gradientFor(reciter.id),
            )}
          >
            {initialsOf(reciter.nameLatin)}
          </AvatarFallback>
        </Avatar>

        {/* The catalogue only exposes a last-modified date, so this claims
            "updated" rather than "new" — many of these are classical
            recordings that were simply re-encoded. */}
        {showNewBadge && reciter.isNew ? (
          <span className="bg-success absolute -end-1 top-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-black">
            UPDATED
          </span>
        ) : null}
      </div>

      <span className="line-clamp-2 text-center text-sm leading-tight text-white">
        {reciter.nameLatin}
      </span>
    </Link>
  );
}

/** Horizontally scrolling section with a "See all" affordance. */
export function ReciterRow({
  title,
  icon,
  reciters,
  seeAllHref,
  showNewBadge = false,
}: {
  title: string;
  icon?: React.ReactNode;
  reciters: readonly ReciterDto[];
  seeAllHref?: string;
  showNewBadge?: boolean;
}) {
  if (reciters.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white">
          {icon}
          {title}
        </h2>
        {seeAllHref !== undefined ? (
          <Link href={seeAllHref} className="text-accent text-sm font-medium">
            See all
          </Link>
        ) : null}
      </div>

      <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-1">
        {reciters.map((reciter) => (
          <ReciterCard
            key={reciter.id}
            reciter={reciter}
            showNewBadge={showNewBadge}
          />
        ))}
      </div>
    </section>
  );
}
