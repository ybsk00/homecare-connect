// 사용자 역할
export const UserRole = {
  GUARDIAN: 'guardian',
  NURSE: 'nurse',
  DOCTOR: 'doctor',
  ORG_ADMIN: 'org_admin',
  PLATFORM_ADMIN: 'platform_admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// 환자 상태
export const PatientStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DISCHARGED: 'discharged',
} as const;
export type PatientStatus = (typeof PatientStatus)[keyof typeof PatientStatus];

// 장기요양등급
export const CareGrade = {
  GRADE_1: '1',
  GRADE_2: '2',
  GRADE_3: '3',
  GRADE_4: '4',
  GRADE_5: '5',
  COGNITIVE: 'cognitive',
} as const;
export type CareGrade = (typeof CareGrade)[keyof typeof CareGrade];

// 이동능력
export const Mobility = {
  BEDRIDDEN: 'bedridden',
  WHEELCHAIR: 'wheelchair',
  WALKER: 'walker',
  INDEPENDENT: 'independent',
} as const;
export type Mobility = (typeof Mobility)[keyof typeof Mobility];

// 서비스 유형
export const ServiceType = {
  NURSING: 'nursing',
  PHYSIO: 'physio',
  BATH: 'bath',
  CARE: 'care',
  DOCTOR_VISIT: 'doctor_visit',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

// 방문 상태
export const VisitStatus = {
  SCHEDULED: 'scheduled',
  EN_ROUTE: 'en_route',
  CHECKED_IN: 'checked_in',
  IN_PROGRESS: 'in_progress',
  CHECKED_OUT: 'checked_out',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

// 매칭 요청 상태
export const RequestStatus = {
  MATCHING: 'matching',
  WAITING_SELECTION: 'waiting_selection',
  SENT_TO_ORG: 'sent_to_org',
  ORG_ACCEPTED: 'org_accepted',
  ORG_REJECTED: 'org_rejected',
  ASSESSMENT_SCHEDULED: 'assessment_scheduled',
  SERVICE_STARTED: 'service_started',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

// 레드플래그 심각도
export const RedFlagSeverity = {
  YELLOW: 'yellow',
  ORANGE: 'orange',
  RED: 'red',
} as const;
export type RedFlagSeverity = (typeof RedFlagSeverity)[keyof typeof RedFlagSeverity];

// 알림 모드
export const NotificationMode = {
  ALL: 'all',
  SUMMARY: 'summary',
  ALERT_ONLY: 'alert_only',
} as const;
export type NotificationMode = (typeof NotificationMode)[keyof typeof NotificationMode];

// 구독 플랜
export const SubscriptionPlan = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;
export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

// 기관 유형
export const OrgType = {
  HOME_NURSING: 'home_nursing',
  HOME_CARE: 'home_care',
  REHAB_CENTER: 'rehab_center',
  CLINIC: 'clinic',
  HOSPITAL: 'hospital',
} as const;
export type OrgType = (typeof OrgType)[keyof typeof OrgType];

// 직원 유형
export const StaffType = {
  NURSE: 'nurse',
  DOCTOR: 'doctor',
  PHYSIO: 'physio',
  CAREGIVER: 'caregiver',
} as const;
export type StaffType = (typeof StaffType)[keyof typeof StaffType];

// 인증 상태
export const VerificationStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];
