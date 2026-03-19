import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { Badge, getVisitStatusVariant } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { usePatientsList } from '@/hooks/usePatients';
import { useTodayVisits, useUpcomingVisits } from '@/hooks/useVisits';
import { usePatientStore } from '@/stores/patient-store';
import { colors, spacing, radius, shadows, typography } from '@/constants/theme';
import {
  formatVisitStatus,
  formatDateWithDay,
  formatServiceType,
} from '@homecare/shared-utils';
import type { Tables } from '@homecare/shared-types';

type VisitWithNurse = Tables<'visits'> & {
  nurse?: {
    id: string;
    staff_type: string;
    user?: { full_name: string; avatar_url: string | null } | null;
  } | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const patientsQuery = usePatientsList();
  const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
  const patients = usePatientStore((s) => s.patients);
  const todayVisits = useTodayVisits();
  const upcomingVisits = useUpcomingVisits(selectedPatientId);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const isRefreshing =
    patientsQuery.isRefetching || todayVisits.isRefetching || upcomingVisits.isRefetching;

  const onRefresh = () => {
    patientsQuery.refetch();
    todayVisits.refetch();
    upcomingVisits.refetch();
  };

  if (patientsQuery.isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting + Notification bell */}
        <View style={styles.greeting}>
          <View>
            <Text style={styles.greetingText}>
              안녕하세요, {profile?.full_name ?? '보호자'}님
            </Text>
            <Text style={styles.greetingSubtitle}>오늘의 케어 일정을 확인하세요.</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.bellButton}
          >
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {patients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="👨‍👩‍👦"
              title="등록된 환자가 없습니다"
              description="환자를 등록하면 방문 서비스를 신청할 수 있어요"
              actionLabel="환자 등록하기"
              onAction={() => router.push('/patient/register')}
            />
          </Card>
        ) : (
          <>
            {/* TODAY'S VISIT - Navy gradient card */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>오늘의 방문</Text>
              {todayVisits.isLoading ? (
                <Loading message="방문 정보 로딩..." size="small" />
              ) : todayVisits.data?.data && todayVisits.data.data.length > 0 ? (
                (todayVisits.data.data as any[]).map((visit: VisitWithNurse) => {
                  const nurseName = visit.nurse?.user?.full_name;
                  const statusLabel = formatVisitStatus(visit.status);
                  return (
                    <TouchableOpacity
                      key={visit.id}
                      onPress={() => router.push(`/visit/${visit.id}`)}
                      activeOpacity={0.85}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.primaryContainer]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.todayCard}
                      >
                        {/* Status badge */}
                        <View style={styles.todayHeader}>
                          <View style={styles.todayStatusBadge}>
                            <Text style={styles.todayStatusText}>{statusLabel}</Text>
                          </View>
                          <Text style={styles.todayTime}>
                            {visit.scheduled_time ?? '시간 미정'}
                          </Text>
                        </View>

                        {nurseName && (
                          <Text style={styles.todayNurse}>{nurseName} 간호사</Text>
                        )}
                        <Text style={styles.todayDuration}>
                          예상 {visit.estimated_duration_min}분 소요
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Card>
                  <Text style={styles.noVisit}>오늘 예정된 방문이 없습니다</Text>
                </Card>
              )}
            </View>

            {/* 최근 건강 지표 - White cards with vitality chips */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>최근 건강 지표</Text>
              <View style={styles.healthGrid}>
                <Card style={styles.healthCard}>
                  <Text style={styles.healthLabel}>혈압</Text>
                  <Text style={styles.healthValue}>120/80</Text>
                  <Text style={styles.healthUnit}>mmHg</Text>
                  <View style={styles.normalChip}>
                    <Text style={styles.normalChipText}>정상</Text>
                  </View>
                </Card>
                <Card style={styles.healthCard}>
                  <Text style={styles.healthLabel}>체온</Text>
                  <Text style={styles.healthValue}>36.5</Text>
                  <Text style={styles.healthUnit}>°C</Text>
                  <View style={styles.normalChip}>
                    <Text style={styles.normalChipText}>정상</Text>
                  </View>
                </Card>
              </View>
            </View>

            {/* 다음 정기 검진 */}
            {selectedPatient && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>다음 정기 검진</Text>
                <TouchableOpacity
                  onPress={() => router.push(`/patient/${selectedPatient.id}`)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.checkupCard}>
                    <View style={styles.checkupDateCol}>
                      <Text style={styles.checkupMonth}>3월</Text>
                      <Text style={styles.checkupDay}>25</Text>
                    </View>
                    <View style={styles.checkupInfo}>
                      <Text style={styles.checkupTitle}>{selectedPatient.full_name} 님</Text>
                      <Text style={styles.checkupDesc}>
                        {selectedPatient.care_grade
                          ? `${selectedPatient.care_grade === 'cognitive' ? '인지지원' : selectedPatient.care_grade}등급`
                          : '정기 검진'}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              </View>
            )}

            {/* 최근 케어 기록 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>최근 케어 기록</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/records')}>
                  <Text style={styles.seeAll}>전체 보기</Text>
                </TouchableOpacity>
              </View>
              {upcomingVisits.isLoading ? (
                <Loading size="small" />
              ) : upcomingVisits.data && upcomingVisits.data.length > 0 ? (
                (upcomingVisits.data as any[]).slice(0, 3).map((visit: VisitWithNurse) => (
                  <TouchableOpacity
                    key={visit.id}
                    onPress={() => router.push(`/visit/${visit.id}`)}
                    activeOpacity={0.7}
                  >
                    <Card style={styles.recentCard}>
                      <View style={styles.recentRow}>
                        {/* Timeline dot */}
                        <View style={styles.recentDot} />
                        <View style={styles.recentContent}>
                          <Text style={styles.recentDate}>
                            {formatDateWithDay(visit.scheduled_date)}
                            {visit.scheduled_time ? ` ${visit.scheduled_time}` : ''}
                          </Text>
                          <Badge
                            text={formatVisitStatus(visit.status)}
                            variant={getVisitStatusVariant(visit.status)}
                          />
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              ) : (
                <Card>
                  <Text style={styles.noVisit}>예정된 방문이 없습니다</Text>
                </Card>
              )}
            </View>

            {/* Quick menu */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>빠른 메뉴</Text>
              <View style={styles.quickMenu}>
                <TouchableOpacity
                  style={styles.quickItem}
                  onPress={() => router.push('/matching/request')}
                >
                  <Text style={styles.quickIcon}>🏥</Text>
                  <Text style={styles.quickLabel}>매칭 요청</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickItem}
                  onPress={() => router.push('/(tabs)/records')}
                >
                  <Text style={styles.quickIcon}>📝</Text>
                  <Text style={styles.quickLabel}>방문 기록</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickItem}
                  onPress={() => router.push('/chat')}
                >
                  <Text style={styles.quickIcon}>💬</Text>
                  <Text style={styles.quickLabel}>AI 상담</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickItem}
                  onPress={() => router.push('/patient/register')}
                >
                  <Text style={styles.quickIcon}>➕</Text>
                  <Text style={styles.quickLabel}>환자 등록</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl + 40 },

  // Greeting
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  greetingText: {
    ...typography.title,
  },
  greetingSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.ambient,
  },
  bellIcon: { fontSize: 20 },

  emptyCard: { marginBottom: spacing.xl },

  // Section
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    marginBottom: spacing.lg,
  },
  seeAll: {
    ...typography.captionMedium,
    color: colors.secondary,
    marginBottom: spacing.lg,
  },

  // Today's visit - navy gradient card
  todayCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.sm,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  todayStatusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  todayStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  todayTime: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  todayNurse: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onPrimary,
    marginBottom: spacing.xs,
  },
  todayDuration: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Health indicators
  healthGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  healthCard: {
    flex: 1,
    padding: spacing.lg,
  },
  healthLabel: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  healthValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
  },
  healthUnit: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  normalChip: {
    backgroundColor: colors.vital.normal.bg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  normalChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.vital.normal.text,
  },

  // Checkup card
  checkupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  checkupDateCol: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkupMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
  checkupDay: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: -2,
  },
  checkupInfo: {
    flex: 1,
  },
  checkupTitle: {
    ...typography.bodyBold,
  },
  checkupDesc: {
    ...typography.small,
    marginTop: spacing.xs,
  },

  // Recent care records
  recentCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  recentContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentDate: {
    ...typography.label,
    fontSize: 14,
  },

  noVisit: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },

  // Quick menu
  quickMenu: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickItem: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    paddingVertical: spacing.lg + 4,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  quickIcon: { fontSize: 28, marginBottom: spacing.sm },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
});
