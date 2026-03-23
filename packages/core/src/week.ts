export function getLocalMondayStartMs(date: Date): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = local.getDay();
  const diffToMonday = (day + 6) % 7;
  local.setDate(local.getDate() - diffToMonday);
  local.setHours(0, 0, 0, 0);
  return local.getTime();
}

export function addMinutesMs(ms: number, minutes: number): number {
  return ms + minutes * 60_000;
}

export function clampToWeek(weekStartMs: number, ms: number): number {
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60_000;
  return Math.min(Math.max(ms, weekStartMs), weekEndMs);
}
