import Papa from 'papaparse';
import type { FlexPoolItem, Priority } from '@nexday/core';

export interface CsvFlexImportOptions {
  defaultCategory?: FlexPoolItem['category'];
  defaultPriority?: Priority;
}

function normalizePriority(raw: unknown, fallback: Priority): Priority {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === 'P0' || v === 'P1' || v === 'P2') return v;
  return fallback;
}

function mkId(title: string, i: number): string {
  const safe = title.trim().slice(0, 24).replace(/\s+/g, '_');
  return `csv:${safe}:${i}`;
}

export function parseCsvToFlexPool(
  csvText: string,
  opts: CsvFlexImportOptions = {},
): { items: FlexPoolItem[]; errors: string[] } {
  const category = opts.defaultCategory ?? 'study';
  const prio = opts.defaultPriority ?? 'P1';

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  if (parsed.errors?.length) {
    for (const e of parsed.errors) errors.push(`${e.row ?? '?'}: ${e.message}`);
  }

  const items: FlexPoolItem[] = [];
  const rows = (parsed.data ?? []) as Record<string, unknown>[];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const title = String(r.title ?? r.Title ?? '').trim();
    if (!title) {
      errors.push(`row ${i + 1}: missing title`);
      continue;
    }

    const durationRaw = r.duration_minutes ?? r.duration ?? r.DurationMinutes;
    const durationMinutes = Number(durationRaw);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      errors.push(`row ${i + 1}: invalid duration_minutes`);
      continue;
    }

    const priority = normalizePriority(r.priority ?? r.Priority, prio);
    const notes = String(r.notes ?? r.Notes ?? '').trim();

    items.push({
      id: mkId(title, i + 1),
      title,
      durationMinutes: Math.round(durationMinutes),
      category,
      priority,
      notes: notes || undefined,
      source: 'import',
    });
  }

  return { items, errors };
}
