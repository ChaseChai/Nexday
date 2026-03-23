import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getLocalMondayStartMs } from '@nexday/core';
import type { AppState, Store } from './types.js';

const DEFAULT_SETTINGS = {
  slotMinutes: 15,
  weekStartsOn: 'monday' as const,
  moveCascadeLimit: 12,
};

function defaultState(): AppState {
  return {
    version: 1,
    weekStartMs: getLocalMondayStartMs(new Date()),
    blocks: [],
    flexPool: [],
    settings: DEFAULT_SETTINGS,
  };
}

async function safeReadJson(filePath: string): Promise<AppState> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || parsed.version !== 1) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = filePath + '.tmp';
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}

export class JsonFileStore implements Store {
  constructor(private readonly filePath: string) {}

  async getState(): Promise<AppState> {
    return safeReadJson(this.filePath);
  }

  async setState(next: AppState): Promise<void> {
    await atomicWrite(this.filePath, JSON.stringify(next, null, 2));
  }
}
