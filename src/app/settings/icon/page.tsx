"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ChevronLeft, Info } from "lucide-react";
import {
  ICON_VARIANTS,
  iconPath,
  useAppIconStore,
} from "@/presentation/stores/app-icon.store";
import { cn } from "@/lib/utils";

/**
 * App icon picker.
 *
 * The choice rewrites the `apple-touch-icon` link and the manifest before
 * installation, which is when iOS and Android capture the image. That is also
 * the limit of what is possible: both platforms copy the icon at install time
 * and never re-read it, so an app already on the home screen keeps its old
 * icon until it is removed and re-added. The note below says so rather than
 * leaving the user to wonder.
 */
export default function AppIconPage() {
  const iconId = useAppIconStore((s) => s.iconId);
  const setIconId = useAppIconStore((s) => s.setIconId);

  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-6">
        <Link
          href="/settings"
          aria-label="Back to settings"
          className="glass mb-4 flex size-11 items-center justify-center rounded-full"
        >
          <ChevronLeft className="flip-rtl size-5" aria-hidden />
        </Link>
        <h1 className="text-foreground text-3xl font-bold">App icon</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pick the icon before adding Sakina to your home screen.
        </p>
      </header>

      <div className="space-y-6 px-5">
        <ul className="grid grid-cols-3 gap-4">
          {ICON_VARIANTS.map((variant) => {
            const active = variant.id === iconId;
            return (
              <li key={variant.id}>
                <button
                  type="button"
                  onClick={() => setIconId(variant.id)}
                  aria-pressed={active}
                  className="flex w-full flex-col items-center gap-2"
                >
                  <span
                    className={cn(
                      "relative rounded-[22px] p-1 transition-all",
                      active
                        ? "ring-accent ring-2"
                        : "ring-border ring-1 ring-inset",
                    )}
                  >
                    <Image
                      src={iconPath(variant.id, 192)}
                      alt=""
                      width={192}
                      height={192}
                      className="size-20 rounded-[18px]"
                    />
                    {active ? (
                      <span
                        className="bg-accent absolute -end-1 -top-1 flex size-6 items-center justify-center rounded-full"
                        aria-hidden
                      >
                        <Check className="text-accent-foreground size-4" />
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      active
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {variant.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <section className="bg-card border-border/50 space-y-3 rounded-2xl border p-4">
          <h2 className="text-foreground flex items-center gap-2 font-semibold">
            <Info className="text-muted-foreground size-4" aria-hidden />
            Already added to your home screen?
          </h2>
          <p className="text-muted-foreground text-sm">
            iOS and Android copy the icon at the moment you install, and never
            check again. To change an icon that is already there, remove the
            app from your home screen and add it once more — your downloads,
            favourites and listening history are kept.
          </p>
        </section>

        <section className="bg-card border-border/50 space-y-3 rounded-2xl border p-4">
          <h2 className="text-foreground font-semibold">Add to home screen</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-foreground font-medium">iPhone / iPad</dt>
              <dd className="text-muted-foreground">
                Open in Safari, tap Share, then &ldquo;Add to Home
                Screen&rdquo;. Chrome and Firefox on iOS cannot install web
                apps.
              </dd>
            </div>
            <div>
              <dt className="text-foreground font-medium">Android</dt>
              <dd className="text-muted-foreground">
                Open in Chrome, tap the menu, then &ldquo;Install app&rdquo; or
                &ldquo;Add to Home screen&rdquo;.
              </dd>
            </div>
          </dl>
        </section>

        <p className="text-muted-foreground/70 text-xs">
          Want your own artwork? Replace{" "}
          <code className="text-foreground">public/icon.svg</code> and run{" "}
          <code className="text-foreground">node scripts/make-icons.mjs</code>.
        </p>
      </div>
    </div>
  );
}
