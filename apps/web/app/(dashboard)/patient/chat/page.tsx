'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Brain, Send } from 'lucide-react';
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

  const handleSend = async () => {
    const trimmed = input.trim();
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

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-primary">AI 상담</h1>
          <p className="text-xs text-on-surface-variant">장기요양 제도, 비용, 서비스 안내</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-surface p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={clsx(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {/* AI 아바타 (assistant 메시지만) */}
              {msg.role === 'assistant' && (
                <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 self-end">
                  <Brain className="h-4 w-4 text-secondary" />
                </div>
              )}
              <div
                className={clsx(
                  'max-w-[75%] px-4 py-3',
                  msg.role === 'user'
                    ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-primary to-primary-container text-white'
                    : 'rounded-2xl rounded-bl-md bg-surface-container-lowest text-on-surface shadow-[0_10px_40px_rgba(24,28,30,0.05)]'
                )}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </p>
                <p
                  className={clsx(
                    'mt-1.5 text-[10px]',
                    msg.role === 'user' ? 'text-white/50' : 'text-on-surface-variant/40'
                  )}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 self-end">
                <Brain className="h-4 w-4 text-secondary" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-surface-container-lowest px-4 py-3 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-secondary/40 [animation-delay:0ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-secondary/40 [animation-delay:150ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-secondary/40 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="pt-4">
        <div className="flex items-end gap-2 rounded-2xl bg-surface-container-lowest p-2 shadow-[0_10px_40px_rgba(24,28,30,0.05)]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="궁금한 점을 입력하세요..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-primary placeholder:text-on-surface-variant/40 outline-none"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={clsx(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
              input.trim() && !isLoading
                ? 'bg-gradient-to-br from-primary to-secondary text-white hover:opacity-90'
                : 'bg-primary/5 text-primary/20'
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-on-surface-variant/40">
          AI 응답은 참고용이며, 정확한 정보는 담당 기관에 문의하세요.
        </p>
      </div>
    </div>
  );
}
