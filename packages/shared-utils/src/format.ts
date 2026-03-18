/**
 * 포맷팅 유틸리티 함수
 * 한국어 서비스에 맞는 형식 지원
 */

/**
 * 전화번호 포맷팅
 * '01012345678' -> '010-1234-5678'
 * '0212345678' -> '02-1234-5678'
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('02')) {
    // 서울 지역번호
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * 날짜 포맷팅
 * Date -> '2026.03.18'
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * 날짜+시간 포맷팅
 * Date -> '2026.03.18 14:30'
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * 상대 시간 포맷팅
 * Date -> '3분 전', '2시간 전', '어제', '3일 전'
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return '방금 전';
  }
  if (diffMin < 60) {
    return `${diffMin}분 전`;
  }
  if (diffHour < 24) {
    return `${diffHour}시간 전`;
  }
  if (diffDay === 1) {
    return '어제';
  }
  if (diffDay < 7) {
    return `${diffDay}일 전`;
  }
  if (diffDay < 30) {
    return `${Math.floor(diffDay / 7)}주 전`;
  }
  if (diffDay < 365) {
    return `${Math.floor(diffDay / 30)}개월 전`;
  }
  return `${Math.floor(diffDay / 365)}년 전`;
}

/**
 * 거리 포맷팅
 * 2.3 -> '2.3km', 0.5 -> '500m'
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * 시간(분) 포맷팅
 * 65 -> '1시간 5분', 30 -> '30분'
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}분`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (remainingMin === 0) {
    return `${hours}시간`;
  }
  return `${hours}시간 ${remainingMin}분`;
}

/**
 * 장기요양등급 포맷팅
 * '3' -> '3등급', 'cognitive' -> '인지지원등급'
 */
export function formatCareGrade(grade: string): string {
  if (grade === 'cognitive') {
    return '인지지원등급';
  }
  return `${grade}등급`;
}

/**
 * 금액 포맷팅 (한국 원화)
 * 500000 -> '500,000원'
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/**
 * 서비스 유형 한국어 레이블
 */
export function formatServiceType(type: string): string {
  const labels: Record<string, string> = {
    nursing: '방문간호',
    physio: '방문재활',
    bath: '방문목욕',
    care: '방문요양',
    doctor_visit: '의사방문',
  };
  return labels[type] ?? type;
}

/**
 * 방문 상태 한국어 레이블
 */
export function formatVisitStatus(status: string): string {
  const labels: Record<string, string> = {
    scheduled: '예정',
    en_route: '이동 중',
    checked_in: '도착',
    in_progress: '수행 중',
    checked_out: '체크아웃',
    completed: '완료',
    cancelled: '취소',
    no_show: '미방문',
  };
  return labels[status] ?? status;
}

/**
 * 요청 상태 한국어 레이블
 */
export function formatRequestStatus(status: string): string {
  const labels: Record<string, string> = {
    matching: 'AI 매칭 중',
    waiting_selection: '기관 선택 대기',
    sent_to_org: '기관 검토 중',
    org_accepted: '기관 수락',
    org_rejected: '기관 거절',
    assessment_scheduled: '초기 평가 예정',
    service_started: '서비스 시작',
    cancelled: '취소',
    expired: '만료',
  };
  return labels[status] ?? status;
}

/**
 * 사용자 역할 한국어 레이블
 */
export function formatUserRole(role: string): string {
  const labels: Record<string, string> = {
    guardian: '보호자',
    nurse: '간호사',
    doctor: '의사',
    org_admin: '기관 관리자',
    platform_admin: '플랫폼 관리자',
  };
  return labels[role] ?? role;
}

/**
 * 기관 유형 한국어 레이블
 */
export function formatOrgType(type: string): string {
  const labels: Record<string, string> = {
    home_nursing: '방문간호센터',
    home_care: '방문요양센터',
    rehab_center: '재활치료센터',
    clinic: '의원',
    hospital: '병원',
  };
  return labels[type] ?? type;
}

/**
 * 이동능력 한국어 레이블
 */
export function formatMobility(mobility: string): string {
  const labels: Record<string, string> = {
    bedridden: '와상',
    wheelchair: '휠체어',
    walker: '보행보조기',
    independent: '독립보행',
  };
  return labels[mobility] ?? mobility;
}
