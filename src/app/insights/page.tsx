"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { InsightsCard } from "@/presentation/components/insights-card";
import { useInsights } from "@/presentation/hooks/use-catalog";
import { getContainer } from "@/infrastructure/di/container";
import { formatMinutes } from "@/presentation/lib/format";
import { useQueryClient } from "@tanstack/react-query";

export default function InsightsPage() {
  const { data } = useInsights();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const goalMinutes = data === undefined ? 15 : Math.round(data.goalSeconds / 60);

  async function adjustGoal(delta: number) {
    const next = Math.min(600, Math.max(1, goalMinutes + delta));
    setSaving(true);
    await getContainer().habit.setDailyGoalMinutes(next);
    await queryClient.invalidateQueries({ queryKey: ["insights"] });
    setSaving(false);
  }

  return (
    <div className="pb-6">
      <header className="screen-header safe-top px-5 pt-4 pb-6">
        <h1 className="text-4xl font-bold text-white">Insights</h1>
      </header>

      <div className="space-y-6 px-5">
        <InsightsCard detailed />

        <section className="bg-card space-y-4 rounded-2xl p-4">
          <div>
            <h2 className="font-semibold text-white">Daily goal</h2>
            <p className="text-sm text-white/50">
              A day counts toward your streak once you pass this.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => void adjustGoal(-5)}
              disabled={saving || goalMinutes <= 1}
              aria-label="Decrease daily goal by 5 minutes"
              className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
            >
              <Minus className="size-5" aria-hidden />
            </button>

            <span className="tabular text-3xl font-bold text-white">
              {goalMinutes} min
            </span>

            <button
              type="button"
              onClick={() => void adjustGoal(5)}
              disabled={saving || goalMinutes >= 600}
              aria-label="Increase daily goal by 5 minutes"
              className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
            >
              <Plus className="size-5" aria-hidden />
            </button>
          </div>
        </section>

        {data !== undefined ? (
          <section className="bg-card space-y-3 rounded-2xl p-4">
            <h2 className="font-semibold text-white">All time</h2>
            <dl className="space-y-2 text-sm">
              <Row
                label="Total listening"
                value={formatMinutes(data.allTimeSeconds)}
              />
              <Row label="Longest streak" value={`${data.longestStreak} days`} />
              <Row
                label="This week"
                value={formatMinutes(data.weekSeconds)}
              />
            </dl>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-white/60">{label}</dt>
      <dd className="tabular font-medium text-white">{value}</dd>
    </div>
  );
}
