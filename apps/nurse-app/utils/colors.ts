import { Colors } from '@/constants/theme';
import type { VitalStatus } from '@homecare/shared-utils';

/**
 * VitalStatus에 따른 Curated Sanctuary 디자인 시스템 색상을 반환합니다.
 */
export function getSanctuaryVitalColor(status: VitalStatus): string {
  switch (status) {
    case 'normal':
      return Colors.secondary; // teal
    case 'warning':
      return Colors.warning; // warm brown/amber
    case 'critical':
      return Colors.error; // warm red
    default:
      return Colors.onSurfaceVariant;
  }
}
