/**
 * View/UI 타입 정의
 * 앱에서 사용하는 화면 표시용 타입들
 */

import type { Tables } from './database';

// =====================================================
// 공통
// =====================================================

/** Badge 컴포넌트 색상 */
export type BadgeColor =
  | 'gray'
  | 'green'
  | 'yellow'
  | 'red'
  | 'blue'
  | 'navy'
  | 'teal'
  | 'brown'
  | 'purple';

// =====================================================
// Admin 대시보드
// =====================================================

/** 플랫폼 관리자 대시보드 KPI */
export interface DashboardStats {
  totalOrgs: number;
  totalPatients: number;
  mrr: number;
  totalStaff: number;
  orgGrowth: string;
  patientGrowth: string;
  mrrGrowth: string;
  staffGrowth: string;
}

/** 일별 차트 데이터 (매칭/방문 추이) */
export interface DailyChartData {
  date: string;
  matchings: number;
  visits: number;
}

// =====================================================
// 방문 관련
// =====================================================

/** 오늘의 방문 요약 (병원 대시보드) */
export interface VisitSummary {
  id: string;
  scheduled_time: string | null;
  status: string;
  patient_name: string;
  nurse_name: string;
}

/** 방문 슬롯 데이터 (스케줄 캘린더) */
export interface VisitSlotData {
  id: string;
  patient_name: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
}

/** 방문 + 환자 정보 (환자 앱 홈) */
export type VisitWithPatient = Tables<'visits'> & {
  patient?: {
    id: string;
    full_name: string;
    birth_date: string;
    gender: 'male' | 'female';
    care_grade: string | null;
    address: string;
    address_detail?: string | null;
    mobility?: string | null;
    primary_diagnosis?: string | null;
    current_medications?: unknown[];
    allergies?: unknown[];
    special_notes?: string | null;
    phone?: string | null;
    location?: string | null;
  } | null;
  nurse?: {
    id: string;
    staff_type: string;
    user?: { full_name: string; avatar_url: string | null } | null;
  } | null;
};

/** 방문 기록 폼 데이터 (간호사 앱) */
export interface VisitFormData {
  vitals: {
    systolic_bp?: number;
    diastolic_bp?: number;
    heart_rate?: number;
    temperature?: number;
    blood_sugar?: number;
    spo2?: number;
    weight?: number;
    respiration_rate?: number;
  };
  performedItems: { item: string; done: boolean; note?: string }[];
  generalCondition?: string | null;
  consciousness?: string | null;
  skinCondition?: string | null;
  nutritionIntake?: string | null;
  painScore?: number | null;
  mood?: string | null;
  nurseNote?: string;
  messageToGuardian?: string;
  photos: string[];
  voiceMemoUri?: string | null;
  voiceMemoText?: string;
}

// =====================================================
// 스케줄/스태프
// =====================================================

/** 간호사별 스케줄 (캘린더 뷰) */
export interface NurseSchedule {
  nurse_id: string;
  nurse_name: string;
  visits: Array<{
    id: string;
    scheduled_date: string;
    scheduled_time: string | null;
    status: string;
    patient_name: string;
  }>;
}

/** 직원 테이블 행 (병원 콘솔) */
export interface StaffRow {
  id: string;
  full_name: string;
  staff_type: string;
  phone: string;
  specialties: string[];
  current_patient_count: number;
  max_patients: number;
  today_visits: number;
  is_active: boolean;
}

/** 직원 상세 (관리자 기관 상세) */
export interface StaffMember {
  id: string;
  staff_type: string;
  license_number: string | null;
  specialties: string[];
  current_patient_count: number;
  max_patients: number;
  is_active: boolean;
  user?: { full_name: string; phone: string } | null;
}

// =====================================================
// 바이탈
// =====================================================

/** 바이탈 차트 데이터 포인트 */
export interface VitalDataPoint {
  date: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  temperature?: number;
  blood_sugar?: number;
  spo2?: number;
  weight?: number;
  respiration_rate?: number;
}

