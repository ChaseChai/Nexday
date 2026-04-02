import type { ChatMessage, FlexPoolTask, Priority } from '@/lib/types';

type LlmPlanInput = {
  goal: string;
  history?: ChatMessage[];
};

type LlmPlanOutput = {
  tasks: FlexPoolTask[];
  model: string;
};

function asPriority(value: unknown): Priority {
  const v = String(value ?? '').trim().toUpperCase();
  if (v === 'P0' || v === 'P1' || v === 'P2') return v;
  return 'P1';
}

function asCategory(value: unknown): FlexPoolTask['category'] {
  const v = String(value ?? '').trim().toLowerCase();
  if (
    v === 'study' ||
    v === 'work' ||
    v === 'personal' ||
    v === 'other' ||
    v === 'class' ||
    v === 'exercise' ||
    v === 'sleep'
  ) {
    return v;
  }
  return 'study';
}

function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

function normalizeTasks(raw: unknown): FlexPoolTask[] {
  const source = Array.isArray(raw) ? raw : [];
  const tasks: FlexPoolTask[] = [];

  for (let i = 0; i < source.length; i += 1) {
    const item = source[i] as Record<string, unknown>;
    const title = String(item.title ?? '').trim();
    const durationMinutes = Number(item.durationMinutes ?? item.duration_minutes ?? 60);

    if (!title || !Number.isFinite(durationMinutes) || durationMinutes <= 0) continue;

    tasks.push({
      id: `llm:${Date.now()}:${i}`,
      title,
      durationMinutes: Math.max(15, Math.round(durationMinutes / 15) * 15),
      priority: asPriority(item.priority),
      category: asCategory(item.category),
      notes: String(item.notes ?? '').trim() || undefined
    });
  }

  return tasks;
}

export async function generateTasksFromLlm(input: LlmPlanInput): Promise<LlmPlanOutput | null> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
  const model = process.env.LLM_MODEL || 'deepseek/deepseek-chat';

  const historySummary = (input.history ?? [])
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  const systemPrompt =
    'You are a planning agent. Output strict JSON with key tasks as an array. Each task has title, durationMinutes, priority (P0/P1/P2), category (study/work/personal/other/class/exercise/sleep), notes(optional). Return only JSON.';

  const userPrompt = `Goal: ${input.goal}\nConversation:\n${historySummary || 'none'}\nGenerate 4-10 tasks.`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content ?? '';
  const jsonText = extractJsonBlock(content);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as { tasks?: unknown };
    const tasks = normalizeTasks(parsed.tasks);
    if (tasks.length === 0) return null;
    return { tasks, model };
  } catch {
    return null;
  }
}
