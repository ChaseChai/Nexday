"use client";

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { ActionPanel } from '@/components/action-panel';
import { CalendarWorkspace } from '@/components/calendar-workspace';
import { CompanionPanel } from '@/components/companion-panel';
import { createPlanFromGoal } from '@/lib/planner';
import { defaultMessages, defaultPrefs, loadState, saveState } from '@/lib/storage';
import type { CalendarEvent, ChatMessage, PlannerPrefs } from '@/lib/types';

const initialGoal = 'Help me schedule calculus revision, gym sessions, and a deep reading block.';

export default function HomePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [prefs, setPrefs] = useState<PlannerPrefs>(defaultPrefs);
  const [draft, setDraft] = useState(initialGoal);
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('No file imported yet.');

  useEffect(() => {
    const stored = loadState();
    if (!stored) {
      setEvents(createPlanFromGoal(initialGoal, defaultPrefs));
      return;
    }
    setEvents(stored.events);
    setMessages(stored.messages.length > 0 ? stored.messages : defaultMessages);
    setPrefs(stored.prefs ?? defaultPrefs);
  }, []);

  useEffect(() => {
    saveState({ events, messages, prefs });
  }, [events, messages, prefs]);

  const statusText = useMemo(() => {
    if (loading) return 'Moltbot is weaving a new weekly structure...';
    const flexCount = events.filter((item) => item.kind === 'flex').length;
    return `${flexCount} flexible blocks currently scheduled.`;
  }, [events, loading]);

  const runPlanner = (goalText: string) => {
    const content = goalText.trim();
    if (!content || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    window.setTimeout(() => {
      const nextEvents = createPlanFromGoal(content, prefs);
      setEvents(nextEvents);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Done. I mapped your goal into ${nextEvents.filter((item) => item.kind === 'flex').length} flexible blocks for this week.`,
        createdAt: Date.now()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
      setImportStatus('Plan refreshed from your latest goal.');
    }, 950);
  };

  const handleMockImport = (fileName: string) => {
    setImportStatus(`Importing ${fileName}...`);
    window.setTimeout(() => {
      setImportStatus(`Imported ${fileName}. Click Liquid Plan to rebalance tasks.`);
    }, 600);
  };

  return (
    <main className="min-h-screen px-4 py-5 md:px-6 md:py-6 xl:px-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto grid max-w-[1700px] grid-cols-1 gap-4 lg:h-[calc(100vh-3rem)] lg:grid-cols-[1.15fr_3.1fr_1.45fr]"
      >
        <ActionPanel
          slotMinutes={prefs.slotMinutes}
          includeBreaks={prefs.includeBreaks}
          isPlanning={loading}
          importStatus={importStatus}
          onPlan={() => runPlanner(draft)}
          onSlotMinutesChange={(value) => setPrefs((prev) => ({ ...prev, slotMinutes: value }))}
          onIncludeBreaksChange={(value) => setPrefs((prev) => ({ ...prev, includeBreaks: value }))}
          onMockImport={handleMockImport}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={events.length}
            initial={{ opacity: 0.75, scale: 0.995 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="h-[72vh] lg:h-full"
          >
            <CalendarWorkspace
              events={events}
              onEventsChange={setEvents}
              statusText={statusText}
              slotMinutes={prefs.slotMinutes}
            />
          </motion.div>
        </AnimatePresence>

        <CompanionPanel
          messages={messages}
          draft={draft}
          loading={loading}
          onDraftChange={setDraft}
          onSend={() => runPlanner(draft)}
        />
      </motion.div>
    </main>
  );
}
