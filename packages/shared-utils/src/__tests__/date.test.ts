import { describe, it, expect } from 'vitest';
import { toDateString, isToday, addDays, diffDays, getWeekRange, getVisitDayLabel } from '../date';

describe('toDateString', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date(2026, 2, 18); // March 18, 2026
    expect(toDateString(date)).toBe('2026-03-18');
  });

  it('should pad single-digit month and day', () => {
    const date = new Date(2026, 0, 5); // January 5, 2026
    expect(toDateString(date)).toBe('2026-01-05');
  });

  it('should handle December correctly', () => {
    const date = new Date(2026, 11, 31); // December 31, 2026
    expect(toDateString(date)).toBe('2026-12-31');
  });
});

describe('isToday', () => {
  it('should return true for today', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('should return false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  it('should return false for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow)).toBe(false);
  });

  it('should accept string date input', () => {
    const todayStr = new Date().toISOString();
    expect(isToday(todayStr)).toBe(true);
  });

  it('should return false for a different year same month/day', () => {
    const now = new Date();
    const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    expect(isToday(lastYear)).toBe(false);
  });
});

describe('addDays', () => {
  it('should add days to a Date', () => {
    const date = new Date(2026, 2, 18); // March 18
    const result = addDays(date, 3);
    expect(result.getDate()).toBe(21);
    expect(result.getMonth()).toBe(2); // still March
  });

  it('should handle month rollover', () => {
    const date = new Date(2026, 2, 30); // March 30
    const result = addDays(date, 3);
    expect(result.getMonth()).toBe(3); // April
    expect(result.getDate()).toBe(2);
  });

  it('should subtract days when negative', () => {
    const date = new Date(2026, 2, 18); // March 18
    const result = addDays(date, -5);
    expect(result.getDate()).toBe(13);
  });

  it('should accept string date input', () => {
    const result = addDays('2026-03-18', 1);
    expect(result.getDate()).toBe(19);
  });

  it('should not mutate the original Date', () => {
    const date = new Date(2026, 2, 18);
    addDays(date, 5);
    expect(date.getDate()).toBe(18);
  });
});

describe('diffDays', () => {
  it('should return 0 for same date', () => {
    const date = new Date(2026, 2, 18);
    expect(diffDays(date, date)).toBe(0);
  });

  it('should return absolute difference', () => {
    const a = new Date(2026, 2, 18);
    const b = new Date(2026, 2, 21);
    expect(diffDays(a, b)).toBe(3);
    expect(diffDays(b, a)).toBe(3); // order doesn't matter
  });

  it('should accept string dates', () => {
    expect(diffDays('2026-03-18', '2026-03-20')).toBe(2);
  });
});

describe('getWeekRange', () => {
  it('should return Monday to Sunday range', () => {
    // March 18, 2026 is a Wednesday
    const date = new Date(2026, 2, 18);
    const range = getWeekRange(date);
    expect(range.start).toBe('2026-03-16'); // Monday
    expect(range.end).toBe('2026-03-22'); // Sunday
  });

  it('should handle Sunday correctly (start of week is previous Monday)', () => {
    // March 22, 2026 is a Sunday
    const date = new Date(2026, 2, 22);
    const range = getWeekRange(date);
    expect(range.start).toBe('2026-03-16'); // Monday
    expect(range.end).toBe('2026-03-22'); // Sunday
  });

  it('should handle Monday (start of week)', () => {
    // March 16, 2026 is a Monday
    const date = new Date(2026, 2, 16);
    const range = getWeekRange(date);
    expect(range.start).toBe('2026-03-16');
    expect(range.end).toBe('2026-03-22');
  });
});

describe('getVisitDayLabel', () => {
  it('should return Korean day labels', () => {
    expect(getVisitDayLabel(0)).toBe('일');
    expect(getVisitDayLabel(1)).toBe('월');
    expect(getVisitDayLabel(6)).toBe('토');
  });

  it('should return empty string for invalid day', () => {
    expect(getVisitDayLabel(7)).toBe('');
  });
});
