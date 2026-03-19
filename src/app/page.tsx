"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CANDIDATES, STAGES, STAGE_STYLES } from "@/lib/data";
import type { ActionStatus, Candidate, RiskLevel, StageId } from "@/lib/data";

import {
  addMentorName,
  createCandidate,
  getStageAgeDays,
  getPaceBucket,
  loadCustomCandidates,
  loadDeletedCandidates,
  loadMentorCatalog,
  loadMentorOverrides,
  loadOptedOutCandidates,
  saveMentorOverride,
  upsertStageTracking,
  computePacingAlertFromItems,
  type PacingAlert,
} from "@/lib/ops-store";
import {
  loadJourney,
  computeLiveCandidateInfo,
  type LiveCandidateInfo,
} from "@/lib/session-store";

type SafetyLevel = "safe" | "watch" | "at-risk";

type PaceStage = "at-risk" | "watch" | "on-track";

export default function HomePage() {
  const [customCandidates, setCustomCandidates] = useState<Candidate[]>([]);
  const [mentorOverrides, setMentorOverrides] = useState<Record<string, string>>({});
  const [deletedCandidates, setDeletedCandidates] = useState<string[]>([]);
  const [optedOutCandidates, setOptedOutCandidates] = useState<string[]>([]);
  const [stageAgeDays, setStageAgeDays] = useState<Record<string, number>>({});
  const [mentorCatalog, setMentorCatalog] = useState<string[]>([]);
  const [journeyVersion, setJourneyVersion] = useState(0);

  const [showCreateCandidate, setShowCreateCandidate] = useState(false);
  const [showAllotMentor, setShowAllotMentor] = useState(false);
  const [showAddMentor, setShowAddMentor] = useState(false);

  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidateRole, setNewCandidateRole] = useState("");
  const [newCandidateStage, setNewCandidateStage] = useState<StageId>("onboarding");
  const [newCandidateMentor, setNewCandidateMentor] = useState("");

  const [mentorCandidateId, setMentorCandidateId] = useState("");
  const [mentorName, setMentorName] = useState("");
  const [addedMentorName, setAddedMentorName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [apiCandidates, setApiCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/candidates');
        const data = (await res.json()) as Array<{
          id: string;
          name: string;
          role: string;
          mentor: string;
          currentStageId: StageId;
          riskLevel: RiskLevel;
          isAlumni: boolean;
          enrolledDate: string;
          journeyItems?: Array<{
            actionId: number;
            status: ActionStatus;
            date?: string;
            comment?: string;
          }>;
          notes?: string;
        }>;
        const mapped = data.map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          mentor: c.mentor,
          currentStageId: c.currentStageId,
          riskLevel: c.riskLevel,
          isAlumni: c.isAlumni,
          enrolledDate: c.enrolledDate,
          actions: (c.journeyItems ?? []).map((ji) => ({
            actionId: ji.actionId,
            status: ji.status,
            date: ji.date ?? undefined,
            comment: ji.comment ?? undefined,
          })),
          notes: c.notes ?? undefined,
        }));
        setApiCandidates(mapped);
      } catch {
        setCustomCandidates(loadCustomCandidates());
      }
      setMentorOverrides(loadMentorOverrides());
      setDeletedCandidates(loadDeletedCandidates());
      setOptedOutCandidates(loadOptedOutCandidates());
      setMentorCatalog(loadMentorCatalog());
      setMounted(true);
    }
    load();
  }, []);

  const allCandidates = useMemo(() => {
    const excluded = new Set<string>([...deletedCandidates, ...optedOutCandidates]);
    if (apiCandidates.length > 0) {
      return apiCandidates.filter((c) => !excluded.has(c.id));
    }
    return [...CANDIDATES, ...customCandidates]
      .filter((c) => !excluded.has(c.id))
      .map((c) => ({
        ...c,
        mentor: mentorOverrides[c.id] ?? c.mentor,
      }));
  }, [apiCandidates, customCandidates, mentorOverrides, deletedCandidates, optedOutCandidates]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const alumni = useMemo(() => enrichedCandidates.filter((c) => c.isAlumni), [enrichedCandidates]);
  const atRisk = useMemo(() => active.filter((c) => c.riskLevel === "at-risk"), [active]);
  const watch = useMemo(() => active.filter((c) => c.riskLevel === "watch"), [active]);
  const inInterview = useMemo(() => active.filter((c) =>
    c.currentStageId === "mock-interview-1" ||
    c.currentStageId === "mock-interview-2" ||
    c.currentStageId === "mock-interview-3"
  ), [active]);

  useEffect(() => {
    const nextMap: Record<string, number> = {};
    for (const c of active) {
      upsertStageTracking(c.id, c.currentStageId);
      nextMap[c.id]  = getStageAgeDays(c.id);
    }
    setStageAgeDays(nextMap);
  }, [active]);

  useEffect(() => {
    const refresh = () => {
      setJourneyVersion((v) => v + 1);
      setDeletedCandidates(loadDeletedCandidates());
      setOptedOutCandidates(loadOptedOutCandidates());
    };
    window.addEventListener("mq:journey-updated", refresh as EventListener);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("mq:journey-updated", refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const stagnated = useMemo(() => active.filter((c) => (stageAgeDays[c.id] ?? 0) >= 4), [active, stageAgeDays]);
  // Auto-elevate normal candidates stagnated ≥5 days to at-risk display
  const autoAtRisk = useMemo(() => stagnated.filter((c) => c.riskLevel === "normal" && (stageAgeDays[c.id] ?? 0) >= 5), [stagnated, stageAgeDays]);

  // Standalone pace tracker (all active candidates, grouped by pace stage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const paceRows = useMemo<Array<{ candidate: Candidate; pacing: PacingAlert; stage: PaceStage }>>(() => {
    if (!mounted) return [];
    return active
      .map((c) => {
        const journey = loadJourney(c);
        const items = journey.map((i) => ({
          actionId: i.actionId,
          status: i.status,
          date: i.date,
          shortTitle: i.shortTitle,
        }));
        const pacing = computePacingAlertFromItems(c, items);
        return { candidate: c, pacing, stage: getPaceBucket(pacing) };
      })
      .sort((a, b) => {
        const order = { "at-risk": 0, watch: 1, "on-track": 2 } as const;
        if (order[a.stage] !== order[b.stage]) return order[a.stage] - order[b.stage];
        return a.candidate.name.localeCompare(b.candidate.name);
      });
  }, [active, journeyVersion, mounted]);
  const paceAtRisk = useMemo(() => paceRows.filter((x) => x.stage === "at-risk"), [paceRows]);
  const paceWatch = useMemo(() => paceRows.filter((x) => x.stage === "watch"), [paceRows]);
  const paceOnTrack = useMemo(() => paceRows.filter((x) => x.stage === "on-track"), [paceRows]);

  const atRiskCount = mounted ? paceRows.filter((r) => r.stage === "at-risk").length : 0;
  const watchCount = mounted ? paceRows.filter((r) => r.stage === "watch").length : 0;
  const onTrackCount = mounted ? paceRows.filter((r) => r.stage === "on-track").length : 0;

  const paceStageById = useMemo<Record<string, PaceStage>>(() => {
    const map: Record<string, PaceStage> = {};
    for (const r of paceRows) map[r.candidate.id] = r.stage;
    return map;
  }, [paceRows]);
  const attentionList = useMemo(() => {
    const ids = new Set<string>();
    const list: Candidate[] = [];
    for (const c of [...atRisk, ...autoAtRisk, ...watch, ...stagnated.filter((c) => c.riskLevel === "normal")]) {
      if (!ids.has(c.id)) { ids.add(c.id); list.push(c); }
    }
    return list;
  }, [atRisk, autoAtRisk, watch, stagnated]);

  const kanbanStages = useMemo(() => STAGES.filter((s) => s.id !== "alumni").map((stage) => ({
    stage,
    candidates: active.filter((c) => c.currentStageId === stage.id),
  })), [active]);

  const today = mounted
    ? new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  function handleCreateCandidate() {
    if (!newCandidateName.trim()) return;
    createCandidate({
      name: newCandidateName.trim(),
      role: newCandidateRole.trim() || "TBD",
      mentor: newCandidateMentor.trim() || "TBD",
      stageId: newCandidateStage,
    });
    setCustomCandidates(loadCustomCandidates());
    setMentorCatalog(loadMentorCatalog());
    setShowCreateCandidate(false);
    setNewCandidateName("");
    setNewCandidateRole("");
    setNewCandidateMentor("");
    setNewCandidateStage("onboarding");
  }

  function handleAllotMentor() {
    if (!mentorCandidateId || !mentorName.trim()) return;
    saveMentorOverride(mentorCandidateId, mentorName.trim());
    setMentorOverrides(loadMentorOverrides());
    setMentorCatalog(loadMentorCatalog());
    setShowAllotMentor(false);
    setMentorCandidateId("");
    setMentorName("");
  }

  function handleAddMentorName() {
    if (!addedMentorName.trim()) return;
    const next = addMentorName(addedMentorName);
    setMentorCatalog(next);
    setAddedMentorName("");
    setShowAddMentor(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-50">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{mounted ? today : null}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCreateCandidate(true)} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition">+ Create candidate</button>
          <button onClick={() => setShowAllotMentor(true)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition">Mentor allot</button>
          <button onClick={() => setShowAddMentor(true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition">Add mentor name</button>
          <Link href="/candidates" className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition">All candidates →</Link>
        </div>
      </div>

      {attentionList.length > 0 && (
        <section className="space-y-2">
          {/* Critical — at-risk (manual or auto ≥5 days) */}
          {(() => {
            const criticalList = mounted
              ? paceRows.filter((r) => r.stage === "at-risk").map((r) => r.candidate)
              : [];
            if (criticalList.length === 0) return null;
            return (
              <div className="rounded-xl border border-red-500/35 bg-red-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <p className="text-sm font-bold text-red-400">{criticalList.length} critical — act now</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {criticalList.map((c) => {
                    const nextAction = liveDataMap.get(c.id)?.currentAction;
                    const age = stageAgeDays[c.id] ?? 0;
                    return (
                      <Link key={c.id} href={`/candidates/${c.id}`} className="rounded-lg border border-red-500/25 bg-slate-950/80 px-3 py-3 hover:border-red-500/50 transition">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-bold text-slate-50">{c.name}</p>
                          <div className="flex gap-1">
                            {mounted ? <RiskBadge level={c.riskLevel} /> : null}
                            {age >= 5 && c.riskLevel === "normal" && (
                              <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">{age}d stuck</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-red-300/80 truncate">{mounted ? (nextAction ? `↳ ${nextAction.shortTitle}` : "No pending action") : null}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{c.role} · {c.mentor}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Watch / Stagnated (3-4 days) */}
          {(() => {
            const watchList = mounted
              ? paceRows.filter((r) => r.stage === "watch").map((r) => r.candidate)
              : [];
            if (watchList.length === 0) return null;
            return (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                  <p className="text-sm font-semibold text-amber-400">{watchList.length} need monitoring</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {watchList.map((c) => {
                    const nextAction = liveDataMap.get(c.id)?.currentAction;
                    const age = stageAgeDays[c.id] ?? 0;
                    return (
                      <Link key={c.id} href={`/candidates/${c.id}`} className="rounded-lg border border-amber-500/20 bg-slate-950/80 px-3 py-3 hover:border-amber-500/40 transition">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-sm font-semibold text-slate-50">{c.name}</p>
                          <div className="flex gap-1">
                            {mounted && c.riskLevel === "watch" ? <RiskBadge level={c.riskLevel} /> : null}
                            {age >= 3 && <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-400">{age}d stuck</span>}
                          </div>
                        </div>
                        <p className="text-xs text-amber-300/80 truncate">{mounted ? (nextAction ? `↳ ${nextAction.shortTitle}` : "No pending action") : null}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{c.role} · {c.mentor}</p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </section>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active" value={active.length} color="text-sky-400" />
        <StatCard label="Interview Prep" value={inInterview.length} color="text-rose-400" />
        <StatCard label="At Risk / Watch" value={atRisk.length + watch.length} color="text-amber-400" />
        <StatCard label="Alumni" value={alumni.length} color="text-emerald-400" />
      </div>

      {/* ── Pace tracker (standalone) ─────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            <h2 className="text-sm font-bold text-sky-300">Pace tracker</h2>
          </div>
          <Link href="/candidates" className="text-xs text-slate-400 hover:text-sky-400 transition">View all →</Link>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-300">At Risk: {atRiskCount}</span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300">Watch: {watchCount}</span>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-300">On Track: {onTrackCount}</span>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            { key: "at-risk", label: "At Risk", rows: paceAtRisk, cardCls: "border-red-500/25 bg-red-500/5", textCls: "text-red-300/90" },
            { key: "watch", label: "Watch", rows: paceWatch, cardCls: "border-amber-500/25 bg-amber-500/5", textCls: "text-amber-300/90" },
            { key: "on-track", label: "On Track", rows: paceOnTrack, cardCls: "border-sky-500/25 bg-sky-500/5", textCls: "text-sky-300/90" },
          ].map((group) => (
            <div key={group.key} className="space-y-2">
              <p className="text-xs font-semibold text-slate-300">{group.label}</p>
              {group.rows.length === 0 ? (
                    <div className="rounded-lg border border-sky-500/15 bg-sky-500/5 px-3 py-2 text-xs text-slate-500">No candidates</div>
              ) : (
                group.rows.slice(0, 4).map(({ candidate: c, pacing, stage }) => (
                  <Link key={c.id} href={`/candidates/${c.id}`} className={`block rounded-lg border px-3 py-2.5 transition hover:opacity-90 ${group.cardCls}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-100">{c.name}</p>
                      <span className="text-[10px] text-slate-400">{mounted ? `${pacing.doneCount ?? (stage === "on-track" ? 2 : stage === "watch" ? 1 : 0)}/2 this week` : null}</span>
                    </div>
                    <p className={`truncate text-xs ${group.textCls}`}>{mounted ? `Next: ${pacing.nextPendingTitle ?? "No pending step"}` : null}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {mounted
                        ? (pacing.hasScheduledCall
                            ? `Scheduled: ${pacing.nextScheduledTitle ?? "Next call"}${pacing.nextScheduledDate ? ` · ${pacing.nextScheduledDate}` : ""}`
                            : "Next call not scheduled")
                        : null}
                    </p>
                  </Link>
                ))
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-300">Pipeline</h2>
          <p className="text-xs text-slate-500">{active.length} active candidates across {kanbanStages.filter((k) => k.candidates.length > 0).length} stages</p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
          {kanbanStages.map(({ stage, candidates }) => {
            const s = STAGE_STYLES[stage.id];
            return (
              <div key={stage.id} className={`flex-shrink-0 w-72 rounded-xl border overflow-hidden ${candidates.length > 0 ? "border-slate-800 bg-slate-900" : "border-slate-800/40 bg-slate-900/30"}`}>
                <div className={`px-3 py-2 border-b ${candidates.length > 0 ? `${s.bg} border-slate-800/60` : "border-slate-800/30"}`}>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${candidates.length > 0 ? s.dot : "bg-slate-700"}`} />
                      <span className={`text-xs font-semibold truncate ${candidates.length > 0 ? s.text : "text-slate-600"}`}>{stage.name}</span>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${candidates.length > 0 ? s.text : "text-slate-600"}`}>{candidates.length}</span>
                  </div>
                </div>

                <div className="p-2 space-y-2">
                  {candidates.length === 0 ? (
                    <p className="py-3 text-center text-xs text-slate-700">—</p>
                  ) : (
                    candidates.map((c) => {
                      const liveAction = liveDataMap.get(c.id)?.currentAction;
                      const age = stageAgeDays[c.id] ?? 0;
                      const bucket = mounted ? paceStageById[c.id] : undefined;
                      const safety: SafetyLevel = !mounted
                        ? "safe"
                        : bucket === "at-risk" ? "at-risk"
                        : bucket === "watch" ? "watch"
                        : "safe";
                      const isBlocked = liveAction?.comment?.toLowerCase().includes("block") || liveAction?.status === "on-hold";
                      return (
                        <div key={c.id} className={`rounded-lg border bg-slate-950/80 px-2.5 py-2.5 space-y-2 ${
                          safety === "at-risk" ? "border-red-500/40"
                          : safety === "watch"   ? "border-amber-500/30"
                          : "border-sky-500/20"
                        }`}>
                          <div className="flex items-start justify-between gap-1">
                            <Link href={`/candidates/${c.id}`} className="text-xs font-semibold text-slate-50 hover:text-sky-400 transition truncate leading-tight">
                              {c.name}
                            </Link>
                            {safety === "at-risk" ? <RiskDot level="at-risk" />
                             : safety === "watch"  ? <RiskDot level="watch" />
                             : <span className="mt-0.5 h-2 w-2 rounded-full bg-sky-500 shrink-0" title="On Track" />}
                          </div>
                          <p className="text-[10px] text-slate-400">{c.role} · {c.mentor}</p>
                          {age >= 3 && (
                            <p className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                              age >= 5 ? "bg-red-500/10 border-red-500/25 text-red-400"
                              : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                            }`}>{age}d same stage</p>
                          )}
                          <div className={`rounded-md border p-2 ${
                            safety === "at-risk" ? "border-red-500/25 bg-red-500/5"
                            : isBlocked            ? "border-amber-500/25 bg-amber-500/5"
                            : safety === "watch"  ? "border-amber-500/15 bg-amber-500/5"
                            : "border-sky-500/15 bg-sky-500/5"
                          }`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${
                              safety === "at-risk" ? "text-red-400/70"
                              : isBlocked            ? "text-amber-400/70"
                              : safety === "watch"  ? "text-amber-400/70"
                              : "text-sky-400/70"
                            }`}>
                              {safety === "at-risk" ? "Act now" : isBlocked ? "Blocked" : safety === "watch" ? "Monitor" : "Next step"}
                            </p>
                            <p className={`mt-0.5 text-[11px] leading-snug truncate font-semibold ${
                              safety === "at-risk" ? "text-red-200"
                              : isBlocked            ? "text-amber-200"
                              : "text-slate-100"
                            }`} title={liveAction?.shortTitle ?? "No pending step"}>
                              {liveAction?.shortTitle ?? "No pending step"}
                            </p>
                            {liveAction?.poc && (
                              <p className="text-[10px] text-slate-400 mt-0.5">👤 {liveAction.poc}{liveAction.duration ? ` · ${liveAction.duration}` : ""}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

          <div className="flex-shrink-0 w-56 rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
            <div className="px-3 py-2 border-b border-emerald-500/15">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-400">Alumni</span>
                </div>
                <span className="text-xs font-bold text-emerald-500">{alumni.length}</span>
              </div>
            </div>
            <div className="p-2 space-y-1.5">
              {alumni.map((c) => (
                <Link key={c.id} href={`/candidates/${c.id}`} className="block rounded-lg border border-emerald-500/15 bg-slate-950/60 px-2.5 py-2 hover:border-emerald-500/35 transition">
                  <p className="text-xs font-semibold text-slate-100">{c.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{c.role}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showCreateCandidate && (
        <Modal title="Create candidate" onClose={() => setShowCreateCandidate(false)}>
          <div className="space-y-2">
            <input value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} placeholder="Candidate name" className={inputCls} />
            <input value={newCandidateRole} onChange={(e) => setNewCandidateRole(e.target.value)} placeholder="Role (e.g. Analyst)" className={inputCls} />
            <input value={newCandidateMentor} onChange={(e) => setNewCandidateMentor(e.target.value)} placeholder="Mentor name (optional)" className={inputCls} />
            <select value={newCandidateStage} onChange={(e) => setNewCandidateStage(e.target.value as StageId)} className={inputCls}>
              {STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreateCandidate(false)} className={secondaryBtn}>Cancel</button>
              <button onClick={handleCreateCandidate} className={primaryBtn}>Create</button>
            </div>
          </div>
        </Modal>
      )}

      {showAllotMentor && (
        <Modal title="Mentor allotment" onClose={() => setShowAllotMentor(false)}>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-400">Candidate</label>
            <select value={mentorCandidateId} onChange={(e) => setMentorCandidateId(e.target.value)} className={inputCls}>
              <option value="">Select candidate</option>
              {active.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.currentStageId}</option>)}
            </select>
            <label className="block text-xs font-medium text-slate-400">Mentor</label>
            <select value={mentorCatalog.includes(mentorName) ? mentorName : ""} onChange={(e) => setMentorName(e.target.value)} className={inputCls}>
              <option value="">Select or type below</option>
              {mentorCatalog.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input value={mentorName} onChange={(e) => setMentorName(e.target.value)} placeholder="Or type mentor name" className={inputCls} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAllotMentor(false)} className={secondaryBtn}>Cancel</button>
              <button type="button" onClick={handleAllotMentor} className={primaryBtn}>Save allotment</button>
            </div>
          </div>
        </Modal>
      )}

      {showAddMentor && (
        <Modal title="Add mentor name" onClose={() => setShowAddMentor(false)}>
          <div className="space-y-2">
            <input value={addedMentorName} onChange={(e) => setAddedMentorName(e.target.value)} placeholder="Mentor full name" className={inputCls} />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddMentor(false)} className={secondaryBtn}>Cancel</button>
              <button onClick={handleAddMentorName} className={primaryBtn}>Add mentor</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none";
const primaryBtn = "rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition";
const secondaryBtn = "rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition";

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  if (level === "at-risk") return <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/30">At Risk</span>;
  if (level === "watch") return <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">Watch</span>;
  return null;
}

function RiskDot({ level }: { level: string }) {
  if (level === "at-risk") return <span className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />;
  if (level === "watch") return <span className="mt-0.5 h-2 w-2 rounded-full bg-amber-400 shrink-0" />;
  return null;
}
