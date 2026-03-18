import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { formatCareGrade, formatMobility } from '@homecare/shared-utils';
import {
  getVitalStatus,
  getVitalTypeLabel,
  getVitalUnit,
  type VitalRanges,
} from '@homecare/shared-utils';

function getSanctuaryVitalColor(status: string): string {
  switch (status) {
    case 'normal':
      return Colors.secondary;
    case 'warning':
    case 'caution':
      return Colors.tertiary;
    case 'critical':
    case 'danger':
      return '#BA1A1A';
    default:
      return Colors.onSurfaceVariant;
  }
}

export default function PatientsScreen() {
  const staffInfo = useAuthStore((s) => s.staffInfo);

  const query = useQuery({
    queryKey: ['nursePatients', staffInfo?.id],
    queryFn: async () => {
      if (!staffInfo?.id) return [];

      const { data: plans, error } = await supabase
        .from('service_plans')
        .select(
          `
          id,
          patient:patients (
            id,
            full_name,
            birth_date,
            gender,
            address,
            care_grade,
            mobility,
            primary_diagnosis,
            status
          )
        `,
        )
        .eq('nurse_id', staffInfo.id)
        .eq('status', 'active');

      if (error) throw error;

      const patients = (plans ?? [])
        .map((p: any) => p.patient)
        .filter(Boolean);

      const uniquePatients = Array.from(
        new Map(patients.map((p: any) => [p.id, p])).values(),
      ) as any[];

      const patientIds = uniquePatients.map((p: any) => p.id);
      const { data: recentRecords } = await supabase
        .from('visit_records')
        .select('patient_id, vitals, created_at')
        .in('patient_id', patientIds)
        .order('created_at', { ascending: false })
        .limit(patientIds.length);

      const vitalsMap = new Map<string, any>();
      for (const record of recentRecords ?? []) {
        if (!vitalsMap.has(record.patient_id)) {
          vitalsMap.set(record.patient_id, record.vitals);
        }
      }

      return uniquePatients.map((p: any) => ({
        ...p,
        latestVitals: vitalsMap.get(p.id) ?? null,
      }));
    },
    enabled: !!staffInfo?.id,
  });

  if (query.isLoading) {
    return <Loading message={'\uB2F4\uB2F9 \uD658\uC790 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...'} />;
  }

  const patients = query.data ?? [];

  const renderVitalChip = (
    type: keyof VitalRanges,
    value: number | undefined,
  ) => {
    if (value === undefined) return null;
    const status = getVitalStatus(type, value);
    const color = getSanctuaryVitalColor(status);
    const label = getVitalTypeLabel(type);
    const unit = getVitalUnit(type);

    return (
      <View
        key={type}
        style={[styles.vitalChip, { backgroundColor: `${color}15` }]}
      >
        <Text style={[styles.vitalValue, { color }]}>
          {value}
          <Text style={styles.vitalUnit}> {unit}</Text>
        </Text>
        <Text style={styles.vitalLabel}>{label}</Text>
      </View>
    );
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={patients}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <Card style={styles.patientCard}>
            <View style={styles.patientHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.full_name.charAt(0)}
                </Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{item.full_name}</Text>
                <Text style={styles.patientMeta}>
                  {calculateAge(item.birth_date)}{'\uC138'} /{' '}
                  {item.gender === 'male' ? '\uB0A8' : '\uC5EC'}
                </Text>
              </View>
              <View style={styles.headerBadges}>
                {item.care_grade && (
                  <Badge
                    label={formatCareGrade(item.care_grade)}
                    variant="teal"
                    size="sm"
                  />
                )}
                {item.mobility && (
                  <Badge
                    label={formatMobility(item.mobility)}
                    variant="navy"
                    size="sm"
                  />
                )}
              </View>
            </View>

            {item.primary_diagnosis && (
              <Text style={styles.diagnosis} numberOfLines={1}>
                {item.primary_diagnosis}
              </Text>
            )}

            {item.latestVitals && (
              <View style={styles.vitalsRow}>
                {renderVitalChip('systolic_bp', item.latestVitals.systolic_bp)}
                {renderVitalChip('heart_rate', item.latestVitals.heart_rate)}
                {renderVitalChip('temperature', item.latestVitals.temperature)}
                {renderVitalChip('spo2', item.latestVitals.spo2)}
              </View>
            )}

            <Text style={styles.address} numberOfLines={1}>
              {item.address}
            </Text>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={query.refetch}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBar}>
            <Text style={styles.headerTitle}>{'\uB2F4\uB2F9 \uD658\uC790'}</Text>
            <Text style={styles.headerCount}>{patients.length}{'\uBA85'}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {'\uB2F4\uB2F9 \uD658\uC790\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {'\uD658\uC790\uAC00 \uBC30\uC815\uB418\uBA74 \uC5EC\uAE30\uC5D0 \uD45C\uC2DC\uB429\uB2C8\uB2E4.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.onSurface,
  },
  headerCount: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  patientCard: {
    marginBottom: Spacing.lg,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 32, 69, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  patientMeta: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: 'column',
    gap: Spacing.xs,
    alignItems: 'flex-end',
  },
  diagnosis: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  vitalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  vitalChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  vitalValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  vitalUnit: {
    fontSize: FontSize.xs,
    fontWeight: '400',
  },
  vitalLabel: {
    fontSize: 9,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  address: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
  },
});
