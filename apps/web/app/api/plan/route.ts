import { NextResponse } from 'next/server';

import { buildAgentPlanningPrompt, buildHeuristicAgentTasks } from '@/lib/agent-planner';
import { generateTasksFromLlm } from '@/lib/llm-provider';
import { createPlanFromGoal } from '@/lib/planner';
import type { CalendarEvent, ChatMessage, FlexPoolTask, PlannerPrefs } from '@/lib/types';

type PlanRequest = {
  goal: string;
  prefs: PlannerPrefs;
  importedFixedEvents?: Array<Omit<CalendarEvent, 'start' | 'end'> & { start: string; end: string }>;
  importedFlexPool?: FlexPoolTask[];
  history?: ChatMessage[];
};

function toDateEvents(
  input: Array<Omit<CalendarEvent, 'start' | 'end'> & { start: string; end: string }> = []
): CalendarEvent[] {
  return input
    .map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end)
    }))
    .filter((event) => Number.isFinite(event.start.getTime()) && Number.isFinite(event.end.getTime()));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PlanRequest;

    const goal = String(body.goal ?? '').trim();
    if (!goal) {
      return NextResponse.json({ error: 'Goal is required.' }, { status: 400 });
    }

    const prefs = body.prefs ?? { slotMinutes: 30, includeBreaks: true };
    const importedFixedEvents = toDateEvents(body.importedFixedEvents);
    const importedFlexPool = Array.isArray(body.importedFlexPool) ? body.importedFlexPool : [];

    const llmResult = await generateTasksFromLlm({
      goal,
      history: body.history ?? []
    });

    const fallbackPrompt = buildAgentPlanningPrompt(goal, body.history ?? []);
    const agentTasks = llmResult?.tasks ?? buildHeuristicAgentTasks(goal, body.history ?? []);

    const result = createPlanFromGoal(fallbackPrompt, prefs, {
      importedFixedEvents,
      importedFlexPool,
      agentFlexPool: agentTasks,
      useGoalHeuristics: false
    });

    return NextResponse.json({
      events: result.events,
      unscheduledCount: result.unscheduledCount,
      agentPrompt: fallbackPrompt,
      plannerSource: llmResult ? 'llm' : 'heuristic',
      model: llmResult?.model ?? null,
      agentTaskCount: agentTasks.length
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate plan.' }, { status: 500 });
  }
}
