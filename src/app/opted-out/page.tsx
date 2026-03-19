 "use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CANDIDATES, STAGES, STAGE_STYLES } from "@/lib/data";
import type { Candidate } from "@/lib/data";
import {
  loadCustomCandidates,
  loadMentorOverrides,
  loadOptedOutCandidates,
  reinstateCandidate,
} from "@/lib/ops-store";
import { computeLiveCandidateInfo } from "@/lib/session-store";

export default function OptedOutPage() {
  const [customCandidates, setCustomCandidates] = useState<Candidate[]>([]);
  const [mentorOverrides, setMentorOverrides] = useState<Record<string, string>>({});
  const [optedOutCandidates, setOptedOutCandidates] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/candidates')
      const data: Array<{
        id: string;
        name: string;
        role: string;
        currentStageId: string;
        optedOut: boolean;
        journeyItems?: { status: string }[];
      }> = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const optedOut = data.filter((c) => c.optedOut)
        setOptedOutCandidates(optedOut.map((c) => c.id))
      }
    } catch {
      // fallback to localStorage
      setOptedOutCandidates(loadOptedOutCandidates())
    }
    setCustomCandidates(loadCustomCandidates());
    setMentorOverrides(loadMentorOverrides());
    setMounted(true)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [])

  const allCandidates = useMemo(() => {
    return [...CANDIDATES, ...customCandidates].map((c) => ({
      ...c,
      mentor: mentorOverrides[c.id] ?? c.mentor,
    }));
  }, [customCandidates, mentorOverrides]);

  const optedOutList = useMemo(() => {
    const setOpted = new Set(optedOutCandidates);
    return allCandidates.filter((c) => setOpted.has(c.id));
  }, [allCandidates, optedOutCandidates]);

  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    const handler = () => {
      setOptedOutCandidates(loadOptedOutCandidates());
      setRefreshVersion((v) => v + 1);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const handleReinstate = async (id: string) => {
    reinstateCandidate(id);
    setOptedOutCandidates(loadOptedOutCandidates());
    await fetch(`/api/candidates/${id}/opted-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optedOut: false }),
    }).catch(() => {});
    await load();
  };

  const hasOptedOut = optedOutList.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Opted out</h1>
          <p className="text-sm text-slate-400 mt-1">Candidates marked opted out are recoverable here.</p>
        </div>
        <Link href="/candidates" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition">Back to candidates</Link>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
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
            {optedOutList.map((c) => {
              const live = mounted ? computeLiveCandidateInfo(c) : null;
              const progress = live?.progress ?? 0;
              const stage = live?.currentStageId ? STAGES.find((s) => s.id === live.currentStageId) : undefined;
              const stageStyle = stage ? STAGE_STYLES[stage.id] : STAGE_STYLES[c.currentStageId];
              return (
                <div key={`${c.id}-${refreshVersion}`} className="rounded-xl border border-slate-700 bg-slate-950 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-100">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.role}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${stageStyle.dot}`} />
                      {stage?.name ?? c.currentStageId}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} />
                  </div>
                  <button
                    onClick={() => handleReinstate(c.id)}
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
  );
}
