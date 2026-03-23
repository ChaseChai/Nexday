export type Priority = 'P0' | 'P1' | 'P2';

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind: 'fixed' | 'flex';
  priority: Priority;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

export type PlannerPrefs = {
  slotMinutes: 15 | 30;
  includeBreaks: boolean;
};
