import { describe, it, expect } from 'vitest';
import {
  formatPhoneNumber,
  formatRelativeTime,
  formatCareGrade,
  formatDistance,
  formatDuration,
  formatServiceType,
} from '../format';

describe('formatPhoneNumber', () => {
  it('should format 11-digit mobile number', () => {
    expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
  });

  it('should format 10-digit mobile number', () => {
    expect(formatPhoneNumber('0101234567')).toBe('010-123-4567');
  });

  it('should format Seoul landline (10 digits)', () => {
    expect(formatPhoneNumber('0212345678')).toBe('02-1234-5678');
  });

  it('should format Seoul landline (9 digits)', () => {
    expect(formatPhoneNumber('021234567')).toBe('02-123-4567');
  });

  it('should strip non-digit characters before formatting', () => {
    expect(formatPhoneNumber('010-1234-5678')).toBe('010-1234-5678');
  });

  it('should return original string for unrecognized format', () => {
    expect(formatPhoneNumber('123')).toBe('123');
  });
});

describe('formatRelativeTime', () => {
  it('should return 방금 전 for less than 60 seconds ago', () => {
    const now = new Date();
    const thirtySecsAgo = new Date(now.getTime() - 30 * 1000);
    expect(formatRelativeTime(thirtySecsAgo)).toBe('방금 전');
  });

  it('should return N분 전 for minutes ago', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo)).toBe('5분 전');
  });

  it('should return N시간 전 for hours ago', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toBe('3시간 전');
  });

  it('should return 어제 for 1 day ago', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(oneDayAgo)).toBe('어제');
  });

  it('should return N일 전 for 2-6 days ago', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3일 전');
  });

  it('should return N주 전 for 7-29 days ago', () => {
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoWeeksAgo)).toBe('2주 전');
  });

  it('should accept string date input', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinAgo.toISOString())).toBe('5분 전');
  });
});

describe('formatCareGrade', () => {
  it('should format numeric grade', () => {
    expect(formatCareGrade('1')).toBe('1등급');
    expect(formatCareGrade('3')).toBe('3등급');
    expect(formatCareGrade('5')).toBe('5등급');
  });

  it('should format cognitive grade', () => {
    expect(formatCareGrade('cognitive')).toBe('인지지원등급');
  });
});

describe('formatDistance', () => {
  it('should format km distances', () => {
    expect(formatDistance(2.3)).toBe('2.3km');
  });

  it('should format sub-km distances in meters', () => {
    expect(formatDistance(0.5)).toBe('500m');
  });

  it('should format exactly 1km', () => {
    expect(formatDistance(1)).toBe('1.0km');
  });
});

describe('formatDuration', () => {
  it('should format minutes only', () => {
    expect(formatDuration(30)).toBe('30분');
  });

  it('should format exact hours', () => {
    expect(formatDuration(120)).toBe('2시간');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(65)).toBe('1시간 5분');
  });
});

describe('formatServiceType', () => {
  it('should return Korean labels for known types', () => {
    expect(formatServiceType('nursing')).toBe('방문간호');
    expect(formatServiceType('physio')).toBe('방문재활');
    expect(formatServiceType('bath')).toBe('방문목욕');
    expect(formatServiceType('care')).toBe('방문요양');
    expect(formatServiceType('doctor_visit')).toBe('의사방문');
  });

  it('should return the original string for unknown types', () => {
    expect(formatServiceType('unknown')).toBe('unknown');
  });
});
