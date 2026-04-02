import type { CalendarEvent, FlexPoolTask, Priority } from '@/lib/types';
import Papa from 'papaparse';

function normalizePriority(raw: string): Priority {
  const v = raw.trim().toUpperCase();
  if (v === 'P0' || v === 'P1' || v === 'P2') return v;
  return 'P1';
}

function safeId(prefix: string, value: string) {
  return `${prefix}:${value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 40)}`;
}

export function parseCsvFlexPool(csvText: string): { items: FlexPoolTask[]; errors: string[] } {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase()
  });

  const idxErrors = (parsed.errors ?? []).map((err) => `row ${err.row ?? '?'}: ${err.message}`);

  const rows = parsed.data ?? [];
  if (rows.length === 0) {
    return { items: [], errors: ['CSV is empty.', ...idxErrors] };
  }

  const items: FlexPoolTask[] = [];
  const errors: string[] = [...idxErrors];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const title = String(row.title ?? '').trim();
    const durationMinutes = Number(row.duration_minutes ?? row.duration ?? '');

    if (!title) {
      errors.push(`row ${i + 2}: missing title`);
      continue;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      errors.push(`row ${i + 2}: invalid duration_minutes`);
      continue;
    }

    const rawCategory = String(row.category ?? '').toLowerCase();
    const category =
      rawCategory === 'study' ||
      rawCategory === 'work' ||
      rawCategory === 'personal' ||
      rawCategory === 'other' ||
      rawCategory === 'class' ||
      rawCategory === 'exercise' ||
      rawCategory === 'sleep'
        ? rawCategory
        : 'study';

    items.push({
      id: safeId('csv', `${title}-${i + 2}-${durationMinutes}`),
      title,
      durationMinutes: Math.round(durationMinutes),
      priority: normalizePriority(String(row.priority ?? 'P1')),
      category,
      notes: row.notes?.trim() || undefined
    });
  }

  return { items, errors };
}

function unfoldIcsLines(icsText: string): string[] {
  const raw = icsText.split(/\r?\n/);
  const lines: string[] = [];

  for (const line of raw) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      const last = lines.length - 1;
      if (last >= 0) lines[last] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseIcsDate(value: string): Date | null {
  const v = value.trim();

  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6)) - 1;
    const d = Number(v.slice(6, 8));
    return new Date(y, m, d, 0, 0, 0, 0);
  }

  const dt = v.replace('Z', '');
  if (!/^\d{8}T\d{6}$/.test(dt)) return null;

  const y = Number(dt.slice(0, 4));
  const m = Number(dt.slice(4, 6)) - 1;
  const d = Number(dt.slice(6, 8));
  const hh = Number(dt.slice(9, 11));
  const mm = Number(dt.slice(11, 13));
  const ss = Number(dt.slice(13, 15));

  if (v.endsWith('Z')) {
    return new Date(Date.UTC(y, m, d, hh, mm, ss));
  }
  return new Date(y, m, d, hh, mm, ss);
}

function extractValue(line: string): string {
  const idx = line.indexOf(':');
  return idx >= 0 ? line.slice(idx + 1) : '';
}

export function parseIcsFixedEvents(icsText: string): { items: CalendarEvent[]; errors: string[] } {
  const lines = unfoldIcsLines(icsText);
  const items: CalendarEvent[] = [];
  const errors: string[] = [];

  let inEvent = false;
  let title = 'Imported Event';
  let uid = '';
  let dtStart: Date | null = null;
  let dtEnd: Date | null = null;

  const flush = () => {
    if (!inEvent) return;
    if (!dtStart || !dtEnd || dtEnd <= dtStart) {
      errors.push(`event ${title}: missing or invalid DTSTART/DTEND`);
    } else {
      items.push({
        id: safeId('ics', `${uid || title}-${dtStart.getTime()}`),
        title,
        start: dtStart,
        end: dtEnd,
        kind: 'fixed',
        priority: 'P2'
      });
    }

    title = 'Imported Event';
    uid = '';
    dtStart = null;
    dtEnd = null;
  };

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      continue;
    }

    if (line === 'END:VEVENT') {
      flush();
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    if (line.startsWith('SUMMARY')) {
      title = extractValue(line) || title;
    } else if (line.startsWith('UID')) {
      uid = extractValue(line);
    } else if (line.startsWith('DTSTART')) {
      dtStart = parseIcsDate(extractValue(line));
    } else if (line.startsWith('DTEND')) {
      dtEnd = parseIcsDate(extractValue(line));
    }
  }

  const uniqueById = new Map<string, CalendarEvent>();
  items.forEach((item) => uniqueById.set(item.id, item));

  return {
    items: [...uniqueById.values()].sort((a, b) => a.start.getTime() - b.start.getTime()),
    errors
  };
}
