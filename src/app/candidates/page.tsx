"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { CANDIDATES, STAGES, STAGE_STYLES } from "@/lib/data";
import type { Candidate, RiskLevel, StageId } from "@/lib/data";
import {
  loadCustomCandidates,
  loadMentorOverrides,
  getStageAgeDays,
  getPaceBucket,
  upsertStageTracking,
  computePacingAlert,
  computePacingAlertFromItems,
  type PacingAlert,
} from "@/lib/ops-store";
import {
  hasScheduledSession,
  loadJourney,
  computeLiveCandidateInfo,
  type LiveCandidateInfo,
} from "@/lib/session-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type SafetyLevel = "safe" | "watch" | "at-risk";
function computeSafetyLevel(riskLevel: string, stageAge: number, hasScheduledCall?: boolean): SafetyLevel {
  if (hasScheduledCall) {
    if (riskLevel === "at-risk") return "watch";
    if (stageAge >= 5)           return "watch";
    if (riskLevel === "watch" || stageAge >= 3) return "watch";
    return "safe";
  }
  if (riskLevel === "at-risk" || stageAge >= 5) return "at-risk";
  if (riskLevel === "watch"   || stageAge >= 3) return "watch";
  return "safe";
}

type PaceStage = "at-risk" | "watch" | "on-track";

