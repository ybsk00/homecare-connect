/**
 * 날짜 유틸리티 함수
 * 한국 시간대(KST) 기준
 */

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
export function getToday(): string {
  const now = new Date();
  return toDateString(now);
}

/** Date를 YYYY-MM-DD 문자열로 변환 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 이번 주 시작(월요일)과 끝(일요일) 날짜를 반환 */
export function getWeekRange(date?: Date): { start: string; end: string } {
  const d = date ? new Date(date) : new Date();
  const dayOfWeek = d.getDay();
  // 월요일 기준 (0=일요일 -> 6일 전, 1=월요일 -> 0일 전, ...)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: toDateString(monday),
    end: toDateString(sunday),
  };
}

/** 이번 달 시작과 끝 날짜를 반환 */
export function getMonthRange(date?: Date): { start: string; end: string } {
  const d = date ? new Date(date) : new Date();
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);

  return {
    start: toDateString(firstDay),
    end: toDateString(lastDay),
  };
}

/** 오늘 날짜인지 확인 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** 과거 날짜인지 확인 (오늘 포함하지 않음) */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return target.getTime() < today.getTime();
}

/** 미래 날짜인지 확인 (오늘 포함하지 않음) */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return target.getTime() > today.getTime();
}

/** 날짜에 일수를 더한 새 Date 반환 */
export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** 두 날짜 간 일수 차이 (절대값) */
export function diffDays(dateA: Date | string, dateB: Date | string): number {
  const a = typeof dateA === 'string' ? new Date(dateA) : dateA;
  const b = typeof dateB === 'string' ? new Date(dateB) : dateB;
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 요일 번호를 한국어 레이블로 변환
 * 0 -> '일', 1 -> '월', ..., 6 -> '토'
 */
export function getVisitDayLabel(dayOfWeek: number): string {
  const labels = ['일', '월', '화', '수', '목', '금', '토'];
  return labels[dayOfWeek] ?? '';
}

/**
 * 시간대 슬롯을 한국어 레이블로 변환
 * 'morning' -> '오전', 'afternoon' -> '오후'
 */
export function getTimeSlotLabel(slot: string): string {
  const labels: Record<string, string> = {
    morning: '오전',
    afternoon: '오후',
    any: '시간 무관',
  };
  return labels[slot] ?? slot;
}

/**
 * Date를 HH:mm 문자열로 변환
 */
export function toTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 날짜를 한국어 요일 포함 형식으로 반환
 * '2026.03.18 (수)'
 */
export function formatDateWithDay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dayLabel = getVisitDayLabel(d.getDay());
  return `${year}.${month}.${day} (${dayLabel})`;
}
