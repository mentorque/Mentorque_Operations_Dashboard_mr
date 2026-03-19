import { CANDIDATES, JOURNEY_ACTIONS } from "@/lib/data";
import type { Candidate, StageId, RiskLevel } from "@/lib/data";

// ─── Pacing analysis ──────────────────────────────────────────────────────────

export interface PacingAlert {
  level: "ok" | "warning" | "critical";
  messages: string[];
  pacingReason: string;
  weeksElapsed: number;
  stepsPerWeek: number;       // actual completed steps/week
  doneCount: number;
  totalApplicable: number;
  projectedTotalWeeks: number | null; // estimated weeks to finish at current pace
  hasScheduledCall: boolean;
  nextScheduledTitle: string | undefined;
  nextScheduledDate: string | undefined;
  nextPendingTitle: string | undefined;
  needsScheduling: boolean;
  paceBelowTarget: boolean;
}

export type PaceBucket = "at-risk" | "watch" | "on-track";

const JOURNEY_MAP = new Map(JOURNEY_ACTIONS.map((a) => [a.id, a]));
const JOURNEY_LS_KEY = (id: string) => `mq-journey-v1-${id}`;

/** Parse display dates like "13 Feb 2026", "Feb 2026", "5 Jan" */
function parseDisplayDate(str: string): Date | null {
  const MONTHS: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const p = str.trim().split(/\s+/);
  if (p.length >= 3) {
    const d = parseInt(p[0]), m = MONTHS[p[1]], y = parseInt(p[2]);
    if (!isNaN(d) && m !== undefined && !isNaN(y)) return new Date(y, m, d);
  }
  if (p.length === 2) {
    const m = MONTHS[p[0]], y = parseInt(p[1]);
    if (m !== undefined && !isNaN(y)) return new Date(y, m, 1);
  }
  return null;
}

/** Minimal shape we need from a live journey item */
export interface PacingLiveItem {
  actionId?: number;
  status: string;
  date?: string;
  shortTitle?: string;
}

/**
 * Load the live journey for a candidate from localStorage.
 * Falls back to building from candidate.actions if nothing saved yet.
 */
/**
 * Programme pacing rules (all driven from the live localStorage journey):
 *  – Minimum pace: 2 completed steps/week
 *  – If work remains and no next call is scheduled → flag for ops
 *  – If pace drops below 2/week after 2 weeks → monitor candidate
 */
