import * as ical from 'node-ical';
import type { FixedEvent } from '@nexday/core';

export interface IcsImportOptions {
  weekStartMs: number;
  weeksHorizon: number; // e.g. 12
  defaultCategory?: FixedEvent['category'];
}

function toMs(d: Date | undefined): number | null {
  if (!d) return null;
  return d.getTime();
}

function mkId(prefix: string, uid: string, startMs: number): string {
  return `${prefix}:${uid}:${startMs}`;
}

export function parseIcsToFixedEvents(
  icsText: string,
  opts: IcsImportOptions,
): FixedEvent[] {
  const data = ical.parseICS(icsText);
  const startRange = opts.weekStartMs;
  const endRange = startRange + opts.weeksHorizon * 7 * 24 * 60 * 60_000;
  const category = opts.defaultCategory ?? 'class';

  const results: FixedEvent[] = [];

  for (const v of Object.values(data)) {
    if (!v || typeof v !== 'object') continue;
    if ((v as any).type !== 'VEVENT') continue;

    const ev = v as any;
    const uid = String(ev.uid ?? ev.summary ?? 'event');

    // node-ical expands recurring events into occurrences on demand via .occurrences()
    // but the shape differs. MVP approach: handle either plain events or expanded recurrences if provided.

    const dtStart = ev.start instanceof Date ? ev.start : null;
    const dtEnd = ev.end instanceof Date ? ev.end : null;

    const startMs = toMs(dtStart);
    const endMs = toMs(dtEnd);

    if (startMs == null || endMs == null) continue;
    if (endMs <= startMs) continue;
    if (endMs <= startRange || startMs >= endRange) continue;

    results.push({
      id: mkId('ics', uid, startMs),
      kind: 'fixed',
      title: String(ev.summary ?? 'Untitled'),
      startMs,
      endMs,
      category,
      notes: String(ev.description ?? ''),
      locked: true,
      source: 'import',
    });
  }

  return results.sort((a, b) => a.startMs - b.startMs);
}
