'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Stethoscope, Sparkles, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { ChatBubble, type ChatMessage } from '@/components/agent/ChatBubble';
import { STTButton } from '@/components/agent/STTButton';
import { FunctionCallIndicator } from '@/components/agent/FunctionCallIndicator';
import { QuickActions } from '@/components/agent/QuickActions';

export default function NurseAgentPage() {
  const { profile, staffInfo } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFunction, setCurrentFunction] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const nurseName = profile?.full_name ?? '간호사';
  const nurseId = staffInfo?.id;

  // 초기 인사
  useEffect(() => {
    if (nurseId && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `${nurseName}님, 안녕하세요. 홈케어 어시스턴트입니다.\n오늘 브리핑이 필요하시면 말씀해주세요.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [nurseId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (text?: string, method: 'text' | 'stt' | 'button' = 'text') => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || isLoading || !nurseId) return;

      const userMessage: ChatMessage = {
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        inputMethod: method,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      setCurrentFunction(null);

      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase.functions.invoke('agent-nurse-chat', {
          body: {
            nurse_id: nurseId,
            message: trimmed,
            input_method: method,
          },
        });

        if (error) throw error;

        if (data?.function_calls?.length > 0) {
          setCurrentFunction(data.function_calls[data.function_calls.length - 1].name);
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data?.response ?? '일시적 오류가 발생했습니다.',
            timestamp: new Date(),
            functionCalls: data?.function_calls,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setCurrentFunction(null);
      }
    },
    [input, isLoading, nurseId],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showQuickActions = messages.length <= 1 && !isLoading;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-container shadow-[0_8px_32px_rgba(0,32,69,0.25)]">
          <Stethoscope className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary">AI 어시스턴트</h1>
          <p className="text-xs font-medium text-on-surface-variant/60">
            {nurseName}님의 업무 브리핑 비서
          </p>
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-surface-container-lowest/50 px-5 py-6 shadow-[0_8px_40px_rgba(0,32,69,0.06)] backdrop-blur-sm [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/10 [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="space-y-6">
          {messages.map((msg, idx) => (
            <ChatBubble
              key={idx}
              message={msg}
              agentIcon={<Stethoscope className="h-4 w-4 text-primary" />}
              showTTS
              ttsSpeed={1.0}
            />
          ))}

          {showQuickActions && (
            <div className="pt-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50">
                빠른 명령
              </p>
              <QuickActions
                agentType="nurse"
                onAction={(msg) => handleSend(msg, 'button')}
              />
            </div>
          )}

          {isLoading && currentFunction && (
            <FunctionCallIndicator functionName={currentFunction} />
          )}

          {isLoading && !currentFunction && (
            <div className="flex justify-start">
              <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl bg-primary/8">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-lg bg-surface-container-low px-5 py-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/30 [animation-delay:0ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/30 [animation-delay:150ms]" />
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary/30 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* 입력 영역 */}
      <div>
        <div className="flex items-end gap-3 rounded-2xl bg-white/80 p-3 shadow-[0_8px_40px_rgba(0,32,69,0.08)] backdrop-blur-xl">
          <STTButton
            onResult={(t) => handleSend(t, 'stt')}
            disabled={isLoading}
            size="md"
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="명령을 입력하세요..."
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
                ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-[0_6px_24px_rgba(0,32,69,0.25)] hover:-translate-y-0.5'
                : 'bg-primary/5 text-primary/20',
            )}
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
