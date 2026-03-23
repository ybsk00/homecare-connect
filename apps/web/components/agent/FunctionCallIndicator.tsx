'use client';

import { Loader2, Search, Pill, Utensils, Activity, Calendar, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

const FUNCTION_LABELS: Record<string, { label: string; icon: typeof Search }> = {
  get_today_schedule: { label: '일정 조회 중', icon: Calendar },
  get_medication_schedule: { label: '복약 정보 조회 중', icon: Pill },
  get_drug_info: { label: '약품 정보 조회 중 (e약은요)', icon: Pill },
  check_dur_interaction: { label: '약물 상호작용 확인 중 (DUR)', icon: AlertTriangle },
  record_condition_check: { label: '컨디션 기록 중', icon: Activity },
  analyze_meal_photo: { label: '식사 분석 중', icon: Utensils },
  confirm_medication_taken: { label: '복용 기록 중', icon: Pill },
  search_health_knowledge: { label: '건강 정보 검색 중', icon: Search },
  trigger_red_flag: { label: '간호사에게 알림 전송 중', icon: AlertTriangle },
  get_today_briefing: { label: '오늘 브리핑 생성 중', icon: Calendar },
  get_patient_summary: { label: '환자 요약 조회 중', icon: Activity },
  get_patient_medications: { label: '처방약 조회 중', icon: Pill },
  get_pending_assessments: { label: '검사 항목 조회 중', icon: Search },
  get_red_flags: { label: '주의사항 확인 중', icon: AlertTriangle },
  get_next_patient: { label: '다음 환자 정보 조회 중', icon: Calendar },
  get_condition_check_results: { label: '컨디션 체크 결과 조회 중', icon: Activity },
  search_clinical_knowledge: { label: '임상 가이드라인 검색 중', icon: Search },
};

interface FunctionCallIndicatorProps {
  functionName?: string;
  className?: string;
}

export function FunctionCallIndicator({
  functionName,
  className,
}: FunctionCallIndicatorProps) {
  const info = functionName ? FUNCTION_LABELS[functionName] : null;
  const Icon = info?.icon ?? Search;
  const label = info?.label ?? '정보 조회 중';

  return (
    <div className={clsx('flex justify-start', className)}>
      <div className="flex items-center gap-3 rounded-2xl rounded-bl-lg bg-surface-container-low px-5 py-3.5 shadow-[0_4px_24px_rgba(0,32,69,0.06)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
          <Icon className="h-4 w-4 text-secondary" />
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-secondary" />
          <span className="text-sm font-medium text-on-surface-variant">{label}</span>
        </div>
      </div>
    </div>
  );
}
