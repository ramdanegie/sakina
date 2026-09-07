"use client";

import Link from "next/link";
import { Award, CalendarDays, Check, Flame } from "lucide-react";
import { useInsights } from "@/presentation/hooks/use-catalog";
import { formatMinutes } from "@/presentation/lib/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/**
 * Listening habits — streak, weekly total, record and the daily goal ring.
 *
 * In the reference app this sits behind the paywall. Here it is on the home
 * screen for everyone.
 */
export function InsightsCard({ detailed = false }: { detailed?: boolean }) {
  const { data, isLoading } = useInsights();

  if (isLoading || data === undefined) {
    return <div className="bg-card h-64 animate-pulse rounded-2xl" />;
  }

  const goalRatio =
    data.goalSeconds > 0
      ? Math.min(1, data.todaySeconds / data.goalSeconds)
      : 0;

  return (
    <section className="space-y-3">
      {!detailed ? (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Insights</h2>
          <Link href="/insights" className="text-accent text-sm font-medium">
            See more
          </Link>
        </div>
      ) : null}

      <div className="bg-card space-y-5 rounded-2xl p-4">
        <div className="grid grid-cols-3 divide-x divide-border">
          <Metric
            icon={<Flame className="size-5 text-orange-400" aria-hidden />}
            label="Streak"
            value={`${data.currentStreak} day${data.currentStreak === 1 ? "" : "s"}`}
          />
          <Metric
            icon={<CalendarDays className="size-5 text-muted-foreground" aria-hidden />}
            label="This week"
            value={formatMinutes(data.weekSeconds)}
          />
          <Metric
            icon={<Award className="size-5 text-muted-foreground" aria-hidden />}
            label="Record"
            value={`${data.longestStreak} day${data.longestStreak === 1 ? "" : "s"}`}
          />
        </div>

        <GoalRing
          ratio={goalRatio}
          reached={data.goalReachedToday}
          todaySeconds={data.todaySeconds}
          goalSeconds={data.goalSeconds}
        />

        <ul className="flex justify-between">
          {data.week.map((cell, index) => (
            <li
              key={cell.dayIso}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border",
                  cell.goalReached
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent",
                )}
                aria-hidden
              >
                <Check className="size-4" />
              </span>
              <span className="text-xs text-muted-foreground">{WEEKDAYS[index]}</span>
              <span className="sr-only">
                {WEEKDAYS[index]}:{" "}
                {cell.goalReached ? "goal reached" : "goal not reached"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

/**
 * Semicircular progress arc. Drawn with an SVG stroke-dasharray rather than a
 * conic gradient so it animates smoothly and reads correctly at any DPR.
 */
function GoalRing({
  ratio,
  reached,
  todaySeconds,
  goalSeconds,
}: {
  ratio: number;
  reached: boolean;
  todaySeconds: number;
  goalSeconds: number;
}) {
  const radius = 70;
  const circumference = Math.PI * radius;

  return (
    <div className="relative flex flex-col items-center pt-2">
      <svg
        viewBox="0 0 180 100"
        className="w-full max-w-[240px]"
        role="img"
        aria-label={`Today's listening: ${formatMinutes(todaySeconds)} of ${formatMinutes(goalSeconds)}`}
      >
        <path
          d={`M 20 95 A ${radius} ${radius} 0 0 1 160 95`}
          fill="none"
          stroke="currentColor"
          className="text-foreground/10"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M 20 95 A ${radius} ${radius} 0 0 1 160 95`}
          fill="none"
          stroke="currentColor"
          className="text-foreground transition-[stroke-dashoffset] duration-500"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>

      <div className="absolute inset-x-0 top-10 flex flex-col items-center gap-1">
        <p className="text-sm text-muted-foreground">Today&rsquo;s listening</p>
        {reached ? (
          <span className="bg-primary flex size-9 items-center justify-center rounded-full">
            <Check className="text-primary-foreground size-5" aria-hidden />
          </span>
        ) : (
          <span className="tabular text-lg font-semibold text-foreground">
            {formatMinutes(todaySeconds)} / {formatMinutes(goalSeconds)}
          </span>
        )}
      </div>
    </div>
  );
}
