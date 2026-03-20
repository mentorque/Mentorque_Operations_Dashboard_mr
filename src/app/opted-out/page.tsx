 "use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CANDIDATES, STAGES, STAGE_STYLES } from "@/lib/data";
import { loadCustomCandidates, loadOptedOutCandidates, reinstateCandidate } from "@/lib/ops-store";
import { GradientBlinds } from "@/components/ui/gradient-blinds";

export default function OptedOutPage() {
  const [optedOutCandidates, setOptedOutCandidates] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/candidates?optedOut=true");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setOptedOutCandidates(Array.isArray(data) ? data : []);
    } catch {
      // fallback to localStorage
      const ids = loadOptedOutCandidates();
      const all = [...CANDIDATES, ...loadCustomCandidates()];
      const opted = all.filter((c) => ids.includes(c.id));
      setOptedOutCandidates(opted);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const optedOutList = useMemo(
    () => (optedOutCandidates ?? []),
    [optedOutCandidates],
  );

  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const handler = () => {
      setRefreshVersion((v) => v + 1);
      load();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [load]);

  async function handleReinstate(candidateId: string) {
    try {
      // Update DB first
      const res = await fetch(`/api/candidates/${candidateId}/opted-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optedOut: false }),
      });
      if (!res.ok) {
        console.error("Reinstate failed:", await res.text());
        return;
      }
      // Update localStorage fallback
      reinstateCandidate(candidateId);
      // Immediately reload the opted-out list
      await load();
    } catch (err) {
      console.error("Reinstate error:", err);
      // Try localStorage fallback
      reinstateCandidate(candidateId);
      await load();
    }
  }

  const hasOptedOut = optedOutList.length > 0;

  return (
    <div className="relative">
      <div className="absolute inset-0 z-0 opacity-20">
        <GradientBlinds
          gradientColors={["#1e3a5f", "#2563eb", "#3b82f6", "#60a5fa"]}
          angle={45}
          noise={0.08}
          blindCount={16}
          blindMinWidth={90}
          mouseDampening={0.35}
          spotlightRadius={0.58}
          spotlightSoftness={2.2}
          spotlightOpacity={0.2}
          mixBlendMode="normal"
          edgesOnly={true}
          edgeWidth={3.2}
        />
      </div>
      <div className="relative z-10 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Opted out</h1>
          <p className="text-sm text-slate-400 mt-1">Candidates marked opted out are recoverable here.</p>
        </div>
        <Link href="/candidates" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition">Back to candidates</Link>
      </div>

      <div className="magic-bento-card rounded-xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
          <p className="text-sm font-semibold text-amber-300">Opted out candidates ({optedOutList.length})</p>
        </div>

        {!hasOptedOut ? (
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            No opted out candidates yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(optedOutList ?? []).map((candidate) => {
              const actions =
                candidate.journeyItems?.map((ji: any) => ({
                  actionId: ji.actionId,
                  status: ji.status,
                })) ??
                candidate.actions ??
                [];
              const applicable = (actions ?? []).filter(
                (a: any) => a.status !== "na",
              );
              const done = applicable.filter((a: any) => a.status === "done");
              const progress =
                applicable.length === 0
                  ? 0
                  : Math.round((done.length / applicable.length) * 100);
              const stage = STAGES.find(
                (s) => s.id === candidate.currentStageId,
              );
              const stageStyle =
                stage ? STAGE_STYLES[stage.id] : STAGE_STYLES[candidate.currentStageId];
              return (
                <div
                  key={`${candidate.id}-${refreshVersion}`}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-100">
                        {candidate.name}
                      </p>
                      <p className="text-xs text-slate-400">{candidate.role}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${stageStyle.dot}`}
                      />
                      {stage?.name ?? candidate.currentStageId}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <button
                    onClick={() => handleReinstate(candidate.id)}
                    className="rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition"
                  >
                    Reinstate
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
