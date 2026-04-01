import { describe, it, expect } from 'vitest';

/**
 * Edge Function 입력 검증 로직 테스트
 * _shared/validate.ts는 Deno 환경이므로 동일한 검증 로직을 순수 함수로 테스트
 */

// validate.ts의 검증 로직을 Node.js 환경에서 재현
interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
}

function validateFields(
  body: Record<string, unknown>,
  schema: FieldSchema[],
): { valid: true } | { valid: false; field: string; message: string } {
  for (const field of schema) {
    const value = body[field.name];

    if (field.required && (value === undefined || value === null || value === '')) {
      return { valid: false, field: field.name, message: `${field.name}은(는) 필수입니다.` };
    }

    if (value !== undefined && value !== null) {
      if (field.type === 'string' && typeof value !== 'string') {
        return { valid: false, field: field.name, message: `${field.name}은(는) 문자열이어야 합니다.` };
      }
      if (field.type === 'number' && typeof value !== 'number') {
        return { valid: false, field: field.name, message: `${field.name}은(는) 숫자여야 합니다.` };
      }
      if (field.type === 'array' && !Array.isArray(value)) {
        return { valid: false, field: field.name, message: `${field.name}은(는) 배열이어야 합니다.` };
      }
      if (field.type === 'string' && field.maxLength && (value as string).length > field.maxLength) {
        return { valid: false, field: field.name, message: `${field.name}은(는) ${field.maxLength}자 이하여야 합니다.` };
      }
      if (field.type === 'number') {
        if (field.min !== undefined && (value as number) < field.min) {
          return { valid: false, field: field.name, message: `${field.name}은(는) ${field.min} 이상이어야 합니다.` };
        }
        if (field.max !== undefined && (value as number) > field.max) {
          return { valid: false, field: field.name, message: `${field.name}은(는) ${field.max} 이하여야 합니다.` };
        }
      }
      if (field.type === 'array' && field.maxLength && (value as unknown[]).length > field.maxLength) {
        return { valid: false, field: field.name, message: `${field.name}은(는) ${field.maxLength}개 이하여야 합니다.` };
      }
    }
  }

  return { valid: true };
}

// ── ai-matching 입력 검증 테스트 ──

describe('ai-matching 입력 검증', () => {
  const schema: FieldSchema[] = [
    { name: 'patient_id', type: 'string', required: true },
    { name: 'radius_km', type: 'number', required: false, min: 0.1, max: 100 },
  ];

  it('should accept valid input', () => {
    const result = validateFields({ patient_id: 'abc-123', radius_km: 10 }, schema);
    expect(result.valid).toBe(true);
  });

  it('should accept input without optional radius_km', () => {
    const result = validateFields({ patient_id: 'abc-123' }, schema);
    expect(result.valid).toBe(true);
  });

  it('should reject missing patient_id', () => {
    const result = validateFields({}, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('patient_id');
    }
  });

  it('should reject empty patient_id', () => {
    const result = validateFields({ patient_id: '' }, schema);
    expect(result.valid).toBe(false);
  });

  it('should reject non-string patient_id', () => {
    const result = validateFields({ patient_id: 123 }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('patient_id');
    }
  });

  it('should reject radius_km below minimum', () => {
    const result = validateFields({ patient_id: 'abc', radius_km: 0 }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('radius_km');
    }
  });

  it('should reject radius_km above maximum', () => {
    const result = validateFields({ patient_id: 'abc', radius_km: 200 }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('radius_km');
    }
  });

  it('should reject non-number radius_km', () => {
    const result = validateFields({ patient_id: 'abc', radius_km: 'ten' }, schema);
    expect(result.valid).toBe(false);
  });
});

// ── agent-patient-chat 입력 검증 테스트 ──

describe('agent-patient-chat 입력 검증', () => {
  const schema: FieldSchema[] = [
    { name: 'patient_id', type: 'string', required: true },
    { name: 'message', type: 'string', required: true, maxLength: 5000 },
    { name: 'input_method', type: 'string', required: false, maxLength: 20 },
  ];

  it('should accept valid chat input', () => {
    const result = validateFields({
      patient_id: 'abc-123',
      message: '오늘 혈압이 좀 높은 것 같아요.',
    }, schema);
    expect(result.valid).toBe(true);
  });

  it('should reject message exceeding 5000 chars', () => {
    const result = validateFields({
      patient_id: 'abc-123',
      message: 'x'.repeat(5001),
    }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('message');
    }
  });

  it('should reject missing message', () => {
    const result = validateFields({ patient_id: 'abc-123' }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('message');
    }
  });
});

// ── send-notification 입력 검증 테스트 ──

describe('send-notification 입력 검증', () => {
  const schema: FieldSchema[] = [
    { name: 'user_ids', type: 'array', required: true, maxLength: 1000 },
    { name: 'title', type: 'string', required: true, maxLength: 200 },
    { name: 'body', type: 'string', required: true, maxLength: 2000 },
  ];

  it('should accept valid notification', () => {
    const result = validateFields({
      user_ids: ['user-1', 'user-2'],
      title: '방문 알림',
      body: '오늘 오후 2시에 방문 예정입니다.',
    }, schema);
    expect(result.valid).toBe(true);
  });

  it('should reject non-array user_ids', () => {
    const result = validateFields({
      user_ids: 'not-array',
      title: '알림',
      body: '내용',
    }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('user_ids');
    }
  });

  it('should reject too many user_ids', () => {
    const result = validateFields({
      user_ids: Array.from({ length: 1001 }, (_, i) => `user-${i}`),
      title: '알림',
      body: '내용',
    }, schema);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.field).toBe('user_ids');
    }
  });

  it('should reject title exceeding 200 chars', () => {
    const result = validateFields({
      user_ids: ['user-1'],
      title: 'x'.repeat(201),
      body: '내용',
    }, schema);
    expect(result.valid).toBe(false);
  });
});
