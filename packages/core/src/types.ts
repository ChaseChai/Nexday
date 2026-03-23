export type Priority = 'P0' | 'P1' | 'P2';

export type BlockKind = 'fixed' | 'flex';

export type BlockCategory =
  | 'sleep'
  | 'exercise'
  | 'class'
  | 'work'
  | 'study'
  | 'personal'
  | 'other';

export interface BaseBlock {
  id: string;
  kind: BlockKind;
  title: string;
  startMs: number;
  endMs: number;
  category: BlockCategory;
  notes?: string;
  locked?: boolean;
  source?: 'manual' | 'import';
}

export interface FixedEvent extends BaseBlock {
  kind: 'fixed';
  locked: true;
}

export interface FlexibleBlock extends BaseBlock {
  kind: 'flex';
  priority: Priority;
  protected?: boolean;
  deadlineMs?: number;
}

export type WeekBlock = FixedEvent | FlexibleBlock;

export interface WeekPlan {
  weekStartMs: number;
  blocks: WeekBlock[];
  unscheduled: FlexPoolItem[];
}

export interface PlanSettings {
  slotMinutes: number;
  weekStartsOn: 'monday';
  moveCascadeLimit: number;
}

export interface FlexPoolItem {
  id: string;
  title: string;
  durationMinutes: number;
  category: FlexibleBlock['category'];
  priority: Priority;
  notes?: string;
  protected?: boolean;
  deadlineMs?: number;
  source?: 'manual' | 'import';
}

export interface AutoPlanWeekRequest {
  weekStartMs: number;
  fixed: FixedEvent[];
  flexPool: FlexPoolItem[];
  settings: PlanSettings;
}
