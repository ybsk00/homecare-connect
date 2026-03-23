'use client';

import { Calendar, Pill, Heart, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';

interface QuickAction {
  label: string;
  icon: typeof Calendar;
  message: string;
  color: string;
}

const PATIENT_ACTIONS: QuickAction[] = [
  {
    label: '오늘 일정',
    icon: Calendar,
    message: '오늘 방문 일정 알려줘',
    color: 'bg-primary/8 text-primary',
  },
  {
    label: '약 먹을 시간',
    icon: Pill,
    message: '오늘 먹을 약 알려줘',
    color: 'bg-secondary/8 text-secondary',
  },
  {
    label: '몸이 안 좋아요',
    icon: Heart,
    message: '몸이 좀 안 좋아요',
    color: 'bg-error/8 text-error',
  },
];

const NURSE_ACTIONS: QuickAction[] = [
  {
    label: '오늘 브리핑',
    icon: Calendar,
    message: '오늘 브리핑 해줘',
    color: 'bg-primary/8 text-primary',
  },
  {
    label: '다음 환자',
    icon: MessageSquare,
    message: '다음 환자 알려줘',
    color: 'bg-secondary/8 text-secondary',
  },
  {
    label: '주의 환자',
    icon: Heart,
    message: '주의해야 할 환자 있어?',
    color: 'bg-error/8 text-error',
  },
];

interface QuickActionsProps {
  agentType: 'patient' | 'nurse';
  onAction: (message: string) => void;
  className?: string;
}

export function QuickActions({ agentType, onAction, className }: QuickActionsProps) {
  const actions = agentType === 'patient' ? PATIENT_ACTIONS : NURSE_ACTIONS;

  return (
    <div className={clsx('flex flex-wrap gap-2.5', className)}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => onAction(action.message)}
            className={clsx(
              'flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-200',
              'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]',
              'active:scale-95',
              action.color,
            )}
          >
            <Icon className="h-4.5 w-4.5" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
