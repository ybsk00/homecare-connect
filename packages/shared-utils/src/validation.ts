import { z } from 'zod';

// =====================================================
// 공통 스키마
// =====================================================

/** 전화번호 (한국 휴대폰) */
const phoneSchema = z
  .string()
  .regex(/^01[016789]\d{7,8}$/, '올바른 휴대폰 번호를 입력해주세요');

/** UUID */
const uuidSchema = z.string().uuid();

// =====================================================
// 환자 등록 폼
// =====================================================

export const patientRegistrationSchema = z.object({
  full_name: z.string().min(2, '이름은 2자 이상 입력해주세요').max(50),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식으로 입력해주세요'),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택해주세요' }),
  phone: phoneSchema.optional().or(z.literal('')),
  address: z.string().min(5, '주소를 입력해주세요'),
  address_detail: z.string().optional(),
  latitude: z.number().min(33).max(39), // 한국 위도 범위
  longitude: z.number().min(124).max(132), // 한국 경도 범위
  care_grade: z
    .enum(['1', '2', '3', '4', '5', 'cognitive'], {
      required_error: '장기요양등급을 선택해주세요',
    })
    .optional()
    .nullable(),
  mobility: z
    .enum(['bedridden', 'wheelchair', 'walker', 'independent'])
    .optional()
    .nullable(),
  primary_diagnosis: z.string().max(200).optional(),
  medical_history: z.array(z.string()).default([]),
  current_medications: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  needed_services: z
    .array(z.enum(['nursing', 'physio', 'bath', 'care', 'doctor_visit']))
    .min(1, '필요한 서비스를 1개 이상 선택해주세요'),
  preferred_time: z.enum(['morning', 'afternoon', 'any']).optional().nullable(),
  special_notes: z.string().max(1000).optional(),
});

export type PatientRegistrationInput = z.infer<typeof patientRegistrationSchema>;

// =====================================================
// 기관 등록 폼
// =====================================================

export const organizationRegistrationSchema = z.object({
  name: z.string().min(2, '기관명은 2자 이상 입력해주세요').max(100),
  business_number: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호 형식이 올바르지 않습니다 (000-00-00000)'),
  license_number: z.string().optional(),
  org_type: z.enum(['home_nursing', 'home_care', 'rehab_center', 'clinic', 'hospital'], {
    required_error: '기관 유형을 선택해주세요',
  }),
  address: z.string().min(5, '주소를 입력해주세요'),
  address_detail: z.string().optional(),
  latitude: z.number().min(33).max(39),
  longitude: z.number().min(124).max(132),
  services: z
    .array(z.enum(['nursing', 'physio', 'bath', 'care', 'doctor_visit']))
    .min(1, '제공 서비스를 1개 이상 선택해주세요'),
  service_area_km: z.number().min(1).max(50).default(10),
  phone: phoneSchema,
  email: z.string().email('올바른 이메일을 입력해주세요').optional().or(z.literal('')),
  website: z.string().url('올바른 URL을 입력해주세요').optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
});

export type OrganizationRegistrationInput = z.infer<typeof organizationRegistrationSchema>;

// =====================================================
// 방문 기록 (바이탈 + 체크리스트)
// =====================================================

export const vitalsSchema = z.object({
  systolic_bp: z.number().int().min(50).max(300).optional(),
  diastolic_bp: z.number().int().min(20).max(200).optional(),
  heart_rate: z.number().int().min(20).max(250).optional(),
  temperature: z.number().min(30).max(45).optional(),
  blood_sugar: z.number().int().min(10).max(700).optional(),
  spo2: z.number().int().min(50).max(100).optional(),
  weight: z.number().min(10).max(300).optional(),
  respiration_rate: z.number().int().min(5).max(60).optional(),
});

export type VitalsInput = z.infer<typeof vitalsSchema>;

export const performedItemSchema = z.object({
  item: z.string().min(1),
  done: z.boolean(),
  note: z.string().max(500).optional(),
});

export const visitRecordSchema = z.object({
  visit_id: uuidSchema,
  vitals: vitalsSchema.default({}),
  performed_items: z.array(performedItemSchema).default([]),
  general_condition: z.enum(['good', 'fair', 'poor']).optional().nullable(),
  consciousness: z.string().max(200).optional().nullable(),
  skin_condition: z.string().max(200).optional().nullable(),
  nutrition_intake: z.enum(['full', 'half', 'poor', 'none']).optional().nullable(),
  pain_score: z.number().int().min(0).max(10).optional().nullable(),
  mood: z.string().max(200).optional().nullable(),
  nurse_note: z.string().max(5000).optional(),
  message_to_guardian: z.string().max(2000).optional(),
});

export type VisitRecordInput = z.infer<typeof visitRecordSchema>;

// =====================================================
// 서비스 요청 (매칭)
// =====================================================

export const serviceRequestSchema = z.object({
  patient_id: uuidSchema,
  requested_services: z
    .array(z.enum(['nursing', 'physio', 'bath', 'care', 'doctor_visit']))
    .min(1, '필요한 서비스를 1개 이상 선택해주세요'),
  preferred_time: z.enum(['morning', 'afternoon', 'any']).optional(),
  urgency: z.enum(['normal', 'urgent']).default('normal'),
  notes: z.string().max(1000).optional(),
});

export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;

// =====================================================
// 매칭 요청
// =====================================================

export const matchingRequestSchema = z.object({
  patient_id: uuidSchema,
  radius_km: z.number().min(1).max(50).default(10),
});

export type MatchingRequestInput = z.infer<typeof matchingRequestSchema>;

// =====================================================
// 리뷰 폼
// =====================================================

export const reviewSchema = z.object({
  org_id: uuidSchema,
  patient_id: uuidSchema,
  rating: z.number().int().min(1, '별점을 선택해주세요').max(5),
  content: z.string().max(2000).optional(),
  rating_quality: z.number().int().min(1).max(5).optional(),
  rating_punctuality: z.number().int().min(1).max(5).optional(),
  rating_communication: z.number().int().min(1).max(5).optional(),
  rating_kindness: z.number().int().min(1).max(5).optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
