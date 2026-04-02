"use client";

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { ActionPanel } from '@/components/action-panel';
import { CalendarWorkspace } from '@/components/calendar-workspace';
import { CompanionPanel } from '@/components/companion-panel';
import { parseCsvFlexPool, parseIcsFixedEvents } from '@/lib/importers';
import { createPlanFromGoal } from '@/lib/planner';
import { defaultMessages, defaultPrefs, loadState, saveState } from '@/lib/storage';
import type { CalendarEvent, ChatMessage, FlexPoolTask, PlannerPrefs } from '@/lib/types';

const initialGoal = 'Help me schedule calculus revision, gym sessions, and a deep reading block.';

export default function HomePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [prefs, setPrefs] = useState<PlannerPrefs>(defaultPrefs);
  const [importedFixedEvents, setImportedFixedEvents] = useState<CalendarEvent[]>([]);
  const [importedFlexPool, setImportedFlexPool] = useState<FlexPoolTask[]>([]);
  const [draft, setDraft] = useState(initialGoal);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('No file imported yet.');

  useEffect(() => {
    const stored = loadState();
    if (!stored) {
      const initial = createPlanFromGoal(initialGoal, defaultPrefs);
      setEvents(initial.events);
      return;
    }
    setEvents(stored.events);
    setMessages(stored.messages.length > 0 ? stored.messages : defaultMessages);
    setPrefs(stored.prefs ?? defaultPrefs);
    setImportedFixedEvents(stored.importedFixedEvents ?? []);
    setImportedFlexPool(stored.importedFlexPool ?? []);
  }, []);

  useEffect(() => {
    saveState({ events, messages, prefs, importedFixedEvents, importedFlexPool });
  }, [events, messages, prefs, importedFixedEvents, importedFlexPool]);

  const statusText = useMemo(() => {
    if (loading) return 'Moltbot is weaving a new weekly structure...';
    const flexCount = events.filter((item) => item.kind === 'flex').length;
    return `${flexCount} flexible blocks scheduled. Imported fixed: ${importedFixedEvents.length}, imported tasks: ${importedFlexPool.length}.`;
  }, [events, importedFixedEvents.length, importedFlexPool.length, loading]);

  const appendUniqueById = <T extends { id: string }>(prev: T[], incoming: T[]) => {
    const map = new Map<string, T>();
    prev.forEach((item) => map.set(item.id, item));
    incoming.forEach((item) => map.set(item.id, item));
    return [...map.values()];
  };

  const replan = (goalText: string, fixedSource = importedFixedEvents, flexSource = importedFlexPool) => {
    const result = createPlanFromGoal(goalText, prefs, {
      importedFixedEvents: fixedSource,
      importedFlexPool: flexSource
    });
    setEvents(result.events);
    return result;
  };

  const runPlanner = async (goalText: string) => {
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

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          goal: content,
          prefs,
          importedFixedEvents,
          importedFlexPool,
          history: messages
        })
      });

      if (!response.ok) {
        throw new Error('Planner API failed');
      }

      const data = (await response.json()) as {
        events: CalendarEvent[];
        unscheduledCount: number;
        agentPrompt: string;
        plannerSource: 'llm' | 'heuristic';
        model: string | null;
        agentTaskCount: number;
      };

      const normalizedEvents = (data.events ?? []).map((item) => ({
        ...item,
        start: new Date(item.start),
        end: new Date(item.end)
      }));

      setEvents(normalizedEvents);

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `Done. I mapped your goal into ${normalizedEvents.filter((item) => item.kind === 'flex').length} flexible blocks for this week.${data.unscheduledCount > 0 ? ` ${data.unscheduledCount} tasks are still unscheduled.` : ''} Planner: ${data.plannerSource}${data.model ? ` (${data.model})` : ''}. Agent tasks: ${data.agentTaskCount}. Planning prompt: ${data.agentPrompt}`,
        createdAt: Date.now()
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setImportStatus('Plan refreshed from API planner.');
    } catch {
      const result = replan(content);
      const assistantMessage: ChatMessage = {
        id: `assistant-fallback-${Date.now()}`,
        role: 'assistant',
        content: `API temporarily unavailable. Fallback planner generated ${result.events.filter((item) => item.kind === 'flex').length} flexible blocks.${result.unscheduledCount > 0 ? ` ${result.unscheduledCount} tasks are still unscheduled.` : ''}`,
        createdAt: Date.now()
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setImportStatus('Fallback planner executed locally.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (file: File) => {
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();

    if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.ics')) {
      setImportStatus('Only .csv and .ics files are supported.');
      return;
    }

    setImporting(true);
    setImportStatus(`Importing ${fileName}...`);

    try {
      const text = await file.text();

      if (lowerName.endsWith('.csv')) {
        const parsed = parseCsvFlexPool(text);
        const nextFlexPool = appendUniqueById(importedFlexPool, parsed.items);
        setImportedFlexPool(nextFlexPool);

        const result = replan(draft, importedFixedEvents, nextFlexPool);
        setImportStatus(
          `CSV imported: ${parsed.items.length} tasks, errors: ${parsed.errors.length}. Scheduled flex blocks: ${result.events.filter((item) => item.kind === 'flex').length}.`
        );
        return;
      }

      const parsed = parseIcsFixedEvents(text);
      const nextFixedEvents = appendUniqueById(importedFixedEvents, parsed.items);
      setImportedFixedEvents(nextFixedEvents);

      const result = replan(draft, nextFixedEvents, importedFlexPool);
      setImportStatus(
        `ICS imported: ${parsed.items.length} fixed events, errors: ${parsed.errors.length}. Scheduled flex blocks: ${result.events.filter((item) => item.kind === 'flex').length}.`
      );
    } catch {
      setImportStatus(`Failed to import ${fileName}. Please verify file content.`);
    } finally {
      setImporting(false);
    }
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
          isImporting={importing}
          importStatus={importStatus}
          onPlan={() => void runPlanner(draft)}
          onSlotMinutesChange={(value) => setPrefs((prev) => ({ ...prev, slotMinutes: value }))}
          onIncludeBreaksChange={(value) => setPrefs((prev) => ({ ...prev, includeBreaks: value }))}
          onImportFile={handleImportFile}
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
          onSend={() => void runPlanner(draft)}
        />
      </motion.div>
    </main>
  );
}
