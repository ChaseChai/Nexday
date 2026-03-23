"use client";

import { useRef } from 'react';
import { Upload, WandSparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';

type Props = {
  slotMinutes: 15 | 30;
  includeBreaks: boolean;
  isPlanning: boolean;
  importStatus: string;
  onPlan: () => void;
  onSlotMinutesChange: (value: 15 | 30) => void;
  onIncludeBreaksChange: (value: boolean) => void;
  onMockImport: (fileName: string) => void;
};

export function ActionPanel({
  slotMinutes,
  includeBreaks,
  isPlanning,
  importStatus,
  onPlan,
  onSlotMinutesChange,
  onIncludeBreaksChange,
  onMockImport
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <p className="font-serif text-2xl text-primary">NexDay</p>
        <p className="text-sm text-muted-foreground">Shape your next week with calm precision.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={onPlan} className="w-full justify-center gap-2" size="lg" disabled={isPlanning}>
          <WandSparkles className="h-4 w-4" />
          {isPlanning ? 'Planning...' : 'Liquid Plan'}
        </Button>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Time Precision</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={slotMinutes === 15 ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSlotMinutesChange(15)}
            >
              15 min
            </Button>
            <Button
              type="button"
              variant={slotMinutes === 30 ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSlotMinutesChange(30)}
            >
              30 min
            </Button>
          </div>
          <Slider
            value={[slotMinutes]}
            min={15}
            max={30}
            step={15}
            onValueCommit={(value) => onSlotMinutesChange(value[0] <= 15 ? 15 : 30)}
          />
          <p className="text-sm text-foreground">{slotMinutes} minutes per block</p>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border/80 bg-background/70 px-4 py-3 text-sm text-foreground transition-colors hover:border-primary/35">
          Include recovery breaks
          <input
            type="checkbox"
            checked={includeBreaks}
            onChange={(event) => onIncludeBreaksChange(event.target.checked)}
            className="h-4 w-4 accent-[#0F766E]"
          />
        </label>

        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,.csv"
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) onMockImport(selected.name);
              event.target.value = '';
            }}
          />
          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import Schedule File
          </Button>
          <p className="min-h-5 text-xs text-muted-foreground">{importStatus}</p>
        </div>
      </CardContent>
    </Card>
  );
}
