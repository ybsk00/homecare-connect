'use client';

import { Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { TTSEngine } from './TTSEngine';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  inputMethod?: 'text' | 'stt' | 'button';
  functionCalls?: unknown[];
  ragSources?: unknown[];
}

interface ChatBubbleProps {
  message: ChatMessage;
  agentIcon?: React.ReactNode;
  showTTS?: boolean;
  ttsSpeed?: number;
}

export function ChatBubble({
  message,
  agentIcon,
  showTTS = true,
  ttsSpeed = 0.85,
}: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      {/* 에이전트 아바타 */}
      {!isUser && (
        <div className="mr-3 flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl bg-secondary/8 shadow-[0_4px_16px_rgba(0,106,99,0.08)]">
          {agentIcon ?? <Sparkles className="h-4 w-4 text-secondary" />}
        </div>
      )}

      <div
        className={clsx(
          'max-w-[75%] px-5 py-4',
          isUser
            ? 'rounded-2xl rounded-br-lg bg-gradient-to-br from-primary to-primary-container text-white shadow-[0_8px_32px_rgba(0,32,69,0.18)]'
            : 'rounded-2xl rounded-bl-lg bg-surface-container-low text-on-surface shadow-[0_4px_24px_rgba(0,32,69,0.06)]',
        )}
      >
        <p className="whitespace-pre-wrap text-[14.5px] leading-[1.7]">{message.content}</p>

        <div className="mt-2 flex items-center justify-between gap-2">
          <p
            className={clsx(
              'text-[10px] font-medium uppercase tracking-wider',
              isUser ? 'text-white/40' : 'text-on-surface-variant/35',
            )}
          >
            {message.inputMethod === 'stt' && !isUser ? '' : ''}
            {formatTime(message.timestamp)}
          </p>

          {/* TTS 버튼 (에이전트 메시지에만) */}
          {!isUser && showTTS && (
            <TTSEngine text={message.content} speed={ttsSpeed} />
          )}
        </div>
      </div>
    </div>
  );
}
