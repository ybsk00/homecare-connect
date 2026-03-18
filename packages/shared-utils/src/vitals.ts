/**
 * 바이탈 사인 정상 범위 판정
 * 노인 환자 기준 범위값 적용
 */

export interface VitalRange {
  normal: [number, number];
  warning: [number, number];
  critical: [number, number];
}

export interface VitalRanges {
  systolic_bp: VitalRange;
  diastolic_bp: VitalRange;
  heart_rate: VitalRange;
  temperature: VitalRange;
  blood_sugar: VitalRange;
  spo2: VitalRange;
}

/** 노인 환자 기준 바이탈 범위 */
export const VITAL_RANGES: VitalRanges = {
  systolic_bp: {
    normal: [90, 140],
    warning: [80, 160],
    critical: [70, 180],
  },
  diastolic_bp: {
    normal: [60, 90],
    warning: [50, 100],
    critical: [40, 110],
  },
  heart_rate: {
    normal: [60, 100],
    warning: [50, 120],
    critical: [40, 150],
  },
  temperature: {
    normal: [36.0, 37.5],
    warning: [35.5, 38.0],
    critical: [35.0, 39.0],
  },
  blood_sugar: {
    normal: [70, 140],
    warning: [55, 200],
    critical: [40, 300],
  },
  spo2: {
    normal: [95, 100],
    warning: [90, 100],
    critical: [85, 100],
  },
};

export type VitalStatus = 'normal' | 'warning' | 'critical';

/**
 * 바이탈 수치의 상태를 판정합니다.
 * @param vitalType 바이탈 유형 (systolic_bp, diastolic_bp, heart_rate 등)
 * @param value 측정값
 * @returns 'normal' | 'warning' | 'critical'
 */
export function getVitalStatus(vitalType: keyof VitalRanges, value: number): VitalStatus {
  const range = VITAL_RANGES[vitalType];

  // critical 범위 밖이면 critical
  if (value < range.critical[0] || value > range.critical[1]) {
    return 'critical';
  }

  // warning 범위 밖이면 warning
  if (value < range.warning[0] || value > range.warning[1]) {
    return 'warning';
  }

  // normal 범위 밖이면 warning
  if (value < range.normal[0] || value > range.normal[1]) {
    return 'warning';
  }

  return 'normal';
}

/**
 * 바이탈 상태에 해당하는 색상 코드를 반환합니다.
 * @param status 바이탈 상태
 * @returns HEX 색상 코드
 */
export function getVitalStatusColor(status: VitalStatus): string {
  switch (status) {
    case 'normal':
      return '#22C55E'; // green-500
    case 'warning':
      return '#F59E0B'; // amber-500
    case 'critical':
      return '#EF4444'; // red-500
  }
}

/**
 * 바이탈 상태에 해당하는 한국어 레이블을 반환합니다.
 */
export function getVitalStatusLabel(status: VitalStatus): string {
  switch (status) {
    case 'normal':
      return '정상';
    case 'warning':
      return '주의';
    case 'critical':
      return '위험';
  }
}

/**
 * 바이탈 유형의 한국어 레이블을 반환합니다.
 */
export function getVitalTypeLabel(vitalType: keyof VitalRanges): string {
  const labels: Record<keyof VitalRanges, string> = {
    systolic_bp: '수축기 혈압',
    diastolic_bp: '이완기 혈압',
    heart_rate: '심박수',
    temperature: '체온',
    blood_sugar: '혈당',
    spo2: '산소포화도',
  };
  return labels[vitalType];
}

/**
 * 바이탈 유형의 단위를 반환합니다.
 */
export function getVitalUnit(vitalType: keyof VitalRanges): string {
  const units: Record<keyof VitalRanges, string> = {
    systolic_bp: 'mmHg',
    diastolic_bp: 'mmHg',
    heart_rate: 'bpm',
    temperature: 'C',
    blood_sugar: 'mg/dL',
    spo2: '%',
  };
  return units[vitalType];
}
