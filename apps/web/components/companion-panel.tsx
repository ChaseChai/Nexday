"use client";

import { motion } from 'framer-motion';
import { Bot, SendHorizonal, UserCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { ChatMessage } from '@/lib/types';

type Props = {
  messages: ChatMessage[];
  draft: string;
  loading: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
};

export function CompanionPanel({ messages, draft, loading, onDraftChange, onSend }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border/70 pb-4 pt-5">
        <CardTitle className="text-[1.3rem]">AI Companion</CardTitle>
        <p className="text-sm text-muted-foreground">Tell Moltbot what your week should become.</p>
      </CardHeader>

      <CardContent className="flex h-[calc(100%-82px)] flex-col gap-4 p-4">
        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border/70 bg-background/80 p-3">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && <Bot className="mt-1 h-4 w-4 text-primary" />}
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === 'assistant'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-primary/15 text-foreground'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'user' && <UserCircle2 className="mt-1 h-4 w-4 text-primary" />}
            </motion.div>
          ))}

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Bot className="h-4 w-4 text-primary" />
              Shaping your week...
            </motion.div>
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder="Example: Help me arrange calculus revision and gym sessions for next week."
            className="min-h-[110px]"
          />
          <Button onClick={onSend} disabled={loading || !draft.trim()} className="w-full gap-2">
            <SendHorizonal className="h-4 w-4" />
            {loading ? 'Generating Plan...' : 'Send Goal'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
