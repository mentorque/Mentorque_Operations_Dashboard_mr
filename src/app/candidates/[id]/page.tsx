"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CANDIDATES,
  STAGES,
  STAGE_STYLES,
  MESSAGE_TEMPLATES,
} from "@/lib/data";
import type { ActionStatus, Candidate } from "@/lib/data";
import {
  type SessionItem,
  loadJourney,
  saveJourney,
  getDeadlineStatus,
  formatDeadline,
  deadlineDaysLabel,
  computeLiveInfoFromJourney,
} from "@/lib/session-store";
import {
  addMentorName,
  computePacingAlertFromItems,
  getPaceBucket,
  loadCustomCandidates,
  loadMentorCatalog,
  loadMentorOverrides,
  loadCandidateNotes,
  saveCandidateNotes,
  saveMentorOverride,
  getStageAgeDays,
  upsertStageTracking,
  saveCalendarEvent,
  removeCalendarEvent,
  saveCustomCandidates,
  deleteCandidate,
  optOutCandidate,
} from "@/lib/ops-store";
import { useRouter } from "next/navigation";

// ─── Safety level ─────────────────────────────────────────────────────────────
type SafetyLevel = "safe" | "watch" | "at-risk";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const id = typeof params === "object" && params && "id" in params ? params.id : "";
  const [loaded, setLoaded] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [mentorCatalog, setMentorCatalog] = useState<string[]>([]);
  const [mentorInput, setMentorInput] = useState("");
  const [newMentorName, setNewMentorName] = useState("");

  const [journey, setJourney] = useState<SessionItem[]>([]);
  const [reorderMode, setReorderMode]   = useState(false);
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [, setInsertingAt]               = useState<number | null>(null);
  const [hideDone, setHideDone]         = useState(false);
  const [journeyView, setJourneyView]   = useState<"board" | "vertical">("board");

  const [candidateNotes, setCandidateNotes] = useState<string>("");
  const [editingNotes, setEditingNotes]     = useState(false);
  const [notesInput, setNotesInput]         = useState("");
  const [stageAge, setStageAge]             = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOptOutConfirm, setShowOptOutConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!id) {
      setLoaded(true);
      setCandidate(null);
      return;
    }
    const overrides = loadMentorOverrides();
    const base = CANDIDATES.find((c) => c.id === id);
    const custom = loadCustomCandidates().find((c) => c.id === id);
    const found = base ?? custom ?? null;
    if (!found) {
      setCandidate(null);
      setLoaded(true);
      return;
    }
    const resolvedMentor = overrides[found.id] ?? found.mentor;
    const resolved = { ...found, mentor: resolvedMentor };
    setCandidate(resolved);
    setMentorInput(resolvedMentor === "TBD" ? "" : resolvedMentor);
    setMentorCatalog(loadMentorCatalog());
    setJourney(loadJourney(resolved));
    const savedNotes = loadCandidateNotes(resolved.id);
    const initialNotes = savedNotes ?? "";
    setCandidateNotes(initialNotes);
    setNotesInput(initialNotes);
    upsertStageTracking(resolved.id, resolved.currentStageId);
    setStageAge(getStageAgeDays(resolved.id));
    setLoaded(true);
  }, [id]);

  // Auto-save to localStorage and sync stage tracking
  useEffect(() => {
    if (!candidate) return;
    saveJourney(candidate.id, journey);
    const live = computeLiveInfoFromJourney(journey, candidate);
    upsertStageTracking(candidate.id, live.currentStageId);
  }, [journey, candidate]);

  // DnD sensors — must be before early returns to obey Rules of Hooks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: reorderMode ? 6 : 9999 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/candidates" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition">
          ← All candidates
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/candidates" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition">
          ← All candidates
        </Link>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-300">Candidate not found.</p>
        </div>
      </div>
    );
  }

  // Derived — all from live journey data
  const liveInfo     = computeLiveInfoFromJourney(journey, candidate);
  const pct          = liveInfo.progress;
  const currentAct   = liveInfo.currentAction;
  const liveStageId  = liveInfo.currentStageId;
  const currentStage = STAGES.find((s) => s.id === liveStageId);
  const stageStyle   = STAGE_STYLES[liveStageId] ?? STAGE_STYLES[candidate.currentStageId];

  const deadlineAlerts = journey.filter((i) => {
    const ds = getDeadlineStatus(i.deadline);
    return i.status !== "done" && (ds === "overdue" || ds === "urgent");
  });

  const upcomingPending = journey.filter((i) => i.status !== "done" && i.status !== "na");
  const immediateBlocker = upcomingPending.find(
    (i) => i.comment?.toLowerCase().includes("block") || i.status === "on-hold"
  );
  const hasBlockerAhead = !!immediateBlocker && immediateBlocker !== currentAct;

  // Reactive: use the same live pace logic as the dashboard/cards
  const pacing = mounted
    ? computePacingAlertFromItems(candidate, journey.map((i) => ({
        actionId: i.actionId,
        status: i.status,
        date: i.date,
        shortTitle: i.shortTitle,
      })))
    : {
        level: "ok",
        messages: [],
        weeksElapsed: 0,
        stepsPerWeek: 0,
        doneCount: 0,
        totalApplicable: 0,
        projectedTotalWeeks: null,
        hasScheduledCall: false,
        nextScheduledTitle: undefined,
        nextScheduledDate: undefined,
        nextPendingTitle: undefined,
        needsScheduling: false,
        paceBelowTarget: false,
      };
  const paceBucket = mounted ? getPaceBucket(pacing) : "on-track";
  const safetyLevel: SafetyLevel = paceBucket === "on-track" ? "safe" : paceBucket;

  const visibleJourney = hideDone ? journey.filter((i) => i.status !== "done") : journey;
  function handleMentorSave() {
    if (!candidate) return;
    if (!mentorInput.trim()) return;
    saveMentorOverride(candidate.id, mentorInput.trim());
    setCandidate((prev) => (prev ? { ...prev, mentor: mentorInput.trim() } : prev));
    setMentorCatalog(loadMentorCatalog());
  }

  function handleAddMentorName() {
    if (!newMentorName.trim()) return;
    const next = addMentorName(newMentorName.trim());
    setMentorCatalog(next);
    setNewMentorName("");
  }

  function handleDeleteCandidate() {
    if (!candidate) return;
    const fromSeed = CANDIDATES.some((c) => c.id === candidate.id);
    if (fromSeed) {
      deleteCandidate(candidate.id);
    } else {
      const custom = loadCustomCandidates().filter((c) => c.id !== candidate.id);
      saveCustomCandidates(custom);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(`mq-journey-v1-${candidate.id}`);
    }
    router.push("/candidates");
  }

  function handleOptOutCandidate() {
    if (!candidate) return;
    optOutCandidate(candidate.id);
    router.push("/candidates");
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!reorderMode) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setJourney((prev) => {
        const oldIdx = prev.findIndex((i) => i.instanceId === active.id);
        const newIdx = prev.findIndex((i) => i.instanceId === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  // ─── Mutators ───────────────────────────────────────────────────────────────

  function updateItem(instanceId: string, updates: Partial<SessionItem>) {
    setJourney((prev) => {
      const next = prev.map((i) => (i.instanceId === instanceId ? { ...i, ...updates } : i));
      // Auto-sync calendar: add/update when scheduled with a date, remove otherwise
      const item = next.find((i) => i.instanceId === instanceId);
      if (item && candidate) {
        if (item.status === "scheduled" && item.date) {
          saveCalendarEvent({
            instanceId,
            candidateId: candidate.id,
            candidateName: candidate.name,
            sessionTitle: item.shortTitle,
            date: item.date,
          });
        } else {
          removeCalendarEvent(instanceId);
        }
      }
      return next;
    });
  }

  function insertAt(index: number, data: Omit<SessionItem, "instanceId" | "isCustom">) {
    const newItem: SessionItem = {
      ...data,
      instanceId: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      isCustom: true,
    };
    setJourney((prev) => [...prev.slice(0, index), newItem, ...prev.slice(index)]);
  }

  function deleteItem(instanceId: string) {
    setJourney((prev) => prev.filter((i) => i.instanceId !== instanceId));
    if (editingId === instanceId) setEditingId(null);
  }

  function cycleStatus(item: SessionItem) {
    const cycle: ActionStatus[] = ["not-done", "scheduled", "on-hold", "done", "na"];
    const idx = cycle.indexOf(item.status);
    const next = cycle[(idx + 1) % cycle.length];

    const updates: Partial<SessionItem> = { status: next };

    // Auto-set today's date when marking done, clear it when moving away from done
    if (next === "done" && !item.date) {
      const today = new Date();
      updates.date = today.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    if (next !== "done" && item.status === "done") {
      updates.date = undefined;
    }

    updateItem(item.instanceId, updates);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-4">

      {/* Back */}
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
      >
        ← All candidates
      </Link>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border overflow-hidden ${
        safetyLevel === "at-risk" ? "border-red-500/50"
        : safetyLevel === "watch"  ? "border-amber-500/40"
        : "border-sky-500/30"
      }`}>

        {/* Safety strip — always visible */}
        <div className={`px-5 py-2.5 flex items-center justify-between border-b ${
          safetyLevel === "at-risk" ? "bg-red-950/70 border-red-500/30"
          : safetyLevel === "watch"  ? "bg-amber-950/50 border-amber-500/25"
          : "bg-sky-950/40 border-sky-500/20"
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${
              safetyLevel === "at-risk" ? "bg-red-500 animate-pulse"
              : safetyLevel === "watch"  ? "bg-amber-400"
              : "bg-sky-400"
            }`} />
            <p className={`text-xs font-bold uppercase tracking-wider ${
              safetyLevel === "at-risk" ? "text-red-400"
              : safetyLevel === "watch"  ? "text-amber-400"
              : "text-sky-400"
            }`}>
              {safetyLevel === "at-risk" ? "Immediate action required"
               : safetyLevel === "watch"  ? "Needs your attention"
               : "On Track"}
            </p>
          </div>
          {stageAge > 0 && (
            <span className="text-[10px] text-slate-500">{stageAge}d in current stage</span>
          )}
        </div>

        <div className="bg-slate-900 p-5 space-y-4">

          {/* Name row */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg font-bold text-slate-200">
                {candidate.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{candidate.name}</h1>
                  <RiskBadge level={safetyLevel === "safe" ? "normal" : safetyLevel} />
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  {candidate.role}
                  <span className="mx-1.5 text-slate-700">·</span>
                  Mentor: <span className="text-slate-300">{candidate.mentor}</span>
                  <span className="mx-1.5 text-slate-700">·</span>
                  {candidate.enrolledDate}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${stageStyle.bg} ${stageStyle.text} ${stageStyle.border}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${stageStyle.dot}`} />
              {currentStage?.name}
            </span>
          </div>

          {/* Mentor controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={mentorInput}
              onChange={(e) => setMentorInput(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 focus:border-sky-500 focus:outline-none min-w-[140px]"
            >
              <option value="">Select or type below</option>
              {mentorCatalog.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={mentorInput}
              onChange={(e) => setMentorInput(e.target.value)}
              placeholder="Mentor name"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none w-32"
            />
            <button
              type="button"
              onClick={handleMentorSave}
              className="rounded-md bg-violet-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 transition"
            >
              Mentor allot
            </button>
            <span className="text-slate-600">|</span>
            <input
              type="text"
              value={newMentorName}
              onChange={(e) => setNewMentorName(e.target.value)}
              placeholder="New mentor name"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none w-36"
            />
            <button
              type="button"
              onClick={handleAddMentorName}
              className="rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition"
            >
              Add mentor
            </button>
            <button
              type="button"
              onClick={() => { setShowOptOutConfirm(true); setShowDeleteConfirm(false); }}
              className="rounded-md border border-amber-600/50 bg-amber-500/10 px-2 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
            >
              Opted out
            </button>
            <button
              type="button"
              onClick={() => { setShowDeleteConfirm(true); setShowOptOutConfirm(false); }}
              className="rounded-md border border-red-400/40 bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
            >
              🗑 Delete candidate
            </button>
          </div>

          {showOptOutConfirm && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-3 text-xs text-slate-200">
              <p className="mb-2 text-slate-100">Mark {candidate.name} as opted out? They will be moved to the Opted Out page.</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOptOutCandidate}
                  className="rounded-md bg-amber-500 px-2 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400 transition"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowOptOutConfirm(false)}
                  className="rounded-md border border-slate-600 px-2 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="rounded-lg border border-red-500/30 bg-red-900/10 p-3 text-xs text-slate-200">
              <p className="mb-2 text-slate-100">Are you sure you want to delete {candidate.name}? This cannot be undone.</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeleteCandidate}
                  className="rounded-md bg-red-500 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-400 transition"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-md border border-slate-600 px-2 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-slate-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Next Step Spotlight ───────────────────────────────────── */}
          {currentAct ? (
            <div className={`rounded-xl border p-4 ${
              safetyLevel === "at-risk"
                ? "border-red-500/35 bg-red-500/6"
                : safetyLevel === "watch" || currentAct.status === "on-hold"
                ? "border-amber-500/35 bg-amber-500/6"
                : currentAct.status === "scheduled"
                ? "border-sky-500/30 bg-sky-500/5"
                : "border-sky-500/25 bg-sky-500/5"
            }`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${
                safetyLevel === "at-risk" ? "text-red-400/70"
                : safetyLevel === "watch"  ? "text-amber-400/70"
                : "text-sky-400/70"
              }`}>
                Next step to take
              </p>
              <p className="text-base font-bold text-slate-100 leading-snug">
                {currentAct.shortTitle}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-snug">{currentAct.title}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {currentAct.poc && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-slate-600 text-[10px]">POC</span>
                    <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 font-medium text-slate-300">{currentAct.poc}</span>
                  </span>
                )}
                {currentAct.duration && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-slate-600 text-[10px]">DURATION</span>
                    <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 font-medium text-slate-300">{currentAct.duration}</span>
                  </span>
                )}
                {currentAct.status === "on-hold" && (
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">⏸ On Hold</span>
                )}
                {currentAct.status === "scheduled" && (
                  <span className="rounded-full bg-sky-500/10 border border-sky-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-sky-400">
                    ⏰ Scheduled{currentAct.date ? ` · ${currentAct.date}` : ""}
                  </span>
                )}
              </div>
              {currentAct.comment && !currentAct.comment.toLowerCase().includes("mentor not assigned") && (
                <div className="mt-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-300 leading-snug">⚠ {currentAct.comment}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-400">
                {candidate.isAlumni ? "Programme complete ✓" : "All steps complete ✓"}
              </p>
            </div>
          )}

          {/* ── Blocker ahead (different from current step) ───────────── */}
          {hasBlockerAhead && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">
                Blocker ahead — resolve now
              </p>
              <p className="text-sm font-semibold text-red-300">{immediateBlocker!.shortTitle}</p>
              {immediateBlocker!.comment && (
                <p className="text-xs text-red-400/80 leading-snug">{immediateBlocker!.comment}</p>
              )}
            </div>
          )}

          {/* ── Deadline alerts (inline) ──────────────────────────────── */}
          {deadlineAlerts.length > 0 && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">Deadline alerts</p>
              {deadlineAlerts.map((item) => {
                const ds = getDeadlineStatus(item.deadline);
                return (
                  <div key={item.instanceId} className="flex items-center gap-2 text-xs">
                    <span className={ds === "overdue" ? "text-red-400" : "text-amber-400"}>
                      {ds === "overdue" ? "⚠" : "⏰"}
                    </span>
                    <span className="text-slate-300 flex-1 truncate">{item.shortTitle}</span>
                    <span className={`font-semibold ${ds === "overdue" ? "text-red-400" : "text-amber-400"}`}>
                      {deadlineDaysLabel(item.deadline!)}
                    </span>
                    <span className="text-slate-600">{formatDeadline(item.deadline!)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Context / notes (editable) ────────────────────────────── */}
          <div className="rounded-lg border border-slate-700 bg-slate-950/40">
            {/* Header row */}
            <div className="flex items-center justify-between px-3.5 pt-3 pb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Context</p>
              {!editingNotes && (
                <button
                  type="button"
                  onClick={() => { setNotesInput(candidateNotes); setEditingNotes(true); }}
                  className="rounded px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  {candidateNotes ? "Edit" : "+ Add context"}
                </button>
              )}
            </div>

            {/* View mode */}
            {!editingNotes && (
              <div className="px-3.5 pb-3">
                {candidateNotes ? (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-200/90">
                    {candidateNotes}
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 italic">
                    No context added yet. Click &quot;+ Add context&quot; to add notes from the frontend.
                  </p>
                )}
              </div>
            )}

            {/* Edit mode */}
            {editingNotes && (
              <div className="px-3.5 pb-3 space-y-2">
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={5}
                  placeholder="Add context or handover notes..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-none resize-y leading-relaxed"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = notesInput.trim();
                      saveCandidateNotes(candidate.id, trimmed);
                      setCandidateNotes(trimmed);
                      setEditingNotes(false);
                    }}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNotesInput(candidateNotes); setEditingNotes(false); }}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  {candidateNotes && (
                    <button
                      type="button"
                      onClick={() => {
                        saveCandidateNotes(candidate.id, "");
                        setCandidateNotes("");
                        setNotesInput("");
                        setEditingNotes(false);
                      }}
                      className="ml-auto rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-400 hover:bg-slate-800 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Progress bar ──────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Overall progress</span>
              <span className="font-semibold text-slate-200">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  safetyLevel === "at-risk" ? "bg-red-500"
                  : safetyLevel === "watch"  ? "bg-amber-500"
                  : "bg-sky-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── Journey board ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">Journey</span>
            <span className="text-xs text-slate-500">
              {journey.filter((i) => i.status === "done").length}/{journey.filter((i) => i.status !== "na").length} done
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!reorderMode && (
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                <button
                  onClick={() => setJourneyView("board")}
                  className={`px-2.5 py-1.5 text-xs font-medium transition ${
                    journeyView === "board"
                      ? "bg-sky-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  Board
                </button>
                <button
                  onClick={() => setJourneyView("vertical")}
                  className={`px-2.5 py-1.5 text-xs font-medium transition ${
                    journeyView === "vertical"
                      ? "bg-sky-600 text-white"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  Vertical
                </button>
              </div>
            )}
            <button
              onClick={() => setHideDone((v) => !v)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                hideDone ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {hideDone ? "Show all" : "Hide done"}
            </button>
            <button
              onClick={() => { setReorderMode((v) => !v); setEditingId(null); setInsertingAt(null); }}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                reorderMode ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
              }`}
            >
              {reorderMode ? "✓ Done reordering" : "⠿ Reorder"}
            </button>
          </div>
        </div>

        {/* ── Kanban view (default) ─────────────────────────────────────── */}
        {!reorderMode && (
          journeyView === "board" ? (
            <KanbanJourney
              journey={journey}
              visibleJourney={visibleJourney}
              editingId={editingId}
              candidate={candidate}
              onCycleStatus={(item) => cycleStatus(item)}
              onStartEdit={(iid) => { setEditingId((p) => p === iid ? null : iid); setInsertingAt(null); }}
              onSave={(iid, updates) => { updateItem(iid, updates); setEditingId(null); }}
              onCancelEdit={() => setEditingId(null)}
              onDelete={(iid) => deleteItem(iid)}
              onInsert={(idx, data) => insertAt(idx, data)}
            />
          ) : (
            <StackedJourney
              journey={journey}
              visibleJourney={visibleJourney}
              editingId={editingId}
              candidate={candidate}
              onCycleStatus={(item) => cycleStatus(item)}
              onStartEdit={(iid) => { setEditingId((p) => p === iid ? null : iid); setInsertingAt(null); }}
              onSave={(iid, updates) => { updateItem(iid, updates); setEditingId(null); }}
              onCancelEdit={() => setEditingId(null)}
              onDelete={(iid) => deleteItem(iid)}
              onInsert={(idx, data) => insertAt(idx, data)}
            />
          )
        )}

        {/* ── Reorder list view ─────────────────────────────────────────── */}
        {reorderMode && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={journey.map((i) => i.instanceId)} strategy={verticalListSortingStrategy}>
              <div>
                {visibleJourney.map((item) => (
                  <SessionRow
                    key={item.instanceId}
                    item={item}
                    reorderMode={reorderMode}
                    isEditing={false}
                    templateOpen={false}
                    candidate={candidate}
                    onCycleStatus={() => cycleStatus(item)}
                    onStartEdit={() => {}}
                    onSave={() => {}}
                    onCancelEdit={() => {}}
                    onDelete={() => deleteItem(item.instanceId)}
                    onToggleTemplate={() => {}}
                  />
                ))}
                {visibleJourney.length === 0 && (
                  <p className="py-10 text-center text-sm text-slate-600">No visible steps.</p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

    </div>
  );
}

// ─── KanbanJourney ────────────────────────────────────────────────────────────

function KanbanJourney({
  journey, visibleJourney, editingId, candidate, onCycleStatus, onStartEdit, onSave, onCancelEdit, onDelete, onInsert,
}: {
  journey: SessionItem[];
  visibleJourney: SessionItem[];
  editingId: string | null;
  candidate: Candidate;
  onCycleStatus: (item: SessionItem) => void;
  onStartEdit: (iid: string) => void;
  onSave: (iid: string, updates: Partial<SessionItem>) => void;
  onCancelEdit: () => void;
  onDelete: (iid: string) => void;
  onInsert: (idx: number, data: Omit<SessionItem, "instanceId" | "isCustom">) => void;
}) {
  const knownStageIds = new Set<string>(STAGES.map((s) => s.id));
  const stageEntries = STAGES
    .filter((s) => s.id !== "alumni")
    .map((stage) => {
      const items = visibleJourney.filter((i) => i.stageId === stage.id);
      const lastIdx = journey.reduce((acc, it, idx) => it.stageId === stage.id ? idx : acc, -1);
      const insertIdx = lastIdx >= 0 ? lastIdx + 1 : journey.length;

      return { stage, items, insertIdx };
    })
    .filter(({ items }) => items.length > 0);

  return (
    <div className="flex min-h-[200px] gap-3 overflow-x-auto p-4 pb-5 transition-all duration-200">
      {stageEntries.map(({ stage, items, insertIdx }) => (
          <KanbanColumn
            key={stage.id}
            stageId={stage.id}
            stageName={stage.name}
            items={items}
            insertIdx={insertIdx}
            editingId={editingId}
            candidate={candidate}
            onCycleStatus={onCycleStatus}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onInsert={onInsert}
          />
      ))}

      {/* Custom steps column — items with no recognised stageId */}
      {(() => {
        const customItems = visibleJourney.filter((i) => !i.stageId || !knownStageIds.has(i.stageId as string));
        if (customItems.length === 0) return null;
        return (
          <KanbanColumn
            key="__custom__"
            stageId="__custom__"
            stageName="Custom"
            items={customItems}
            insertIdx={journey.length}
            editingId={editingId}
            candidate={candidate}
            onCycleStatus={onCycleStatus}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onInsert={onInsert}
          />
        );
      })()}

      {visibleJourney.length === 0 && (
        <div className="flex min-h-[160px] flex-1 items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-600">
          No visible steps.
        </div>
      )}
    </div>
  );
}

function StackedJourney({
  journey, visibleJourney, editingId, candidate, onCycleStatus, onStartEdit, onSave, onCancelEdit, onDelete, onInsert,
}: {
  journey: SessionItem[];
  visibleJourney: SessionItem[];
  editingId: string | null;
  candidate: Candidate;
  onCycleStatus: (item: SessionItem) => void;
  onStartEdit: (iid: string) => void;
  onSave: (iid: string, updates: Partial<SessionItem>) => void;
  onCancelEdit: () => void;
  onDelete: (iid: string) => void;
  onInsert: (idx: number, data: Omit<SessionItem, "instanceId" | "isCustom">) => void;
}) {
  const knownStageIds = new Set<string>(STAGES.map((s) => s.id));
  const stageEntries = STAGES
    .filter((s) => s.id !== "alumni")
    .map((stage) => {
      const items = visibleJourney.filter((i) => i.stageId === stage.id);
      const lastIdx = journey.reduce((acc, it, idx) => it.stageId === stage.id ? idx : acc, -1);
      const insertIdx = lastIdx >= 0 ? lastIdx + 1 : journey.length;

      return { stage, items, insertIdx };
    })
    .filter(({ items }) => items.length > 0);

  return (
    <div className="space-y-3 p-4 transition-all duration-200">
      {stageEntries.map(({ stage, items, insertIdx }) => (
          <KanbanColumn
            key={stage.id}
            stageId={stage.id}
            stageName={stage.name}
            items={items}
            insertIdx={insertIdx}
            editingId={editingId}
            candidate={candidate}
            onCycleStatus={onCycleStatus}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onInsert={onInsert}
            layout="stacked"
          />
      ))}

      {(() => {
        const customItems = visibleJourney.filter((i) => !i.stageId || !knownStageIds.has(i.stageId as string));
        if (customItems.length === 0) return null;

        return (
          <KanbanColumn
            key="__custom__"
            stageId="__custom__"
            stageName="Custom"
            items={customItems}
            insertIdx={journey.length}
            editingId={editingId}
            candidate={candidate}
            onCycleStatus={onCycleStatus}
            onStartEdit={onStartEdit}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            onInsert={onInsert}
            layout="stacked"
          />
        );
      })()}

      {visibleJourney.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-600">No visible steps.</p>
      )}
    </div>
  );
}

// ─── KanbanColumn ─────────────────────────────────────────────────────────────

function KanbanColumn({
  stageId, stageName, items, insertIdx, editingId, candidate, layout = "board",
  onCycleStatus, onStartEdit, onSave, onCancelEdit, onDelete, onInsert,
}: {
  stageId: string;
  stageName: string;
  items: SessionItem[];
  insertIdx: number;
  editingId: string | null;
  candidate: Candidate;
  layout?: "board" | "stacked";
  onCycleStatus: (item: SessionItem) => void;
  onStartEdit: (iid: string) => void;
  onSave: (iid: string, updates: Partial<SessionItem>) => void;
  onCancelEdit: () => void;
  onDelete: (iid: string) => void;
  onInsert: (idx: number, data: Omit<SessionItem, "instanceId" | "isCustom">) => void;
}) {
  const [addingStep, setAddingStep] = useState(false);
  const s = STAGE_STYLES[stageId] ?? { bg: "bg-slate-800/40", text: "text-slate-400", border: "border-slate-700", dot: "bg-slate-500" };
  const doneCount = items.filter((i) => i.status === "done").length;
  const activeCount = items.filter((i) => i.status !== "done" && i.status !== "na").length;

  return (
    <div className={layout === "stacked" ? "w-full" : "flex-shrink-0 w-56"}>
      {/* Column header */}
      <div className={`flex items-center justify-between rounded-t-xl px-3 py-2 border border-b-0 ${s.bg} ${s.border}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
          <span className={`text-xs font-bold truncate ${s.text}`}>{stageName}</span>
        </div>
        <span className={`text-[10px] font-bold shrink-0 ${s.text}`}>{doneCount}/{items.length}</span>
      </div>

      {/* Cards */}
      <div className={`rounded-b-xl border border-t-0 ${s.border} bg-slate-900/80 p-2 space-y-2 min-h-[80px]`}>
        {items.length === 0 && !addingStep && (
          <p className="text-center text-[10px] text-slate-700 py-2">No steps</p>
        )}
        {items.map((item) => (
          <KanbanCard
            key={item.instanceId}
            item={item}
            isEditing={editingId === item.instanceId}
            isCurrent={item.status !== "done" && item.status !== "na" && activeCount > 0 && items.find((i) => i.status !== "done" && i.status !== "na") === item}
            candidate={candidate}
            onCycleStatus={() => onCycleStatus(item)}
            onStartEdit={() => onStartEdit(item.instanceId)}
            onSave={(upd) => onSave(item.instanceId, upd)}
            onCancelEdit={onCancelEdit}
            onDelete={() => onDelete(item.instanceId)}
          />
        ))}

        {/* Add step */}
        {addingStep ? (
          <KanbanInsertForm
            stageId={stageId}
            onInsert={(data) => { onInsert(insertIdx, { ...data, stageId }); setAddingStep(false); }}
            onCancel={() => setAddingStep(false)}
          />
        ) : (
          <button
            onClick={() => setAddingStep(true)}
            className="w-full rounded-lg border border-dashed border-slate-700 py-1.5 text-[10px] text-slate-600 hover:text-sky-400 hover:border-sky-500/40 transition"
          >
            + Add step
          </button>
        )}
      </div>
    </div>
  );
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────

function KanbanCard({
  item, isEditing, isCurrent, candidate, onCycleStatus, onStartEdit, onSave, onCancelEdit, onDelete,
}: {
  item: SessionItem;
  isEditing: boolean;
  isCurrent: boolean;
  candidate: Candidate;
  onCycleStatus: () => void;
  onStartEdit: () => void;
  onSave: (updates: Partial<SessionItem>) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const [showMessages, setShowMessages] = useState(false);
  const tpl = item.actionId != null ? MESSAGE_TEMPLATES[item.actionId] : undefined;
  const isDone = item.status === "done";
  const isNA = item.status === "na";
  const isOnHold = item.status === "on-hold";
  const isScheduled = item.status === "scheduled";

  const cardCls = isDone || isNA
    ? "border-slate-800 bg-slate-950/40 opacity-55"
    : isCurrent
    ? "border-sky-500/40 bg-sky-500/5 ring-1 ring-sky-500/20"
    : isOnHold
    ? "border-amber-500/30 bg-amber-500/5"
    : isScheduled
    ? "border-sky-500/25 bg-sky-500/4"
    : "border-slate-700 bg-slate-900";

  return (
    <div className={`rounded-lg border overflow-hidden transition-all ${cardCls}`}>
      <div className="p-2.5 space-y-2">
        {/* Status + Title */}
        <div className="flex items-start gap-2">
          <button onClick={(e) => { e.stopPropagation(); onCycleStatus(); }} className="mt-0.5 shrink-0" title="Cycle status">
            <StatusIcon status={item.status} />
          </button>
          <p className={`text-xs font-semibold leading-snug flex-1 min-w-0 ${isDone || isNA ? "text-slate-500" : "text-slate-100"}`}>
            {item.shortTitle}
            {item.isCustom && <span className="ml-1 rounded bg-violet-500/15 px-1 py-0.5 text-[9px] text-violet-400 font-normal">custom</span>}
          </p>
        </div>

        {/* Meta */}
        {(item.poc || item.duration || (isScheduled && item.date)) && (
          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 pl-7">
            {item.poc && <span className="text-[10px] text-slate-400">👤 {item.poc}</span>}
            {item.duration && <span className="text-[10px] text-slate-400">⏱ {item.duration}</span>}
            {isScheduled && item.date && <span className="text-[10px] text-sky-400">⏰ {item.date}</span>}
          </div>
        )}

        {/* Comment */}
        {item.comment && !item.comment.toLowerCase().includes("mentor not assigned") && (
          <p className="pl-7 text-[10px] text-amber-400 leading-snug">⚠ {item.comment}</p>
        )}


        {/* Actions row */}
        <div className="pl-7 flex items-center gap-1.5 flex-wrap">
          {tpl && !isDone && !isNA && (
            <button
              onClick={() => setShowMessages((v) => !v)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${showMessages ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"}`}
            >
              {showMessages ? "▲ Messages" : "📋 Messages"}
            </button>
          )}
          <button
            onClick={onStartEdit}
            className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 transition"
          >
            Edit
          </button>
          {item.isCustom && (
            <button
              onClick={onDelete}
              className="rounded px-1.5 py-0.5 text-[10px] text-slate-600 hover:text-red-400 hover:bg-slate-800 transition ml-auto"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Messages dropdown */}
      {showMessages && tpl && (
        <div className="border-t border-slate-700 bg-slate-950/60 p-2.5 space-y-2">
          {tpl.before && (
            <TemplateCard label="📤 Before" color="sky" template={tpl.before} candidate={candidate} />
          )}
          {tpl.after && (
            <TemplateCard label="📥 After / MOM" color="emerald" template={tpl.after} candidate={candidate} />
          )}
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <div className="border-t border-slate-700">
          <EditForm item={item} onSave={onSave} onCancel={onCancelEdit} />
        </div>
      )}
    </div>
  );
}

// ─── KanbanInsertForm ─────────────────────────────────────────────────────────

function KanbanInsertForm({
  stageId, onInsert, onCancel,
}: {
  stageId: string;
  onInsert: (data: Omit<SessionItem, "instanceId" | "isCustom">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [poc, setPoc] = useState("");
  const [duration, setDuration] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onInsert({ title: title.trim(), shortTitle: title.trim(), poc: poc.trim() || undefined, duration: duration.trim() || undefined, status: "not-done", stageId });
    setTitle(""); setPoc(""); setDuration("");
  }

  const inp = "w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-none";
  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Step name *" className={inp} required />
      <input value={poc} onChange={(e) => setPoc(e.target.value)} placeholder="PoC / Owner" className={inp} />
      <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (e.g. 30 min)" className={inp} />
      <div className="flex gap-1.5 pt-0.5">
        <button type="submit" className="rounded bg-sky-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-sky-500 transition">Add</button>
        <button type="button" onClick={onCancel} className="rounded bg-slate-800 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-slate-700 transition">Cancel</button>
      </div>
    </form>
  );
}

// ─── SessionRow ───────────────────────────────────────────────────────────────

interface SessionRowProps {
  item: SessionItem;
  reorderMode: boolean;
  isEditing: boolean;
  templateOpen: boolean;
  candidate: Candidate;
  onCycleStatus: () => void;
  onStartEdit: () => void;
  onSave: (updates: Partial<SessionItem>) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onToggleTemplate: () => void;
}

function SessionRow({
  item,
  reorderMode,
  isEditing,
  templateOpen,
  candidate,
  onCycleStatus,
  onStartEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onToggleTemplate,
}: SessionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.instanceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tpl = item.actionId != null ? MESSAGE_TEMPLATES[item.actionId] : undefined;

  const isDone     = item.status === "done";
  const isNA       = item.status === "na";
  const isOnHold   = item.status === "on-hold";
  const isScheduled = item.status === "scheduled";

  // Stage color for the tiny indicator
  const stageStyle = item.stageId ? STAGE_STYLES[item.stageId] : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-b border-slate-700/60 last:border-b-0 transition-colors ${
        isDragging ? "opacity-50 bg-slate-800/50 z-10" : ""
      } ${
        isEditing ? "bg-slate-800/30" : ""
      } ${
        isDone || isNA ? "opacity-55" : ""
      }`}
    >
      {/* Main row */}
      <div
        className={`flex items-start gap-3 px-4 py-3 ${
          reorderMode ? "" : "cursor-pointer hover:bg-slate-800/50"
        } transition-colors`}
        onClick={reorderMode ? undefined : onStartEdit}
      >
        {/* Drag handle (reorder mode) or status icon (normal mode) */}
        {reorderMode ? (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition shrink-0 touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
              <circle cx="3" cy="3" r="1.5" /><circle cx="9" cy="3" r="1.5" />
              <circle cx="3" cy="9" r="1.5" /><circle cx="9" cy="9" r="1.5" />
              <circle cx="3" cy="15" r="1.5" /><circle cx="9" cy="15" r="1.5" />
            </svg>
          </button>
        ) : (
          <button
            className="mt-0.5 shrink-0"
            onClick={(e) => { e.stopPropagation(); onCycleStatus(); }}
            title="Click to cycle status"
          >
            <StatusIcon status={item.status} />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className={`text-sm font-semibold leading-snug ${isDone || isNA ? "text-slate-500" : "text-slate-50"}`}>
              {item.shortTitle}
              {item.isCustom && (
                <span className="ml-1.5 rounded bg-violet-500/15 px-1 py-0.5 text-[10px] text-violet-400 font-normal">
                  custom
                </span>
              )}
            </p>

            {/* Stage dot */}
            {stageStyle && !isDone && (
              <span className={`mt-0.5 h-1.5 w-1.5 rounded-full shrink-0 ${stageStyle.dot} opacity-60`} />
            )}
          </div>

          {/* Subtitle row: tags */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {item.poc && (
              <span className="text-xs text-slate-300">👤 {item.poc}</span>
            )}
            {item.duration && (
              <span className="text-xs text-slate-300">⏱ {item.duration}</span>
            )}
            {item.date && !isDone && (
              <span className="text-xs text-slate-400">📅 {item.date}</span>
            )}
            {isDone && item.date && (
              <span className="text-xs text-slate-500">Done · {item.date}</span>
            )}
            {isOnHold && (
              <span className="rounded-full bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] text-amber-400">
                ⏸ On hold
              </span>
            )}
            {isScheduled && (
              <span className="rounded-full bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 text-[10px] text-sky-400">
                ⏰ Scheduled{item.date ? ` · ${item.date}` : ""}
              </span>
            )}
            {/* Comment */}
            {item.comment && !item.comment.toLowerCase().includes("mentor not assigned") && (
              <span className="text-[10px] text-amber-500/80 truncate max-w-[200px]">
                ⚠ {item.comment}
              </span>
            )}
          </div>
        </div>

        {/* Right-side actions */}
        {!reorderMode && (
          <div className="flex items-center gap-1 shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
            {tpl && (
              <button
                onClick={onToggleTemplate}
                className={`rounded px-2 py-1 text-xs transition ${
                  templateOpen
                    ? "bg-slate-700 text-slate-200"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                }`}
                title="Message templates"
              >
                {templateOpen ? "▲" : "📋"}
              </button>
            )}
            {item.isCustom && (
              <button
                onClick={onDelete}
                className="rounded px-2 py-1 text-xs text-slate-600 hover:text-red-400 hover:bg-slate-800 transition"
                title="Delete custom session"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit form (inline expansion) */}
      {isEditing && (
        <EditForm
          item={item}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      )}

      {/* Template panel */}
      {templateOpen && tpl && !isEditing && (
        <div className="border-t border-slate-800/40 bg-slate-950/40 px-4 py-3 space-y-2">
          {tpl.before && (
            <TemplateCard
              label="📤 Before session"
              color="sky"
              template={tpl.before}
              candidate={candidate}
            />
          )}
          {tpl.after && (
            <TemplateCard
              label="📥 After session / MOM"
              color="emerald"
              template={tpl.after}
              candidate={candidate}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── EditForm ─────────────────────────────────────────────────────────────────

/** Convert a display date like "7 Mar" / "13 Feb 2026" to ISO YYYY-MM-DD for the date picker. */
function displayToISO(s: string): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const MONTHS: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const p = s.trim().split(/\s+/);
  if (p.length >= 2) {
    const day = p[0].padStart(2, "0");
    const mon = MONTHS[p[1]];
    const yr  = p.length >= 3 ? p[2] : new Date().getFullYear().toString();
    if (day && mon && yr) return `${yr}-${mon}-${day}`;
  }
  return "";
}

/** Format ISO YYYY-MM-DD to "15 Mar 2026" for display/storage. */
function isoToDisplay(s: string): string {
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  return s;
}

function EditForm({
  item,
  onSave,
  onCancel,
}: {
  item: SessionItem;
  onSave: (updates: Partial<SessionItem>) => void;
  onCancel: () => void;
}) {
  const [shortTitle, setShortTitle] = useState(item.shortTitle);
  const [poc, setPoc]               = useState(item.poc ?? "");
  const [duration, setDuration]     = useState(item.duration ?? "");
  const [status, setStatus]         = useState<ActionStatus>(item.status);
  const [date, setDate]             = useState(displayToISO(item.date ?? ""));
  const [comment, setComment]       = useState(item.comment ?? "");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      shortTitle: shortTitle.trim() || item.shortTitle,
      poc: poc.trim() || undefined,
      duration: duration.trim() || undefined,
      status,
      date: date ? isoToDisplay(date) : undefined,
      deadline: undefined, // deadline replaced by the scheduled date above
      comment: comment.trim() || undefined,
    });
  }

  const inputCls =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-none";

  return (
    <form
      onSubmit={handleSave}
      className="border-t border-slate-800/60 bg-slate-900/60 px-4 py-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Session name
          </label>
          <input
            type="text"
            value={shortTitle}
            onChange={(e) => setShortTitle(e.target.value)}
            className={inputCls}
            placeholder="Short name for this session"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ActionStatus)}
            className={inputCls}
          >
            <option value="not-done">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="on-hold">On Hold</option>
            <option value="done">Done</option>
            <option value="na">N/A</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Scheduled / completion date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            PoC / Owner
          </label>
          <input
            type="text"
            value={poc}
            onChange={(e) => setPoc(e.target.value)}
            placeholder="e.g. Ops Team A"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Duration
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 30 min"
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Note / comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any notes or blockers…"
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 transition"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  label,
  color,
  template,
  candidate,
}: {
  label: string;
  color: "sky" | "emerald";
  template: string;
  candidate: { name: string; mentor: string; role: string };
}) {
  const [copied, setCopied] = useState(false);

  const text = template
    .replace(/\{\{name\}\}/g,   candidate.name)
    .replace(/\{\{mentor\}\}/g, candidate.mentor)
    .replace(/\{\{role\}\}/g,   candidate.role);

  async function copy() {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const borderCl = color === "sky" ? "border-sky-500/20"     : "border-emerald-500/20";
  const labelCl  = color === "sky" ? "text-sky-400"          : "text-emerald-400";
  const btnNorm  = color === "sky" ? "bg-sky-600 hover:bg-sky-500 text-white" : "bg-emerald-700 hover:bg-emerald-600 text-white";

  return (
    <div className={`rounded-lg border ${borderCl} bg-slate-900 overflow-hidden`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/50">
        <span className={`text-xs font-semibold ${labelCl}`}>{label}</span>
        <button
          onClick={copy}
          className={`rounded px-2.5 py-1 text-xs font-medium transition ${
            copied ? "bg-emerald-600 text-white" : btnNorm
          }`}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-300 px-3 py-3">
        {text}
      </pre>
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ActionStatus | string }) {
  const base = "h-5 w-5 rounded-full flex items-center justify-center shrink-0 border-2 transition";
  if (status === "done")
    return (
      <span className={`${base} bg-emerald-500/25 border-emerald-500/60 text-emerald-400`} title="Done — click to change">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1,4 3.5,7 9,1" />
        </svg>
      </span>
    );
  if (status === "on-hold")
    return (
      <span className={`${base} bg-amber-500/15 border-amber-500/50 text-amber-300 text-[10px]`} title="On hold — click to change">⏸</span>
    );
  if (status === "scheduled")
    return (
      <span className={`${base} bg-sky-500/15 border-sky-500/50 text-sky-300 text-[10px]`} title="Scheduled — click to change">⏰</span>
    );
  if (status === "na")
    return (
      <span className={`${base} bg-slate-800/50 border-slate-600/50 text-slate-500 text-[10px]`} title="N/A — click to change">—</span>
    );
  return (
    <span className={`${base} border-slate-500 bg-slate-800/40`} title="Pending — click to change">
      <span className="h-2 w-2 rounded-full border-2 border-slate-400" />
    </span>
  );
}

function RiskBadge({ level }: { level: string }) {
  if (level === "at-risk")
    return <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-500/30">⚠ At Risk</span>;
  if (level === "watch")
    return <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/30">👁 Watch</span>;
  return null;
}
