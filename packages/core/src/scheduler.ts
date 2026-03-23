import type {
  AutoPlanWeekRequest,
  FlexPoolItem,
  FixedEvent,
  PlanSettings,
  Priority,
  WeekPlan,
  WeekBlock,
} from './types.js';

interface Interval {
  startMs: number;
  endMs: number;
}

function sortByPriority(p: Priority): number {
  return p === 'P0' ? 0 : p === 'P1' ? 1 : 2;
}

function normalizeFixed(fixed: FixedEvent[]): FixedEvent[] {
  return [...fixed].sort((a, b) => a.startMs - b.startMs);
}

function subtractBusyIntervals(
  weekStartMs: number,
  settings: PlanSettings,
  busy: Interval[],
): Interval[] {
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60_000;
  const slotMs = settings.slotMinutes * 60_000;

  const sorted = [...busy]
    .filter((i) => i.endMs > i.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (!last || interval.startMs > last.endMs) merged.push({ ...interval });
    else last.endMs = Math.max(last.endMs, interval.endMs);
  }

  const free: Interval[] = [];
  let cursor = weekStartMs;
  for (const b of merged) {
    const s = Math.max(weekStartMs, b.startMs);
    const e = Math.min(weekEndMs, b.endMs);
    if (s > cursor) free.push({ startMs: cursor, endMs: s });
    cursor = Math.max(cursor, e);
  }
  if (cursor < weekEndMs) free.push({ startMs: cursor, endMs: weekEndMs });

  // Snap free intervals to slot grid to keep deterministic.
  const snapped: Interval[] = [];
  for (const f of free) {
    const start = Math.ceil((f.startMs - weekStartMs) / slotMs) * slotMs + weekStartMs;
    const end = Math.floor((f.endMs - weekStartMs) / slotMs) * slotMs + weekStartMs;
    if (end > start) snapped.push({ startMs: start, endMs: end });
  }
  return snapped;
}

function placeBlock(
  free: Interval[],
  durationMinutes: number,
): { startMs: number; endMs: number; free: Interval[] } | null {
  const durationMs = durationMinutes * 60_000;
  for (let i = 0; i < free.length; i++) {
    const interval = free[i];
    if (interval.endMs - interval.startMs < durationMs) continue;

    const startMs = interval.startMs;
    const endMs = startMs + durationMs;

    const nextFree: Interval[] = [];
    nextFree.push(...free.slice(0, i));
    if (interval.endMs > endMs) nextFree.push({ startMs: endMs, endMs: interval.endMs });
    nextFree.push(...free.slice(i + 1));

    return { startMs, endMs, free: nextFree };
  }
  return null;
}

export function autoPlanWeek(input: AutoPlanWeekRequest): WeekPlan {
  const fixed = normalizeFixed(input.fixed);
  const busy: Interval[] = fixed.map((b) => ({ startMs: b.startMs, endMs: b.endMs }));

  let freeIntervals = subtractBusyIntervals(input.weekStartMs, input.settings, busy);

  const flexSorted = [...input.flexPool].sort((a, b) => {
    const pa = sortByPriority(a.priority);
    const pb = sortByPriority(b.priority);
    if (pa !== pb) return pa - pb;

    const da = a.deadlineMs ?? Number.POSITIVE_INFINITY;
    const db = b.deadlineMs ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;

    return b.durationMinutes - a.durationMinutes;
  });

  const scheduled: WeekBlock[] = [...fixed];
  const unscheduled: WeekPlan['unscheduled'] = [];

  for (const item of flexSorted) {
    const placed = placeBlock(freeIntervals, item.durationMinutes);
    if (!placed) {
      unscheduled.push(item);
      continue;
    }

    freeIntervals = placed.free;
    scheduled.push({
      id: item.id,
      kind: 'flex',
      title: item.title,
      category: item.category,
      priority: item.priority,
      protected: item.protected,
      deadlineMs: item.deadlineMs,
      notes: item.notes,
      locked: false,
      source: item.source,
      startMs: placed.startMs,
      endMs: placed.endMs,
    });
  }

  return {
    weekStartMs: input.weekStartMs,
    blocks: scheduled.sort((a, b) => a.startMs - b.startMs),
    unscheduled,
  };
}