function buildPacingAlert(candidate: Candidate, items?: PacingLiveItem[]): PacingAlert {
  const empty: PacingAlert = {
    level: "ok",
    messages: [],
    pacingReason: "",
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

  // Alumni are always treated as complete – no pacing banner needed
  if (candidate.isAlumni) return empty;

  const weekMs = 7 * 24 * 60 * 60 * 1000;

  // Live items (items[] parameter first; fallback to localStorage/seed).
  let liveItems: PacingLiveItem[];
  if (items) {
    liveItems = items;
  } else if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(JOURNEY_LS_KEY(candidate.id));
      if (raw) {
        const parsed = JSON.parse(raw) as PacingLiveItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          liveItems = parsed;
        } else {
          liveItems = candidate.actions.map((a) => ({
            actionId: a.actionId,
            status: a.status,
            date: a.date,
            shortTitle: JOURNEY_MAP.get(a.actionId)?.shortTitle,
          }));
        }
      } else {
        liveItems = candidate.actions.map((a) => ({
          actionId: a.actionId,
          status: a.status,
          date: a.date,
          shortTitle: JOURNEY_MAP.get(a.actionId)?.shortTitle,
        }));
      }
    } catch {
      liveItems = candidate.actions.map((a) => ({
        actionId: a.actionId,
        status: a.status,
        date: a.date,
        shortTitle: JOURNEY_MAP.get(a.actionId)?.shortTitle,
      }));
    }
  } else {
    liveItems = candidate.actions.map((a) => ({
      actionId: a.actionId,
      status: a.status,
      date: a.date,
      shortTitle: JOURNEY_MAP.get(a.actionId)?.shortTitle,
    }));
  }

  // Informational counts (do not drive banner)
  const applicable = liveItems.filter((i) => i.status !== "na");
  const doneCount = applicable.filter((i) => i.status === "done").length;
  const remaining = applicable.length - doneCount;
  const totalApplicable = applicable.length;

  // Scheduled call lookup (informational)
  const scheduledItem = liveItems.find((i) => i.status === "scheduled");
  const nextPendingItem = liveItems.find(
    (i) => i.status !== "done" && i.status !== "na",
  );
  const hasScheduledCall = !!scheduledItem;
  const nextScheduledTitle = scheduledItem
    ? scheduledItem.shortTitle ??
      (scheduledItem.actionId != null
        ? JOURNEY_MAP.get(scheduledItem.actionId)?.shortTitle
        : undefined)
    : undefined;
  const nextScheduledDate = scheduledItem?.date;
  const nextPendingTitle = nextPendingItem
    ? nextPendingItem.shortTitle ??
      (nextPendingItem.actionId != null
        ? JOURNEY_MAP.get(nextPendingItem.actionId)?.shortTitle
        : undefined)
    : undefined;

  // ── WEEK CALCULATION ─────────────────────────────────────────────────────
  // Parse candidate.enrolledDate using parseDisplayDate. If it fails, we can't compute.
  const parsedEnrolled = parseDisplayDate(candidate.enrolledDate);
  if (!parsedEnrolled) return { ...empty, level: "ok" };

  const enrolledDate = new Date(parsedEnrolled.getTime());
  enrolledDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let weekNumber = Math.floor((today.getTime() - enrolledDate.getTime()) / weekMs) + 1;
  if (!Number.isFinite(weekNumber) || weekNumber < 1) weekNumber = 1;

  const currentWeekStart = new Date(enrolledDate.getTime() + (weekNumber - 1) * weekMs);
  const currentWeekEnd = new Date(enrolledDate.getTime() + weekNumber * weekMs);

  // ── THURSDAY RULE ─────────────────────────────────────────────────────────
  const thursdayOfWeek = new Date(currentWeekStart.getTime() + 3 * 24 * 60 * 60 * 1000);
  const isPastThursday = today.getTime() >= thursdayOfWeek.getTime();

  // ── COUNT DONE / SCHEDULED THIS WEEK ─────────────────────────────────────
  let doneThisWeek = 0;
  for (const item of liveItems) {
    if (item.status !== "done") continue;
    if (!item.date || !item.date.trim()) continue;
    const parsed = parseDisplayDate(item.date);
    if (!parsed) continue;
    const itemDate = new Date(parsed.getTime());
    itemDate.setHours(0, 0, 0, 0);
    if (itemDate >= currentWeekStart && itemDate < currentWeekEnd) {
      doneThisWeek += 1;
    }
  }

  const scheduledThisWeek = liveItems.filter((i) => {
    if (i.status !== "scheduled") return false;
    if (!i.date) return false;
    const d = parseDisplayDate(i.date);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d >= currentWeekStart && d < currentWeekEnd;
  }).length;

  // ── SAFETY LEVEL RULES ────────────────────────────────────────────────────
  let level: "ok" | "warning" | "critical";
  let needsScheduling: boolean;
  let paceBelowTarget: boolean;
  let pacingReason: string;

  if (doneThisWeek >= 2) {
    level = "ok";
    needsScheduling = false;
    paceBelowTarget = false;
    pacingReason = `${doneThisWeek} activities completed this week ✓`;
  } else if (doneThisWeek === 1) {
    level = "warning";
    needsScheduling = false;
    paceBelowTarget = true;
    pacingReason = "1 of 2 activities done this week — 1 more needed";
  } else if (scheduledThisWeek >= 1) {
    level = "warning";
    needsScheduling = false;
    paceBelowTarget = true;
    pacingReason = "No completions yet — session scheduled this week";
  } else if (isPastThursday) {
    level = "critical";
    needsScheduling = true;
    paceBelowTarget = true;
    pacingReason = "No activities completed this week — action required";
  } else {
    level = "warning";
    needsScheduling = false;
    paceBelowTarget = true;
    pacingReason = "Week in progress — no activities yet";
  }

  const messages = level === "ok" ? [] : [pacingReason];

  // Keep the rest of the PacingAlert shape intact (informational)
  const weeksElapsed = Math.max(1, weekNumber);
  const stepsPerWeek = weeksElapsed > 0 ? doneCount / weeksElapsed : 0;
  const projectedTotalWeeks =
    stepsPerWeek > 0 ? weeksElapsed + remaining / stepsPerWeek : null;

  return {
    level,
    messages,
    pacingReason,
    weeksElapsed,
    stepsPerWeek,
    doneCount,
    totalApplicable,
    projectedTotalWeeks,
    hasScheduledCall,
    nextScheduledTitle,
    nextScheduledDate,
    nextPendingTitle,
    needsScheduling,
    paceBelowTarget,
  };
}

