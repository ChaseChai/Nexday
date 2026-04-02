import type { CalendarEvent, ChatMessage, FlexPoolTask, PlannerPrefs } from '@/lib/types';

const STORAGE_KEY = 'nexday.web.state.v1';

export type SavedState = {
  events: CalendarEvent[];
  messages: ChatMessage[];
  prefs: PlannerPrefs;
  importedFixedEvents: CalendarEvent[];
  importedFlexPool: FlexPoolTask[];
};

export const defaultPrefs: PlannerPrefs = {
  slotMinutes: 30,
  includeBreaks: true
};

export const defaultMessages: ChatMessage[] = [
  {
    id: 'intro-assistant',
    role: 'assistant',
    content: 'Tell me your weekly goal and I will shape it into focused task blocks.',
    createdAt: Date.now()
  }
];

export function loadState(): SavedState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SavedState;
    return {
      ...parsed,
      events: parsed.events.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      })),
      importedFixedEvents: (parsed.importedFixedEvents ?? []).map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      })),
      importedFlexPool: parsed.importedFlexPool ?? []
    };
  } catch {
    return null;
  }
}

export function saveState(state: SavedState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
