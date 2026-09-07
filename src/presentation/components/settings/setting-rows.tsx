"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useHydrated } from "@/presentation/hooks/use-hydrated";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Building blocks for the settings screen.
 *
 * Three row shapes, all sharing a 56px height and a 44px touch target:
 *   NavigationRow  goes somewhere
 *   ToggleRow      flips a boolean in place
 *   ChoiceRow      opens a sheet to pick one of several values
 *
 * Colours come from theme tokens rather than literal white/black, so every
 * row follows the active theme.
 */

const ROW = "flex min-h-14 w-full items-center gap-3 px-4 text-start";

/**
 * Defers rendering until after hydration.
 *
 * Rows backed by persisted state (theme, settings store) resolve to different
 * values on the server and the client, which React reports as a hydration
 * mismatch. Rendering a same-height placeholder first keeps the layout stable
 * and the console clean.
 */
export function AfterMount({
  children,
  fallbackHeight = "min-h-14",
}: {
  children: React.ReactNode;
  fallbackHeight?: string;
}) {
  const hydrated = useHydrated();

  if (!hydrated) return <div className={fallbackHeight} aria-hidden />;
  return <>{children}</>;
}

export function SettingsGroup({
  label,
  children,
  footnote,
}: {
  label: string;
  children: React.ReactNode;
  footnote?: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-muted-foreground px-1 text-sm">{label}</h2>
      <div className="bg-card border-border/50 divide-border/40 divide-y overflow-hidden rounded-2xl border">
        {children}
      </div>
      {footnote !== undefined ? (
        <p className="text-muted-foreground px-1 text-xs">{footnote}</p>
      ) : null}
    </section>
  );
}

function RowBody({
  icon,
  label,
  value,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-foreground min-w-0 flex-1 truncate">{label}</span>
      {value !== undefined ? (
        <span className="text-muted-foreground shrink-0 truncate text-sm">
          {value}
        </span>
      ) : null}
      {trailing ?? (
        <ChevronRight
          className="text-muted-foreground/60 flip-rtl size-4 shrink-0"
          aria-hidden
        />
      )}
    </>
  );
}

export function NavigationRow({
  icon,
  label,
  value,
  href,
  external = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}) {
  const body = <RowBody icon={icon} label={label} value={value} />;

  if (href !== undefined) {
    return external ? (
      <a href={href} target="_blank" rel="noreferrer noopener" className={ROW}>
        {body}
      </a>
    ) : (
      <Link href={href} className={ROW}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={ROW}>
      {body}
    </button>
  );
}

export function ToggleRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn(ROW, "py-2", disabled && "opacity-50")}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate">{label}</span>
        {description !== undefined ? (
          <span className="text-muted-foreground block text-xs">
            {description}
          </span>
        ) : null}
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}

export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly description?: string;
}

/**
 * A row that opens a bottom sheet of options.
 *
 * A sheet rather than a native <select>: it renders identically across
 * platforms, and each option can carry a line of explanation — which matters
 * for choices like audio quality, where the trade-off is not obvious from the
 * label alone.
 */
export function ChoiceRow<T extends string>({
  icon,
  label,
  value,
  choices,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: T;
  choices: readonly Choice<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = choices.find((c) => c.value === value);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={ROW}>
        <RowBody icon={icon} label={label} value={current?.label} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-lg rounded-t-[28px] pb-10"
          aria-describedby={undefined}
        >
          <SheetTitle className="px-5 pt-2 text-lg font-semibold">
            {label}
          </SheetTitle>

          <ul className="mt-3 px-3">
            {choices.map((choice) => {
              const active = choice.value === value;
              return (
                <li key={choice.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(choice.value);
                      setOpen(false);
                    }}
                    aria-pressed={active}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-start"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block truncate">
                        {choice.label}
                      </span>
                      {choice.description !== undefined ? (
                        <span className="text-muted-foreground block text-xs">
                          {choice.description}
                        </span>
                      ) : null}
                    </span>
                    {active ? (
                      <Check className="text-accent size-5 shrink-0" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
