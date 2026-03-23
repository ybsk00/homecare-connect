'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getPatientsByGuardian } from '@homecare/supabase-client';
import { Heart, Sparkles, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { ChatBubble, type ChatMessage } from '@/components/agent/ChatBubble';
import { STTButton } from '@/components/agent/STTButton';
import { FunctionCallIndicator } from '@/components/agent/FunctionCallIndicator';
import { QuickActions } from '@/components/agent/QuickActions';

export default function PatientAgentPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFunction, setCurrentFunction] = useState<string | null>(null);
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

  const { data: patientLinks } = useQuery({
    queryKey: ['patients', userId],
    queryFn: () => getPatientsByGuardian(supabase, userId!),
    enabled: !!userId,
  });

  const primaryPatient = patientLinks?.[0]?.patient;
  const patientName = primaryPatient?.full_name ?? '어르신';
  const gender = (primaryPatient as any)?.gender ?? 'female';
  const honorific = gender === 'male' ? '아버님' : '어머님';

  // 초기 인사 메시지
  useEffect(() => {
    if (primaryPatient && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `안녕하세요, ${patientName} ${honorific}! 홈케어 도우미예요~ 😊\n오늘 궁금한 점이 있으시면 편하게 말씀해주세요.`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [primaryPatient]);

  // 자동 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (text?: string, method: 'text' | 'stt' | 'button' = 'text') => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || isLoading || !userId || !primaryPatient) return;

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
        const { data, error } = await supabase.functions.invoke('agent-patient-chat', {
          body: {
            patient_id: primaryPatient.id,
            message: trimmed,
            input_method: method,
          },
        });

        if (error) throw error;

        // Function Call 로그 표시
        if (data?.function_calls?.length > 0) {
          setCurrentFunction(data.function_calls[data.function_calls.length - 1].name);
        }

        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data?.response ?? '죄송해요, 잠시 문제가 생겼어요. 다시 말씀해주세요~',
          timestamp: new Date(),
          functionCalls: data?.function_calls,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '인터넷이 잠깐 안 되네요. 잠시 후 다시 해볼게요~',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        setCurrentFunction(null);
      }
    },
    [input, isLoading, userId, primaryPatient, supabase],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSTTResult = (transcript: string) => {
    handleSend(transcript, 'stt');
  };

  const showQuickActions = messages.length <= 1 && !isLoading;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 shadow-[0_8px_32px_rgba(0,106,99,0.25)]">
            <Heart className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary">홈케어 도우미</h1>
            <p className="text-xs font-medium text-on-surface-variant/60">
              {patientName} {honorific}의 돌봄 동반자
            </p>
          </div>
        </div>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-surface-container-lowest/50 px-5 py-6 shadow-[0_8px_40px_rgba(0,32,69,0.06)] backdrop-blur-sm [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/10 [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="space-y-6">
          {messages.map((msg, idx) => (
            <ChatBubble
              key={idx}
              message={msg}
              agentIcon={<Heart className="h-4 w-4 text-secondary" />}
              showTTS
              ttsSpeed={0.85}
            />
          ))}

          {/* 빠른 액션 */}
          {showQuickActions && (
            <div className="pt-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/50">
                이런 걸 물어보세요
              </p>
              <QuickActions
                agentType="patient"
                onAction={(msg) => handleSend(msg, 'button')}
              />
            </div>
          )}

          {/* Function Call 인디케이터 */}
          {isLoading && currentFunction && (
            <FunctionCallIndicator functionName={currentFunction} />
          )}

          {/* 타이핑 인디케이터 */}
          {isLoading && !currentFunction && (
            <div className="flex justify-start">
              <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl bg-secondary/8">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
              <div className="rounded-2xl rounded-bl-lg bg-surface-container-low px-5 py-4 shadow-sm">
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

      {/* 입력 영역 — 어르신 UX: 큰 마이크 버튼 */}
      <div>
        <div className="flex items-end gap-3 rounded-2xl bg-white/80 p-3 shadow-[0_8px_40px_rgba(0,32,69,0.08)] backdrop-blur-xl">
          {/* STT 마이크 버튼 (큰 사이즈) */}
          <STTButton
            onResult={handleSTTResult}
            disabled={isLoading}
            size="md"
          />

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="말씀해주세요..."
            rows={1}
            className="flex-1 resize-none rounded-xl bg-surface-container-low/60 px-4 py-3 text-base leading-relaxed text-primary outline-none transition-colors placeholder:text-on-surface-variant/40 focus:bg-surface-container-low"
            style={{ maxHeight: '120px', fontSize: '16px' }}
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className={clsx(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-200',
              input.trim() && !isLoading
                ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-[0_6px_24px_rgba(0,32,69,0.25)] hover:-translate-y-0.5'
                : 'bg-primary/5 text-primary/20',
            )}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-widest text-on-surface-variant/35">
          정확한 의료 판단은 담당 의사/간호사의 지시를 따르세요
        </p>
      </div>
    </div>
  );
}
