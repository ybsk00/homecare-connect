'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface STTButtonProps {
  onResult: (text: string) => void;
  onPartialResult?: (text: string) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

type STTState = 'idle' | 'recording' | 'processing';

export function STTButton({
  onResult,
  onPartialResult,
  disabled = false,
  size = 'md',
  className,
}: STTButtonProps) {
  const [state, setState] = useState<STTState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setState('processing');
        const blob = new Blob(chunksRef.current, { type: mimeType });

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((s, b) => s + String.fromCharCode(b), ''),
          );

          const res = await fetch('/api/stt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64, encoding: mimeType }),
          });

          if (!res.ok) throw new Error('STT 요청 실패');

          const data = await res.json();
          const transcript = data.transcript?.trim();
          if (transcript) {
            onResult(transcript);
          }
        } catch (err) {
          console.error('STT error:', err);
        } finally {
          setState('idle');
        }
      };

      recorder.start(250);
      setState('recording');
    } catch (err) {
      console.error('마이크 접근 실패:', err);
      setState('idle');
    }
  }, [onResult]);

  const handleClick = () => {
    if (disabled) return;
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle') {
      startRecording();
    }
  };

  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state === 'processing'}
      className={clsx(
        'relative flex shrink-0 items-center justify-center rounded-full transition-all duration-300',
        sizeClasses[size],
        state === 'recording'
          ? 'bg-error text-white shadow-[0_0_24px_rgba(179,38,30,0.4)] animate-pulse'
          : state === 'processing'
            ? 'bg-primary/10 text-primary/40'
            : 'bg-gradient-to-br from-secondary to-secondary/80 text-white shadow-[0_6px_24px_rgba(0,106,99,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,106,99,0.3)]',
        disabled && 'opacity-40 pointer-events-none',
        className,
      )}
      aria-label={state === 'recording' ? '녹음 중지' : '음성 입력'}
    >
      {state === 'processing' ? (
        <Loader2 className={clsx(iconSizes[size], 'animate-spin')} />
      ) : state === 'recording' ? (
        <MicOff className={iconSizes[size]} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}

      {/* 녹음 중 외부 링 애니메이션 */}
      {state === 'recording' && (
        <span className="absolute inset-0 rounded-full border-2 border-error/50 animate-ping" />
      )}
    </button>
  );
}
