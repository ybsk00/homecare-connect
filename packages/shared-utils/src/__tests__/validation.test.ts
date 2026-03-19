import { describe, it, expect } from 'vitest';
import { patientRegistrationSchema, vitalsSchema } from '../validation';

describe('patientRegistrationSchema', () => {
  const validPatient = {
    full_name: '홍길동',
    birth_date: '1950-03-15',
    gender: 'male' as const,
    address: '서울특별시 강남구 테헤란로 123',
    latitude: 37.5,
    longitude: 127.0,
    needed_services: ['nursing' as const],
  };

  it('should accept valid patient data', () => {
    const result = patientRegistrationSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
  });

  it('should reject name shorter than 2 characters', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      full_name: '홍',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('이름은 2자 이상 입력해주세요');
    }
  });

  it('should reject invalid birth_date format', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      birth_date: '19500315',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid gender', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      gender: 'other',
    });
    expect(result.success).toBe(false);
  });

  it('should reject latitude outside Korea range (33-39)', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      latitude: 45.0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject longitude outside Korea range (124-132)', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      longitude: 100.0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty needed_services array', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      needed_services: [],
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional fields as null or undefined', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      care_grade: null,
      mobility: null,
      preferred_time: null,
    });
    expect(result.success).toBe(true);
  });

  it('should accept valid phone number', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      phone: '01012345678',
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty string phone', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      phone: '',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone number', () => {
    const result = patientRegistrationSchema.safeParse({
      ...validPatient,
      phone: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('should default medical_history to empty array', () => {
    const result = patientRegistrationSchema.safeParse(validPatient);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.medical_history).toEqual([]);
    }
  });
});

describe('vitalsSchema', () => {
  it('should accept valid vitals', () => {
    const result = vitalsSchema.safeParse({
      systolic_bp: 120,
      diastolic_bp: 80,
      heart_rate: 72,
      temperature: 36.5,
      blood_sugar: 100,
      spo2: 98,
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty object (all fields optional)', () => {
    const result = vitalsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject systolic_bp below 50', () => {
    const result = vitalsSchema.safeParse({ systolic_bp: 30 });
    expect(result.success).toBe(false);
  });

  it('should reject systolic_bp above 300', () => {
    const result = vitalsSchema.safeParse({ systolic_bp: 350 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer heart_rate', () => {
    const result = vitalsSchema.safeParse({ heart_rate: 72.5 });
    expect(result.success).toBe(false);
  });

  it('should accept decimal temperature', () => {
    const result = vitalsSchema.safeParse({ temperature: 36.7 });
    expect(result.success).toBe(true);
  });

  it('should reject temperature below 30', () => {
    const result = vitalsSchema.safeParse({ temperature: 25.0 });
    expect(result.success).toBe(false);
  });

  it('should reject spo2 above 100', () => {
    const result = vitalsSchema.safeParse({ spo2: 105 });
    expect(result.success).toBe(false);
  });
});