function getBatchLabel(enrolledDate: string): string {
  const parts = enrolledDate.trim().split(/\s+/);
  if (parts.length >= 2) {
    const month = parts.length >= 3 ? parts[1] : parts[0];
    const year = parts.length >= 3 ? parts[2] : parts[1];
    if (month && year) return `${month} ${year}`;
  }
  return enrolledDate;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidatesPage() {
  const [customCandidates, setCustomCandidates] = useState<Candidate[]>([]);
  const [mentorOverrides, setMentorOverrides]   = useState<Record<string, string>>({});
  const [stageAgeDays, setStageAgeDays]         = useState<Record<string, number>>({});
  const [scheduledMap, setScheduledMap]         = useState<Record<string, boolean>>({});
  const [paceBucketMap, setPaceBucketMap]       = useState<Record<string, string>>({});
  const [query,       setQuery]   = useState("");
  const [stageFilter, setStage]   = useState("all");
  const [riskFilter,  setRisk]    = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [alumniOnly,  setAlumni]  = useState(false);
  const [view, setView]           = useState<"grid" | "kanban">("grid");
  const [pacingExpanded, setPacingExpanded] = useState(false);
  const [journeyVersion, setJourneyVersion] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCustomCandidates(loadCustomCandidates());
    setMentorOverrides(loadMentorOverrides());
    setMounted(true);
  }, []);

  const allCandidates = useMemo(() => {
    return [...CANDIDATES, ...customCandidates].map((c) => ({
      ...c,
      mentor: mentorOverrides[c.id] ?? c.mentor,
    }));
  }, [customCandidates, mentorOverrides]);

  const liveDataMap = useMemo(() => {
    if (!mounted) return new Map<string, LiveCandidateInfo>();
    const map = new Map<string, LiveCandidateInfo>();
    for (const c of allCandidates) {
      map.set(c.id, computeLiveCandidateInfo(c));
    }
    return map;
  }, [allCandidates, journeyVersion, mounted]);

  const enrichedCandidates = useMemo(() => {
    if (!mounted) return allCandidates;
    return allCandidates.map((c) => {
      const live = liveDataMap.get(c.id);
      if (!live) return c;
      return { ...c, currentStageId: live.currentStageId as StageId };
    });
  }, [allCandidates, liveDataMap, mounted]);

  const active = useMemo(() => enrichedCandidates.filter((c) => !c.isAlumni), [enrichedCandidates]);
  const batchOptions = useMemo(() => {
    return Array.from(new Set(allCandidates.map((c) => getBatchLabel(c.enrolledDate)))).sort((a, b) => {
      const ay = parseInt(a.split(" ").at(-1) ?? "0", 10);
      const by = parseInt(b.split(" ").at(-1) ?? "0", 10);
      if (ay !== by) return by - ay;
      return a.localeCompare(b);
    });
  }, [allCandidates]);

  // Load stage age and scheduled status for all active candidates
  useEffect(() => {
    const ageMap: Record<string, number>  = {};
    const schedMap: Record<string, boolean> = {};
    for (const c of active) {
      upsertStageTracking(c.id, c.currentStageId);
      ageMap[c.id]   = getStageAgeDays(c.id);
      schedMap[c.id] = hasScheduledSession(c.id);
    }
    setStageAgeDays(ageMap);
    setScheduledMap(schedMap);
  }, [active]);

  // Derive week-based pace bucket ("on-track" | "watch" | "at-risk") per candidate
  // using the same logic as the detail page (computePacingAlertFromItems + getPaceBucket).
  useEffect(() => {
    if (!mounted) return;
    const map: Record<string, string> = {};
    for (const c of allCandidates) {
      const journey = loadJourney(c);
      const items = journey.map((i) => ({
        actionId: i.actionId,
        status: i.status,
        date: i.date,
        shortTitle: i.shortTitle,
      }));
      const pacing = computePacingAlertFromItems(c, items);
      map[c.id] = getPaceBucket(pacing);
    }
    setPaceBucketMap(map);
  }, [allCandidates, mounted, journeyVersion]);

  useEffect(() => {
    const refresh = () => setJourneyVersion((v) => v + 1);
    window.addEventListener("mq:journey-updated", refresh as EventListener);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("mq:journey-updated", refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    return enrichedCandidates.filter((c) => {
      if (!alumniOnly && c.isAlumni)  return false;
      if (alumniOnly  && !c.isAlumni) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (stageFilter !== "all" && c.currentStageId !== stageFilter) return false;
      if (riskFilter  !== "all" && c.riskLevel       !== riskFilter)  return false;
      if (batchFilter !== "all" && getBatchLabel(c.enrolledDate) !== batchFilter) return false;
      return true;
    });
  }, [enrichedCandidates, query, stageFilter, riskFilter, batchFilter, alumniOnly]);

  // ── Pacing analysis ─────────────────────────────────────────────────────────
  const pacingMap = useMemo(() => {
    if (!mounted) return new Map<string, PacingAlert>();
    const map = new Map<string, PacingAlert>();
    for (const c of filtered) {
      if (!c.isAlumni) map.set(c.id, computePacingAlert(c));
    }
    return map;
  }, [filtered, journeyVersion, mounted]);

  const paceRows = useMemo(() => {
    if (!mounted) return [];
    return filtered
      .filter((c) => !c.isAlumni)
      .map((c) => {
        const pacing = pacingMap.get(c.id)!;
        return { candidate: c, pacing, stage: getPaceBucket(pacing) };
      })
      .sort((a, b) => {
        const order = { "at-risk": 0, watch: 1, "on-track": 2 } as const;
        if (order[a.stage] !== order[b.stage]) return order[a.stage] - order[b.stage];
        return a.candidate.name.localeCompare(b.candidate.name);
      });
  }, [filtered, pacingMap, mounted]);

  const paceAtRisk = useMemo(() => paceRows.filter((x) => x.stage === "at-risk"), [paceRows]);
  const paceWatch = useMemo(() => paceRows.filter((x) => x.stage === "watch"), [paceRows]);
  const paceOnTrack = useMemo(() => paceRows.filter((x) => x.stage === "on-track"), [paceRows]);

  // ── Kanban grouping ─────────────────────────────────────────────────────────
  const kanbanGroups = useMemo(() => {
    return STAGES.filter((s) => s.id !== "alumni").map((stage) => ({
      stage,
      candidates: filtered.filter((c) => !c.isAlumni && c.currentStageId === stage.id),
    }));
  }, [filtered]);

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Candidates</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {allCandidates.filter((c) => !c.isAlumni).length} active · {allCandidates.filter((c) => c.isAlumni).length} alumni
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Active / Alumni toggle */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => setAlumni(false)}
              className={`px-3 py-1.5 text-sm font-medium transition ${!alumniOnly ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
            >Active</button>
            <button
              onClick={() => setAlumni(true)}
              className={`px-3 py-1.5 text-sm font-medium transition ${alumniOnly ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
            >Alumni</button>
          </div>

          {/* View toggle */}
          {!alumniOnly && (
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${view === "grid" ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
                title="Grid view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="0" y="0" width="6" height="6" rx="1" /><rect x="8" y="0" width="6" height="6" rx="1" />
                  <rect x="0" y="8" width="6" height="6" rx="1" /><rect x="8" y="8" width="6" height="6" rx="1" />
                </svg>
                Cards
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`px-3 py-1.5 text-sm font-medium transition flex items-center gap-1.5 ${view === "kanban" ? "bg-sky-600 text-white" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
                title="Kanban view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="0" y="0" width="3.5" height="14" rx="1" /><rect x="5.25" y="0" width="3.5" height="10" rx="1" />
                  <rect x="10.5" y="0" width="3.5" height="12" rx="1" />
                </svg>
                Kanban
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Pacing Alerts ──────────────────────────────────────────────────── */}
      {!alumniOnly && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
              <p className="text-sm font-bold text-sky-300">Pace tracker</p>
            </div>
            <button
              onClick={() => setPacingExpanded((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-200 transition"
            >
              {pacingExpanded ? "▲ Collapse" : "▼ Expand"}
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-300">At Risk: {paceAtRisk.length}</span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">Watch: {paceWatch.length}</span>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-300">On Track: {paceOnTrack.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(pacingExpanded ? paceRows : paceRows.slice(0, 6)).map(({ candidate: c, pacing, stage }) => (
              <Link
                key={c.id}
                href={`/candidates/${c.id}`}
                className={`rounded-lg border px-3 py-2.5 hover:opacity-90 transition ${
                  stage === "at-risk"
                    ? "border-red-500/25 bg-red-500/5"
                    : stage === "watch"
                    ? "border-amber-500/25 bg-amber-500/5"
                    : "border-sky-500/25 bg-sky-500/5"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-100">{c.name}</p>
                  <PaceStageBadge stage={stage} />
                </div>
                <p className="truncate text-xs text-slate-300">Next: {pacing.nextPendingTitle ?? "No pending step"}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{mounted ? `${pacing.stepsPerWeek.toFixed(1)}/wk` : null}</span>
                  <span>{mounted ? `${pacing.doneCount}/${pacing.totalApplicable} done` : null}</span>
                  <span>{mounted ? (pacing.hasScheduledCall ? "Call scheduled" : "Call not scheduled") : null}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStage(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
        >
          <option value="all">All stages</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {!alumniOnly && (
          <select
            value={riskFilter}
            onChange={(e) => setRisk(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
          >
            <option value="all">All risk levels</option>
            <option value="at-risk">At Risk</option>
            <option value="watch">Watch</option>
            <option value="normal">Normal</option>
          </select>
        )}
        <select
          value={batchFilter}
          onChange={(e) => setBatchFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
        >
          <option value="all">All batches / start months</option>
          {batchOptions.map((batch) => <option key={batch} value={batch}>{batch}</option>)}
        </select>
        {(query || stageFilter !== "all" || riskFilter !== "all" || batchFilter !== "all") && (
          <button onClick={() => { setQuery(""); setStage("all"); setRisk("all"); setBatchFilter("all"); }} className="text-xs text-slate-400 hover:text-slate-200">
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{filtered.length} shown</span>
      </div>

      {/* ── Grid view ──────────────────────────────────────────────────────── */}
      {(view === "grid" || alumniOnly) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 && (
            <p className="col-span-3 py-12 text-center text-slate-500 text-sm">No candidates match your filters.</p>
          )}
          {filtered.map((c) => {
            const stage  = STAGES.find((s) => s.id === c.currentStageId);
            const s      = STAGE_STYLES[c.currentStageId];
            const live   = liveDataMap.get(c.id);
            const curAct = live?.currentAction ?? null;
            const pct    = live?.progress ?? 0;
            const pacing = pacingMap.get(c.id);
            const bucket = mounted ? paceBucketMap[c.id] : undefined;
            const safety: SafetyLevel = !mounted
              ? "safe"
              : bucket === "on-track" ? "safe"
              : bucket === "watch"    ? "watch"
              : bucket === "at-risk"  ? "at-risk"
              : c.riskLevel === "at-risk" ? "at-risk"
              : c.riskLevel === "watch"   ? "watch"
              : "safe";
            const badge =
              bucket === "on-track" ? "normal"
              : bucket === "watch"  ? "watch"
              : bucket === "at-risk" ? "at-risk"
              : c.riskLevel;


            return (
              <Link
                key={c.id}
                href={`/candidates/${c.id}`}
                className={`group rounded-xl border bg-slate-900 p-4 transition hover:bg-slate-800/70 space-y-3 ${
                  safety === "at-risk" ? "border-red-500/35 hover:border-red-500/50"
                  : safety === "watch"  ? "border-amber-500/30 hover:border-amber-500/45"
                  : c.isAlumni          ? "border-emerald-500/20 hover:border-emerald-500/35"
                  : "border-sky-500/20 hover:border-sky-500/35"
                }`}
              >
                {/* Name + badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-50 group-hover:text-sky-400 transition truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.role} · {c.mentor}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!c.isAlumni && pacing && pacing.level !== "ok" && <PacingBadge level={pacing.level} />}
                    {!c.isAlumni && <RiskBadge level={badge} />}
                    {c.isAlumni && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">Alumni</span>
                    )}
                  </div>
                </div>

                {/* Stage chip */}
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text} ${s.border}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  {stage?.name}
                </span>

                {/* Current step + scheduled date */}
                <div className={`rounded-lg px-3 py-2 border ${
                  safety === "at-risk" ? "bg-red-500/5 border-red-500/20"
                  : safety === "watch"  ? "bg-amber-500/5 border-amber-500/15"
                  : "bg-slate-950/60 border-slate-700/60"
                }`}>
                  {curAct ? (
                    <>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {live ? `${live.doneCount}/${live.totalApplicable} done` : "current"}
                      </p>
                      <p className={`text-sm font-semibold mt-0.5 ${
                        safety === "at-risk" ? "text-red-200"
                        : safety === "watch"  ? "text-amber-200"
                        : "text-slate-100"
                      }`}>{curAct.shortTitle}</p>
                      <div className="mt-1.5 flex flex-wrap gap-3">
                        {curAct.poc && <span className="text-[10px] text-slate-400">👤 {curAct.poc}</span>}
                        {curAct.duration && <span className="text-[10px] text-slate-400">⏱ {curAct.duration}</span>}
                      </div>
                      {/* Scheduled call — sourced from live pacing (reads localStorage) */}
                      {pacing?.hasScheduledCall && (
                        <p className="mt-1.5 text-[11px] font-semibold text-sky-400">
                          ⏰ {pacing.nextScheduledTitle ?? "Scheduled"}{pacing.nextScheduledDate ? ` · ${pacing.nextScheduledDate}` : ""}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-500">All steps complete</p>
                  )}
                </div>

                {/* Pacing micro-alert */}
                {pacing && pacing.messages.length > 0 && (
                  <p className={`text-[10px] leading-snug truncate ${pacing.level === "critical" ? "text-red-400" : "text-amber-400"}`}>
                    ⚠ {pacing.messages[0]}
                  </p>
                )}

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Progress</span>
                    <span className="text-slate-300">{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full transition-all ${
                      safety === "at-risk" ? "bg-red-500"
                      : safety === "watch"  ? "bg-amber-500"
                      : c.isAlumni          ? "bg-emerald-500"
                      : "bg-sky-500"
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Kanban view ────────────────────────────────────────────────────── */}
      {view === "kanban" && !alumniOnly && (
        <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
          <div className="flex gap-3 overflow-x-auto p-4 pb-5">
            {kanbanGroups.map(({ stage, candidates: cols }) => {
              const s = STAGE_STYLES[stage.id];
              return (
                <div key={stage.id} className="flex-shrink-0 w-56">
                  {/* Column header */}
                  <div className={`flex items-center justify-between rounded-t-xl px-3 py-2 border border-b-0 ${s.bg} ${s.border}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                      <span className={`text-xs font-bold truncate ${s.text}`}>{stage.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${s.text}`}>{cols.length}</span>
                  </div>

                  {/* Candidate cards */}
                  <div className={`rounded-b-xl border border-t-0 ${s.border} bg-slate-900/80 p-2 space-y-2 min-h-[120px]`}>
                    {cols.length === 0 && (
                      <p className="text-center text-[10px] text-slate-700 py-4">—</p>
                    )}
                    {cols.map((c) => {
                      const curAct = liveDataMap.get(c.id)?.currentAction ?? null;
                      const pacing = pacingMap.get(c.id);
                      const bucket = mounted ? paceBucketMap[c.id] : undefined;
                      const safety: SafetyLevel = !mounted
                        ? "safe"
                        : bucket === "on-track" ? "safe"
                        : bucket === "watch"    ? "watch"
                        : bucket === "at-risk"  ? "at-risk"
                        : c.riskLevel === "at-risk" ? "at-risk"
                        : c.riskLevel === "watch"   ? "watch"
                        : "safe";

                      return (
                        <Link
                          key={c.id}
                          href={`/candidates/${c.id}`}
                          className={`block rounded-lg border p-2.5 hover:opacity-80 transition ${
                            safety === "at-risk" ? "border-red-500/35 bg-red-500/5"
                            : safety === "watch"  ? "border-amber-500/25 bg-amber-500/5"
                            : "border-slate-700 bg-slate-950/60"
                          }`}
                        >
                          {/* Name row */}
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <p className="text-xs font-semibold text-slate-100 leading-snug truncate">{c.name}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              {pacing && pacing.level !== "ok" && <span className={`h-1.5 w-1.5 rounded-full ${pacing.level === "critical" ? "bg-red-500" : "bg-amber-400"}`} />}
                              <span className={`h-1.5 w-1.5 rounded-full ${safety === "at-risk" ? "bg-red-500" : safety === "watch" ? "bg-amber-400" : "bg-sky-400"}`} />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{c.role} · {c.mentor}</p>

                          {/* Current step */}
                          {curAct && (
                            <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/60 px-2 py-1.5">
                              <p className="text-[10px] text-slate-300 font-medium leading-snug truncate">{curAct.shortTitle}</p>
                              {/* Scheduled date — from live pacing */}
                              {pacing?.hasScheduledCall && (
                                <p className="text-[10px] text-sky-400 mt-0.5">
                                  ⏰ {pacing.nextScheduledDate ?? "Scheduled"}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Pacing micro-alert */}
                          {pacing && pacing.messages[0] && (
                            <p className={`mt-1.5 text-[10px] leading-snug truncate ${pacing.level === "critical" ? "text-red-400" : "text-amber-400"}`}>
                              ⚠ {pacing.messages[0]}
                            </p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alumni grid */}
      {alumniOnly && filtered.filter((c) => c.isAlumni).length === 0 && (
        <p className="py-12 text-center text-slate-500 text-sm">No alumni found.</p>
      )}
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  if (level === "at-risk") return <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400 border border-red-500/30">⚠ At Risk</span>;
  if (level === "watch")   return <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">Watch</span>;
  return null;
}

function PacingBadge({ level }: { level: "ok" | "warning" | "critical" }) {
  if (level === "critical") return <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">Behind</span>;
  if (level === "warning")  return <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">⚡ Pace</span>;
  return null;
}

function PaceStageBadge({ stage }: { stage: PaceStage }) {
  if (stage === "at-risk") {
    return <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">At Risk</span>;
  }
  if (stage === "watch") {
    return <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Watch</span>;
  }
  return <span className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">On Track</span>;
}
