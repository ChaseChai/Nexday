import { autoPlanWeek, getLocalMondayStartMs, type FixedEvent, type FlexPoolItem } from '@nexday/core';

import type { CalendarEvent, FlexPoolTask, PlannerPrefs, Priority } from '@/lib/types';

const SLOT_MS = 60_000;

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toPriority(index: number): Priority {
  if (index % 3 === 0) return 'P0';
  if (index % 2 === 0) return 'P1';
  return 'P2';
}

type PlannerInput = {
  importedFixedEvents?: CalendarEvent[];
  importedFlexPool?: FlexPoolTask[];
  agentFlexPool?: FlexPoolTask[];
  useGoalHeuristics?: boolean;
};

type PlannerResult = {
  events: CalendarEvent[];
  unscheduledCount: number;
};

function buildFixedBlocks(weekStartMs: number): FixedEvent[] {
  const daily = [
    { title: 'Sleep', startHour: 23, endHour: 24 },
    { title: 'Sleep', startHour: 0, endHour: 7 },
    { title: 'Morning Reset', startHour: 7, endHour: 8 }
  ];

  const result: FixedEvent[] = [];
  for (let day = 0; day < 7; day += 1) {
    daily.forEach((segment, idx) => {
      const startMs = weekStartMs + day * 24 * 60 * SLOT_MS + segment.startHour * 60 * SLOT_MS;
      let endMs = weekStartMs + day * 24 * 60 * SLOT_MS + segment.endHour * 60 * SLOT_MS;
      if (segment.endHour === 24) {
        endMs = weekStartMs + (day + 1) * 24 * 60 * SLOT_MS;
      }
      result.push({
        id: `fixed-${day}-${idx}-${segment.title}`,
        kind: 'fixed',
        title: segment.title,
        category: segment.title === 'Morning Reset' ? 'personal' : 'sleep',
        locked: true,
        startMs,
        endMs,
        source: 'manual'
      });
    });
  }
  return result;
}

function buildGoalFlexPool(goal: string, prefs: PlannerPrefs, weekStartMs: number): FlexPoolItem[] {
  if (!goal.trim()) {
    return [];
  }

  const seed = hashSeed(goal || 'next-week');

  const keywords =
    goal
      .split(/[,.;\n]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 6) || [];

  return Array.from({ length: Math.max(4, keywords.length || 4) }).map((_, idx) => {
    const text = keywords[idx] || `Deep work block ${idx + 1}`;
    const durationMin = idx % 2 === 0 ? 90 : 60;
    const dayOffset = (seed + idx * 2) % 5;
    const deadlineMs = weekStartMs + (dayOffset + 1) * 24 * 60 * SLOT_MS;

    return {
      id: `flex-${seed}-${idx}`,
      title: text,
      durationMinutes: durationMin,
      category: idx % 2 === 0 ? 'study' : 'work',
      priority: toPriority(idx),
      deadlineMs,
      notes: prefs.includeBreaks ? 'Auto-planned with recovery buffers.' : ''
    };
  });
}

function toFixedEvent(item: CalendarEvent): FixedEvent {
  return {
    id: item.id,
    kind: 'fixed',
    title: item.title,
    startMs: item.start.getTime(),
    endMs: item.end.getTime(),
    category: 'class',
    locked: true,
    source: 'import'
  };
}

function toFlexPoolItem(item: FlexPoolTask): FlexPoolItem {
  return {
    id: item.id,
    title: item.title,
    durationMinutes: item.durationMinutes,
    category: item.category,
    priority: item.priority,
    notes: item.notes,
    deadlineMs: item.deadlineMs,
    source: 'import'
  };
}

export function createPlanFromGoal(goal: string, prefs: PlannerPrefs, input: PlannerInput = {}): PlannerResult {
  const weekStartMs = getLocalMondayStartMs(new Date());
  const importedFixed = (input.importedFixedEvents ?? []).map(toFixedEvent);
  const fixed = [...buildFixedBlocks(weekStartMs), ...importedFixed];

  const generatedFromGoal = input.useGoalHeuristics === false ? [] : buildGoalFlexPool(goal, prefs, weekStartMs);
  const importedPool = (input.importedFlexPool ?? []).map(toFlexPoolItem);
  const agentPool = (input.agentFlexPool ?? []).map(toFlexPoolItem);
  const flexPool: FlexPoolItem[] = [...importedPool, ...agentPool, ...generatedFromGoal];

  const plan = autoPlanWeek({
    weekStartMs,
    fixed,
    flexPool,
    settings: {
      slotMinutes: prefs.slotMinutes,
      weekStartsOn: 'monday',
      moveCascadeLimit: prefs.includeBreaks ? 3 : 1
    }
  });

  const fixedEvents: CalendarEvent[] = fixed.map((item) => ({
    id: item.id,
    title: item.title,
    start: new Date(item.startMs),
    end: new Date(item.endMs),
    kind: 'fixed',
    priority: 'P2'
  }));

  const flexEvents: CalendarEvent[] = plan.blocks
    .filter((item) => item.kind === 'flex')
    .map((item) => ({
    id: item.id,
    title: item.title,
    start: new Date(item.startMs),
    end: new Date(item.endMs),
    kind: 'flex',
    priority: item.priority
    }));

  const events = [...fixedEvents, ...flexEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  return {
    events,
    unscheduledCount: plan.unscheduled.length
  };
}