export function computePacingAlert(candidate: Candidate): PacingAlert {
  return buildPacingAlert(candidate);
}

export function computePacingAlertFromItems(candidate: Candidate, items: PacingLiveItem[]): PacingAlert {
  return buildPacingAlert(candidate, items);
}

export function getPaceBucket(pacing: Pick<PacingAlert, "needsScheduling" | "paceBelowTarget">): PaceBucket {
  if (pacing.needsScheduling) return "at-risk";
  if (pacing.paceBelowTarget) return "watch";
  return "on-track";
}

const CUSTOM_CANDIDATES_KEY = "mq-custom-candidates-v1";
const MENTOR_OVERRIDES_KEY = "mq-mentor-overrides-v1";
const DAILY_TASKS_KEY = "mq-daily-tasks-v1";
const STAGE_TRACKER_KEY = "mq-stage-tracker-v1";
const MENTOR_CATALOG_KEY = "mq-mentor-catalog-v1";
const CANDIDATE_NOTES_KEY = "mq-candidate-notes-v1";
const CALENDAR_EVENTS_KEY = "mq-calendar-events-v1";

// ─── Calendar Events ──────────────────────────────────────────────────────────

export interface CalendarEvent {
  instanceId: string;   // session instanceId — used as the dedup key
  candidateId: string;
  candidateName: string;
  sessionTitle: string;
  date: string;         // display date string, e.g. "20 Mar 2026"
}

export function loadCalendarEvents(): CalendarEvent[] {
  return safeRead<CalendarEvent[]>(CALENDAR_EVENTS_KEY, []);
}

export function saveCalendarEvent(event: CalendarEvent): void {
  const events = safeRead<CalendarEvent[]>(CALENDAR_EVENTS_KEY, []);
  const idx = events.findIndex((e) => e.instanceId === event.instanceId);
  if (idx >= 0) {
    events[idx] = event;
  } else {
    events.push(event);
  }
  safeWrite(CALENDAR_EVENTS_KEY, events);
}

export function removeCalendarEvent(instanceId: string): void {
  const events = safeRead<CalendarEvent[]>(CALENDAR_EVENTS_KEY, []);
  safeWrite(CALENDAR_EVENTS_KEY, events.filter((e) => e.instanceId !== instanceId));
}

export interface DailyTaskState {
  task: string;
  updatedAt: string;
}

interface StageTrackEntry {
  stageId: string;
  enteredAt: string; // ISO date
}

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDefaultActions() {
  return JOURNEY_ACTIONS.map((a) => ({ actionId: a.id, status: "not-done" as const }));
}

export function loadCustomCandidates(): Candidate[] {
  return safeRead<Candidate[]>(CUSTOM_CANDIDATES_KEY, []);
}

export function saveCustomCandidates(candidates: Candidate[]): void {
  safeWrite(CUSTOM_CANDIDATES_KEY, candidates);
}

export function createCandidate(input: {
  name: string;
  role: string;
  mentor?: string;
  stageId: StageId;
  riskLevel?: RiskLevel;
  enrolledDate?: string;
}): Candidate {
  const current = loadCustomCandidates();
  const baseId = slugify(input.name) || "candidate";
  const uniqueId = `${baseId}-${Date.now().toString().slice(-6)}`;
  const now = new Date();
  const candidate: Candidate = {
    id: uniqueId,
    name: input.name.trim(),
    role: input.role.trim() || "TBD",
    mentor: input.mentor?.trim() || "TBD",
    currentStageId: input.stageId,
    riskLevel: input.riskLevel ?? "normal",
    isAlumni: input.stageId === "alumni",
    enrolledDate:
      input.enrolledDate ??
      now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    actions: buildDefaultActions(),
    notes: "New candidate added from Ops dashboard.",
  };
  saveCustomCandidates([...current, candidate]);
  return candidate;
}

