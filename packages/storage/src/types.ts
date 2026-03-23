import type { FlexPoolItem, PlanSettings, WeekBlock } from '@nexday/core';

export interface AppState {
  version: 1;
  weekStartMs: number;
  blocks: WeekBlock[];
  flexPool: FlexPoolItem[];
  settings: PlanSettings;
}

export interface Store {
  getState(): Promise<AppState>;
  setState(next: AppState): Promise<void>;
}
