'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Brain, Send, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: '안녕하세요! 장기요양, 비용, 제도 등에 대해 궁금한 점을 물어보세요.',
  timestamp: new Date(),
};

const SUGGESTIONS = [
  '장기요양등급 신청 방법',
  '방문간호 비용은 얼마인가요?',
  '본인부담금 감경 기준',
];

export default function PatientChatPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || isLoading || !userId) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('rag-chat', {
        body: { message: trimmed, patientId: userId },
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: error
          ? '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해 주세요.'
          : data?.answer ?? data?.response ?? '응답을 받지 못했습니다.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const showSuggestions = messages.length <= 1 && !isLoading;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-[0_8px_32px_rgba(0,32,69,0.2)]">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary">AI 상담</h1>
          <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant/60">
            장기요양 제도 · 비용 · 서비스 안내
          </p>
        </div>
      </div>

      {/* Chat Area — custom scrollbar */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl bg-surface-container-lowest/50 px-5 py-6 shadow-[0_8px_40px_rgba(0,32,69,0.06)] backdrop-blur-sm [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/10 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        <div className="space-y-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={clsx(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {/* AI Avatar */}
              {msg.role === 'assistant' && (
                <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl bg-secondary/8 shadow-[0_4px_16px_rgba(0,106,99,0.08)]">
                  <Sparkles className="h-4 w-4 text-secondary" />
                </div>
              )}
              <div
                className={clsx(
                  'max-w-[75%] px-5 py-4',
                  msg.role === 'user'
                    ? 'rounded-2xl rounded-br-lg bg-gradient-to-br from-primary to-primary-container text-white shadow-[0_8px_32px_rgba(0,32,69,0.18)]'
                    : 'rounded-2xl rounded-bl-lg bg-surface-container-low text-on-surface shadow-[0_4px_24px_rgba(0,32,69,0.06)]'
                )}
              >
                <p className="whitespace-pre-wrap text-[14.5px] leading-[1.7]">
                  {msg.content}
                </p>
                <p
                  className={clsx(
                    'mt-2 text-[10px] font-medium uppercase tracking-wider',
                    msg.role === 'user' ? 'text-white/40' : 'text-on-surface-variant/35'
                  )}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {/* Suggestion Chips */}
          {showSuggestions && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50">
                추천 질문
              </span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="rounded-xl bg-surface-container-low px-4 py-2.5 text-[13px] font-medium text-on-surface transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary/8 hover:text-secondary hover:shadow-[0_6px_20px_rgba(0,106,99,0.1)]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl bg-secondary/8 shadow-[0_4px_16px_rgba(0,106,99,0.08)]">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
              <div className="rounded-2xl rounded-bl-lg bg-surface-container-low px-5 py-4 shadow-[0_4px_24px_rgba(0,32,69,0.06)]">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-secondary/30 [animation-delay:0ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-secondary/30 [animation-delay:150ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-secondary/30 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area — Glassmorphism */}
      <div>
        <div className="flex items-end gap-3 rounded-2xl bg-white/80 p-3 shadow-[0_8px_40px_rgba(0,32,69,0.08)] backdrop-blur-xl">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="궁금한 점을 입력하세요..."
            rows={1}
            className="flex-1 resize-none rounded-xl bg-surface-container-low/60 px-4 py-3 text-sm leading-relaxed text-primary outline-none transition-colors placeholder:text-on-surface-variant/40 focus:bg-surface-container-low"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
              input.trim() && !isLoading
                ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-[0_6px_24px_rgba(0,32,69,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,32,69,0.3)]'
                : 'bg-primary/5 text-primary/20'
            )}
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-widest text-on-surface-variant/35">
          AI 응답은 참고용이며, 정확한 정보는 담당 기관에 문의하세요.
        </p>
      </div>
    </div>
  );
}