/** 바이탈 측정값 */
export interface Vitals {
  systolic_bp?: number;
  diastolic_bp?: number;
  heart_rate?: number;
  temperature?: number;
  blood_sugar?: number;
  spo2?: number;
  weight?: number;
  respiration_rate?: number;
}

// =====================================================
// 기관 관리
// =====================================================

/** 기관 목록 뷰 (관리자) */
export interface OrganizationView {
  id: string;
  name: string;
  business_number: string;
  org_type: string;
  verification_status: string;
  subscription_plan: string;
  active_patient_count: number;
  created_at: string;
}

/** 기관 상세 뷰 (관리자) */
export interface OrgDetail {
  id: string;
  name: string;
  org_type: string;
  business_number: string;
  license_number?: string;
  phone: string;
  email?: string;
  address: string;
  services: string[];
  description?: string;
  created_at: string;
  subscription_plan: string;
  service_area_km: number;
  rating_avg: number;
  review_count: number;
  verification_status: string;
}

/** 기관 심사 데이터 */
export interface OrgReviewData {
  id: string;
  name: string;
  org_type: string;
  business_number: string;
  license_number?: string;
  phone: string;
  email?: string;
  address: string;
  services: string[];
  description?: string;
  created_at: string;
  verification_status: string;
}

/** 기관 서비스 통계 */
export interface ServiceStats {
  totalPatients: number;
  activeVisitsThisMonth: number;
  completedVisitsThisMonth: number;
}

// =====================================================
// 고객지원/구독/광고
// =====================================================

/** 고객지원 티켓 */
export interface SupportTicket {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  type: string;
  profile?: {
    full_name: string;
    role: string;
    phone: string;
  } | null;
  data?: {
    status: 'unread' | 'in_progress' | 'resolved';
    admin_reply?: string;
    replied_at?: string;
  };
}

/** 구독 목록 뷰 */
export interface SubscriptionView {
  id: string;
  org_id: string;
  plan: string;
  status: string;
  amount: number;
  billing_cycle: string;
  next_billing_date: string | null;
  started_at: string;
  organization?: {
    name: string;
  } | null;
}

/** 광고 목록 뷰 */
export interface AdvertisementView {
  id: string;
  organization?: {
    name: string;
  } | null;
  ad_type: string;
  target_area: string | null;
  monthly_fee: number | null;
  start_date: string | null;
  end_date: string | null;
  review_status: string;
  reviewed_at: string | null;
  is_active: boolean;
}

// =====================================================
// AI 모니터링 (관리자)
// =====================================================

/** 레드플래그 통계 */
export interface RedFlagStats {
  total: number;
  red: number;
  orange: number;
  yellow: number;
  falsePositiveRate: number;
}

/** AI 리포트 통계 */
export interface ReportStats {
  generating: number;
  generated: number;
  doctorReviewed: number;
  sent: number;
  error: number;
}

/** 챗봇 통계 */
export interface ChatStats {
  totalConversations: number;
  escalationRate: number;
}

/** AI 비용 추정 */
export interface AiCostEstimate {
  totalCalls: number;
  estimatedCost: number;
  avgCallsPerDay: number;
}

// =====================================================
// RAG / 챗봇
// =====================================================

/** RAG 문서 */
export interface RagDocument {
  id: string;
  title: string;
  source: string;
  content: string;
  chunk_index: number;
  is_active: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/** 문서 그룹 (같은 제목의 청크들) */
export interface DocumentGroup {
  title: string;
  source: string;
  chunks: RagDocument[];
  is_active: boolean;
  created_at: string;
}

/** 챗봇 메시지 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  sources?: Array<{
    title: string;
    source?: string;
    similarity?: number;
  }>;
  actions?: Array<{
    label: string;
    type?: string;
    data?: Record<string, unknown>;
  }>;
}
