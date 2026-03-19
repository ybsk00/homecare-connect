import { describe, it, expect } from 'vitest';
import { getVitalStatus, getVitalStatusColor, getVitalStatusLabel } from '../vitals';

describe('getVitalStatus', () => {
  describe('systolic_bp', () => {
    it('should return normal for 120', () => {
      expect(getVitalStatus('systolic_bp', 120)).toBe('normal');
    });

    it('should return normal at lower boundary (90)', () => {
      expect(getVitalStatus('systolic_bp', 90)).toBe('normal');
    });

    it('should return normal at upper boundary (140)', () => {
      expect(getVitalStatus('systolic_bp', 140)).toBe('normal');
    });

    it('should return warning for 155 (between normal and warning upper)', () => {
      expect(getVitalStatus('systolic_bp', 155)).toBe('warning');
    });

    it('should return warning for 85 (between warning and normal lower)', () => {
      expect(getVitalStatus('systolic_bp', 85)).toBe('warning');
    });

    it('should return warning for 170 (between warning and critical upper)', () => {
      expect(getVitalStatus('systolic_bp', 170)).toBe('warning');
    });

    it('should return critical for 200 (above critical upper 180)', () => {
      expect(getVitalStatus('systolic_bp', 200)).toBe('critical');
    });

    it('should return critical for 60 (below critical lower 70)', () => {
      expect(getVitalStatus('systolic_bp', 60)).toBe('critical');
    });
  });

  describe('heart_rate', () => {
    it('should return normal for 75', () => {
      expect(getVitalStatus('heart_rate', 75)).toBe('normal');
    });

    it('should return warning for 110', () => {
      expect(getVitalStatus('heart_rate', 110)).toBe('warning');
    });

    it('should return critical for 160', () => {
      expect(getVitalStatus('heart_rate', 160)).toBe('critical');
    });
  });

  describe('temperature', () => {
    it('should return normal for 36.5', () => {
      expect(getVitalStatus('temperature', 36.5)).toBe('normal');
    });

    it('should return warning for 37.8', () => {
      expect(getVitalStatus('temperature', 37.8)).toBe('warning');
    });

    it('should return critical for 39.5', () => {
      expect(getVitalStatus('temperature', 39.5)).toBe('critical');
    });
  });

  describe('spo2', () => {
    it('should return normal for 98', () => {
      expect(getVitalStatus('spo2', 98)).toBe('normal');
    });

    it('should return warning for 92', () => {
      expect(getVitalStatus('spo2', 92)).toBe('warning');
    });

    it('should return critical for 83', () => {
      expect(getVitalStatus('spo2', 83)).toBe('critical');
    });
  });

  describe('blood_sugar', () => {
    it('should return normal for 100', () => {
      expect(getVitalStatus('blood_sugar', 100)).toBe('normal');
    });

    it('should return warning for 180', () => {
      expect(getVitalStatus('blood_sugar', 180)).toBe('warning');
    });

    it('should return critical for 350', () => {
      expect(getVitalStatus('blood_sugar', 350)).toBe('critical');
    });
  });
});

describe('getVitalStatusColor', () => {
  it('should return green for normal', () => {
    expect(getVitalStatusColor('normal')).toBe('#22C55E');
  });

  it('should return amber for warning', () => {
    expect(getVitalStatusColor('warning')).toBe('#F59E0B');
  });

  it('should return red for critical', () => {
    expect(getVitalStatusColor('critical')).toBe('#EF4444');
  });
});

describe('getVitalStatusLabel', () => {
  it('should return 정상 for normal', () => {
    expect(getVitalStatusLabel('normal')).toBe('정상');
  });

  it('should return 주의 for warning', () => {
    expect(getVitalStatusLabel('warning')).toBe('주의');
  });

  it('should return 위험 for critical', () => {
    expect(getVitalStatusLabel('critical')).toBe('위험');
  });
});
