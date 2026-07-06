'use client';

import { useState, useRef, useEffect } from 'react';
import { useRagChat } from '../../../hooks/useAI';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn, formatRelativeTime, formatDate } from '../../../lib/utils';
import { Bot, User, Send, Sparkles, ExternalLink, CheckCircle2 } from 'lucide-react';
import type { RagChatMessage, RagChatResponse } from '../../../types/api';
import Link from 'next/link';

interface ChatEntry {
  role: 'user' | 'assistant';
  content: string;
  sources?: RagChatResponse['sources'];
  taskCreated?: RagChatResponse['taskCreated'];
  timestamp: Date;
}

const STARTER_PROMPTS = [
  'Which customers are due for a product refill soon?',
  'Summarize my top 5 opportunities by value',
  'Which leads are most likely to repurchase?',
  'Create a follow-up call task for Maria Gonzalez tomorrow',
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const ragChat = useRagChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || ragChat.isPending) return;

    const userEntry: ChatEntry = { role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userEntry]);
    setInput('');

    const history: RagChatMessage[] = [...messages, userEntry].map(({ role, content }) => ({ role, content }));

    try {
      const result = await ragChat.mutateAsync(history);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.answer, sources: result.sources, taskCreated: result.taskCreated, timestamp: new Date() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I encountered an error. Please try again.', timestamp: new Date() },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bot className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text">CRM Copilot</h1>
          <p className="text-xs text-muted">AI assistant powered by your customers&apos; purchase history</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted">Connected to your CRM</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 animate-pulse">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text">How can I help?</h2>
              <p className="text-sm text-muted mt-1 max-w-sm">
                Ask me about leads, purchase history, or replenishment cycles, or ask me to create
                and assign a follow-up task — I search across all your CRM data to find answers.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {STARTER_PROMPTS.map((p, i) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left px-4 py-3 rounded-lg border border-border hover:border-primary/40 bg-card hover:bg-card/80 text-sm text-muted hover:text-text hover:-translate-y-0.5 hover:shadow-sm transition-all animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex gap-3 animate-fade-in',
              msg.role === 'user' && 'flex-row-reverse',
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                msg.role === 'user' ? 'bg-primary/20 border border-primary/30' : 'bg-card border border-border',
              )}
            >
              {msg.role === 'user' ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted" />}
            </div>

            <div className={cn('max-w-[75%] space-y-2', msg.role === 'user' && 'items-end')}>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-sm'
                    : 'bg-card border border-border text-text rounded-tl-sm',
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>

              {msg.taskCreated && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/30 text-xs text-text">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                  <span>
                    Task <span className="font-medium">&ldquo;{msg.taskCreated.title}&rdquo;</span> assigned to{' '}
                    <span className="font-medium">{msg.taskCreated.assignedTo.firstName} {msg.taskCreated.assignedTo.lastName}</span>
                    {msg.taskCreated.scheduledAt && ` · due ${formatDate(msg.taskCreated.scheduledAt)}`}
                  </span>
                </div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted px-1">Sources:</p>
                  {msg.sources.map((s) => (
                    <Link
                      key={s.leadId}
                      href={`/leads/detail?id=${s.leadId}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card/50 border border-border hover:border-primary/30 text-xs text-muted hover:text-text transition-all"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="font-medium text-text">{s.leadName}</span>
                      <span className="truncate">{s.snippet}</span>
                    </Link>
                  ))}
                </div>
              )}

              <p className={cn('text-xs text-muted px-1', msg.role === 'user' && 'text-right')}>
                {formatRelativeTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {ragChat.isPending && (
          <div className="flex gap-3 animate-fade-in">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center">
              <Bot className="w-4 h-4 text-muted" />
            </div>
            <div className="px-4 py-3 bg-card border border-border rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your leads…"
            className="flex-1"
            disabled={ragChat.isPending}
          />
          <Button type="submit" disabled={!input.trim() || ragChat.isPending}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