export function loadMentorOverrides(): Record<string, string> {
  return safeRead<Record<string, string>>(MENTOR_OVERRIDES_KEY, {});
}

export function saveMentorOverride(candidateId: string, mentorName: string): void {
  const current = loadMentorOverrides();
  current[candidateId] = mentorName;
  safeWrite(MENTOR_OVERRIDES_KEY, current);
}

export function loadDailyTasks(): Record<string, DailyTaskState> {
  return safeRead<Record<string, DailyTaskState>>(DAILY_TASKS_KEY, {});
}

export function saveDailyTask(candidateId: string, task: string): void {
  const current = loadDailyTasks();
  if (!task.trim()) {
    delete current[candidateId];
  } else {
    current[candidateId] = {
      task: task.trim(),
      updatedAt: new Date().toISOString(),
    };
  }
  safeWrite(DAILY_TASKS_KEY, current);
}

export function upsertStageTracking(candidateId: string, currentStageId: string): void {
  const tracker = safeRead<Record<string, StageTrackEntry>>(STAGE_TRACKER_KEY, {});
  const existing = tracker[candidateId];
  if (!existing || existing.stageId !== currentStageId) {
    tracker[candidateId] = {
      stageId: currentStageId,
      enteredAt: new Date().toISOString(),
    };
    safeWrite(STAGE_TRACKER_KEY, tracker);
  }
}

export function getStageAgeDays(candidateId: string): number {
  const tracker = safeRead<Record<string, StageTrackEntry>>(STAGE_TRACKER_KEY, {});
  const entry = tracker[candidateId];
  if (!entry) return 0;
  const entered = new Date(entry.enteredAt);
  const now = new Date();
  entered.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = now.getTime() - entered.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function loadMentorCatalog(): string[] {
  const custom = safeRead<string[]>(MENTOR_CATALOG_KEY, []);
  const base = [...CANDIDATES, ...loadCustomCandidates()]
    .map((c) => c.mentor)
    .filter((m) => m && m !== "TBD");
  return Array.from(new Set([...base, ...custom])).sort((a, b) => a.localeCompare(b));
}

export function loadCandidateNotes(candidateId: string): string | undefined {
  const all = safeRead<Record<string, string>>(CANDIDATE_NOTES_KEY, {});
  return all[candidateId];
}

export function saveCandidateNotes(candidateId: string, notes: string): void {
  const all = safeRead<Record<string, string>>(CANDIDATE_NOTES_KEY, {});
  if (notes.trim()) {
    all[candidateId] = notes.trim();
  } else {
    delete all[candidateId];
  }
  safeWrite(CANDIDATE_NOTES_KEY, all);
}

const DELETED_CANDIDATES_KEY = "mq-deleted-candidates-v1";
const OPTED_OUT_CANDIDATES_KEY = "mq-opted-out-candidates-v1";

export function loadDeletedCandidates(): string[] {
  return safeRead<string[]>(DELETED_CANDIDATES_KEY, []);
}

export function deleteCandidate(id: string): void {
  const current = safeRead<string[]>(DELETED_CANDIDATES_KEY, []);
  if (!current.includes(id)) {
    current.push(id);
    safeWrite(DELETED_CANDIDATES_KEY, current);
  }
}

export function loadOptedOutCandidates(): string[] {
  return safeRead<string[]>(OPTED_OUT_CANDIDATES_KEY, []);
}

export function optOutCandidate(id: string): void {
  const current = safeRead<string[]>(OPTED_OUT_CANDIDATES_KEY, []);
  if (!current.includes(id)) {
    current.push(id);
    safeWrite(OPTED_OUT_CANDIDATES_KEY, current);
  }
}

export function reinstateCandidate(id: string): void {
  const current = safeRead<string[]>(OPTED_OUT_CANDIDATES_KEY, []);
  safeWrite(OPTED_OUT_CANDIDATES_KEY, current.filter((x) => x !== id));
}

export function addMentorName(name: string): string[] {
  const clean = name.trim();
  if (!clean) return loadMentorCatalog();
  const current = safeRead<string[]>(MENTOR_CATALOG_KEY, []);
  if (!current.includes(clean)) {
    current.push(clean);
    safeWrite(MENTOR_CATALOG_KEY, current);
  }
  return loadMentorCatalog();
}
