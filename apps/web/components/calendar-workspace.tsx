"use client";

import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views, type Event, type SlotInfo } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, format, isSameDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CalendarEvent } from '@/lib/types';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

type Props = {
  events: CalendarEvent[];
  onEventsChange: (nextEvents: CalendarEvent[]) => void;
  statusText: string;
  slotMinutes: 15 | 30;
};

const locales = {
  'en-US': enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay: (date: Date) => date.getDay(),
  locales
});

const DnDCalendar = withDragAndDrop<CalendarEvent, object>(Calendar);

function ensureDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function snapDateToMinutes(date: Date, minutes: number) {
  const ms = date.getTime();
  const slotMs = minutes * 60_000;
  return new Date(Math.round(ms / slotMs) * slotMs);
}

export function CalendarWorkspace({ events, onEventsChange, statusText, slotMinutes }: Props) {
  const [view, setView] = useState<"week" | "day">('week');
  const [activeDate, setActiveDate] = useState(new Date());

  const colorMap = useMemo(
    () => ({
      fixed: '#E7E5E4',
      P0: '#115E59',
      P1: '#0F766E',
      P2: '#5E7A76'
    }),
    []
  );

  const eventStyleGetter = (event: Event) => {
    const typed = event as CalendarEvent;
    const base = typed.kind === 'fixed' ? colorMap.fixed : colorMap[typed.priority];

    return {
      style: {
        backgroundColor: typed.kind === 'fixed' ? '#F5F5F4' : `${base}22`,
        border: `1px solid ${typed.kind === 'fixed' ? '#D6D3D1' : base}`,
        borderLeft: `4px solid ${typed.kind === 'fixed' ? '#A8A29E' : base}`,
        color: '#1F2937',
        borderRadius: '10px',
        boxShadow: 'none',
        paddingInline: '6px'
      }
    };
  };

  const updateEvent = (eventId: string, start: Date, end: Date) => {
    const snappedStart = snapDateToMinutes(start, slotMinutes);
    const snappedEnd = snapDateToMinutes(end, slotMinutes);
    if (snappedEnd <= snappedStart) {
      return;
    }

    onEventsChange(
      events.map((event) => {
        if (event.id !== eventId || event.kind === 'fixed') return event;
        return { ...event, start: snappedStart, end: snappedEnd };
      })
    );
  };

  const handleSelectSlot = (slot: SlotInfo) => {
    const start = snapDateToMinutes(slot.start, slotMinutes);
    const rawEnd = slot.end;
    const end =
      rawEnd.getTime() === slot.start.getTime()
        ? new Date(start.getTime() + slotMinutes * 60_000)
        : snapDateToMinutes(rawEnd, slotMinutes);

    if (end <= start) {
      return;
    }

    const id = `manual-${start.getTime()}`;
    const newEvent: CalendarEvent = {
      id,
      title: 'Manual task',
      start,
      end,
      kind: 'flex',
      priority: 'P1'
    };
    onEventsChange([...events, newEvent]);
  };

  const handleSelectEvent = (event: Event) => {
    const typed = event as CalendarEvent;
    if (typed.kind === 'fixed') {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${typed.title}"?`);
    if (!shouldDelete) return;
    onEventsChange(events.filter((item) => item.id !== typed.id));
  };

  const handleDoubleClickEvent = (event: Event) => {
    const typed = event as CalendarEvent;
    if (typed.kind === 'fixed') return;
    const nextTitle = window.prompt('Rename task', typed.title)?.trim();
    if (!nextTitle) return;
    onEventsChange(events.map((item) => (item.id === typed.id ? { ...item, title: nextTitle } : item)));
  };

  const shiftDate = (dir: -1 | 1) => {
    setActiveDate((prev) => addDays(prev, view === 'week' ? 7 * dir : dir));
  };

  const goToday = () => setActiveDate(new Date());

  const title =
    view === 'week'
      ? `${format(startOfWeek(activeDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(addDays(startOfWeek(activeDate, { weekStartsOn: 1 }), 6), 'MMM d, yyyy')}`
      : format(activeDate, 'EEEE, MMM d, yyyy');

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border/70 pb-4 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-[1.3rem]">Calendar Workspace</CardTitle>
            <p className="text-sm text-muted-foreground">{statusText}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => shiftDate(-1)} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => shiftDate(1)} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-2 flex items-center rounded-full border border-border/80 bg-background p-1">
              <button
                type="button"
                onClick={() => setView('day')}
                className={`rounded-full px-3 py-1 text-xs ${view === 'day' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                Day
              </button>
              <button
                type="button"
                onClick={() => setView('week')}
                className={`rounded-full px-3 py-1 text-xs ${view === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
        <p className="text-sm text-foreground/80">{title}</p>
      </CardHeader>
      <CardContent className="h-[calc(100%-82px)] p-4">
        <div className="h-full overflow-hidden rounded-2xl border border-border/70 bg-background/80 p-2">
          <DnDCalendar
            selectable="ignoreEvents"
            popup
            localizer={localizer}
            events={events}
            date={activeDate}
            onNavigate={(nextDate) => setActiveDate(nextDate)}
            view={view === 'week' ? Views.WEEK : Views.DAY}
            onView={(next) => setView(next === Views.DAY ? 'day' : 'week')}
            views={[Views.DAY, Views.WEEK]}
            step={slotMinutes}
            timeslots={1}
            min={new Date(1970, 1, 1, 6, 0, 0)}
            max={new Date(1970, 1, 1, 23, 30, 0)}
            scrollToTime={new Date(1970, 1, 1, Math.max(new Date().getHours() - 1, 6), 0, 0)}
            dayLayoutAlgorithm="no-overlap"
            onEventDrop={({ event, start, end }) =>
              updateEvent((event as CalendarEvent).id, ensureDate(start), ensureDate(end))
            }
            onEventResize={({ event, start, end }) =>
              updateEvent((event as CalendarEvent).id, ensureDate(start), ensureDate(end))
            }
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onDoubleClickEvent={handleDoubleClickEvent}
            eventPropGetter={eventStyleGetter}
            slotPropGetter={(date) => ({
              className: isSameDay(date, new Date()) ? 'nexday-current-day-slot' : undefined
            })}
            className="nexday-rbc"
          />
        </div>
      </CardContent>
    </Card>
  );
}
