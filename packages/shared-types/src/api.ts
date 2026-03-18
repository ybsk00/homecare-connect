/**
 * API 요청/응답 타입 정의
 */

// =====================================================
// 매칭 API
// =====================================================

/** 매칭 요청 */
export interface MatchingRequest {
  patient_id: string;
  radius_km?: number;
}

/** 개별 매칭 결과 */
export interface MatchingResult {
  org_id: string;
  org_name: string;
  distance_km: number;
  total_score: number;
  scores: {
    distance: number;
    service_match: number;
    capacity: number;
    reputation: number;
    response: number;
  };
  reasons: string[];
}

/** 매칭 응답 */
export interface MatchingResponse {
  request_id: string;
  matches: MatchingResult[];
}

// =====================================================
// RAG 챗봇 API
// =====================================================

/** 채팅 요청 */
export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

/** 채팅 응답 */
export interface ChatResponse {
  answer: string;
  sources: {
    title: string;
    source: string;
  }[];
  follow_up_actions: {
    type: string;
    label: string;
    url?: string;
  }[];
}

// =====================================================
// 동선 최적화 API
// =====================================================

/** 경로 최적화 요청 */
export interface RouteOptimizeRequest {
  nurse_id: string;
  date: string;
  start_location: {
    lat: number;
    lng: number;
  };
}

/** 경로 최적화 응답 */
export interface RouteOptimizeResponse {
  optimized_order: {
    visit_id: string;
    order: number;
    eta: string;
    travel_min: number;
  }[];
  total_travel_min: number;
  saved_min: number;
}

// =====================================================
// 레드플래그 API
// =====================================================

/** 레드플래그 알림 */
export interface RedFlagAlert {
  id: string;
  severity: 'yellow' | 'orange' | 'red';
  category: string;
  title: string;
  description: string;
  patient_id: string;
  created_at: string;
}

// =====================================================
// AI 리포트 API
// =====================================================

/** AI 리포트 요약 */
export interface AIReportSummary {
  id: string;
  patient_id: string;
  period_start: string;
  period_end: string;
  status: string;
  ai_summary: string | null;
}

// =====================================================
// 알림 API
// =====================================================

/** 알림 발송 페이로드 */
export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channels?: ('in_app' | 'push' | 'kakao_alimtalk')[];
}

// =====================================================
// 공통 API 타입
// =====================================================

/** 페이지네이션 요청 파라미터 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** 페이지네이션 응답 메타 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/** API 응답 래퍼 */
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

/** API 에러 응답 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
