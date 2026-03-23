import type { FixedEvent, FlexPoolItem, PlanSettings, Priority, WeekBlock, WeekPlan } from './types.js';
import { autoPlanWeek } from './scheduler.js';

function prioRank(p: Priority): number {
  return p === 'P0' ? 0 : p === 'P1' ? 1 : 2;
}

export interface InsertInterruptionInput {
  weekStartMs: number;
  interruption: FixedEvent;
  existing: WeekBlock[];
  settings: PlanSettings;
}

export function insertInterruptionAndReschedule(input: InsertInterruptionInput): WeekPlan {
  const fixed: FixedEvent[] = [input.interruption];
  const remainingFixed: FixedEvent[] = [];
  const flexPool: FlexPoolItem[] = [];

  for (const block of input.existing) {
    if (block.kind === 'fixed') {
      remainingFixed.push(block);
      continue;
    }

    const overlaps = !(block.endMs <= input.interruption.startMs || block.startMs >= input.interruption.endMs);
    if (overlaps) {
      flexPool.push({
        id: block.id,
        title: block.title,
        durationMinutes: Math.max(15, Math.round((block.endMs - block.startMs) / 60_000)),
        category: block.category,
        priority: block.priority,
        protected: block.protected,
        deadlineMs: block.deadlineMs,
        notes: block.notes,
        source: block.source,
      });
    } else {
      flexPool.push({
        id: block.id,
        title: block.title,
        durationMinutes: Math.max(15, Math.round((block.endMs - block.startMs) / 60_000)),
        category: block.category,
        priority: block.priority,
        protected: block.protected,
        deadlineMs: block.deadlineMs,
        notes: block.notes,
        source: block.source,
      });
      // Keep as pool; scheduler will try to place. MVP keeps it simple.
    }
  }

  const allFixed = [...remainingFixed, ...fixed].sort((a, b) => a.startMs - b.startMs);

  // Priority protection is handled by ordering (P0 first). Lower priority won't displace higher priority
  // because we only schedule from an empty free-interval set after freezing fixed events.
  const plan = autoPlanWeek({
    weekStartMs: input.weekStartMs,
    fixed: allFixed,
    flexPool: flexPool.sort((a, b) => prioRank(a.priority) - prioRank(b.priority)),
    settings: input.settings,
  });

  // Cap cascade: if too many flexible blocks moved, return a conservative plan (MVP: just return plan).
  // A future iteration can compute movedCount and, if > limit, surface suggestions instead of auto-apply.
  void input.settings.moveCascadeLimit;

  return plan;
}
