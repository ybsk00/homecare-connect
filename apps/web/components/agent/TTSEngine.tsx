'use client';

import { useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface TTSEngineProps {
  text: string;
  /** TTS 재생 속도 (0.5 ~ 2.0, 기본 0.85 - 어르신 대상 느린 속도) */
  speed?: number;
  className?: string;
}

export function TTSEngine({ text, speed = 0.85, className }: TTSEngineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Web Speech API fallback 정지
    window.speechSynthesis?.cancel();
    setIsPlaying(false);
  }, []);

  const playWithWebSpeech = useCallback(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = speed;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }, [text, speed]);

  const play = useCallback(async () => {
    if (isPlaying) {
      stop();
      return;
    }

    // Web Speech API 사용 (브라우저 내장, 무료)
    if ('speechSynthesis' in window) {
      playWithWebSpeech();
      return;
    }
  }, [isPlaying, stop, playWithWebSpeech]);

  return (
    <button
      onClick={play}
      disabled={isLoading}
      className={clsx(
        'flex items-center justify-center rounded-lg p-1.5 transition-all',
        isPlaying
          ? 'text-secondary bg-secondary/10'
          : 'text-on-surface-variant/40 hover:text-secondary hover:bg-secondary/5',
        className,
      )}
      aria-label={isPlaying ? '읽기 중지' : '읽어주기'}
      title={isPlaying ? '중지' : '읽어주기'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </button>
  );
}
