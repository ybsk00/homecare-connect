import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useServicePlansByPatient } from '@/hooks/useServicePlans';
import { usePatientStore } from '@/stores/patient-store';
import { colors, spacing, typography } from '@/constants/theme';

function getPlanStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return '작성 중';
    case 'pending_consent':
      return '동의 대기';
    case 'active':
      return '진행 중';
    case 'completed':
      return '완료';
    case 'suspended':
      return '중단';
    default:
      return status;
  }
}

function getPlanStatusVariant(status: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'pending_consent':
      return 'warning';
    case 'active':
      return 'success';
    case 'completed':
      return 'info';
    case 'suspended':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function ServicePlanListScreen() {
  const router = useRouter();
  const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
  const plansQuery = useServicePlansByPatient(selectedPatientId);
  const plans = (plansQuery.data ?? []) as any[];

  if (plansQuery.isLoading) {
    return <Loading fullScreen message="서비스 계획 불러오는 중..." />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={plansQuery.isRefetching}
            onRefresh={() => plansQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="서비스 계획이 없습니다"
            description="매칭이 완료되면 서비스 계획이 생성됩니다"
          />
        }
        renderItem={({ item }) => {
          const org = item.organization;
          const orgName = Array.isArray(org) ? org[0]?.name : org?.name;
          const nurse = item.nurse;
          const nurseProfile = nurse?.user;
          const nurseName = Array.isArray(nurseProfile)
            ? nurseProfile[0]?.full_name
            : nurseProfile?.full_name;

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/service-plan/${item.id}`)}
            >
              <Card style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planInfo}>
                    {orgName && <Text style={styles.orgName}>{orgName}</Text>}
                    {nurseName && (
                      <Text style={styles.nurseName}>담당: {nurseName}</Text>
                    )}
                  </View>
                  <Badge
                    text={getPlanStatusLabel(item.status)}
                    variant={getPlanStatusVariant(item.status)}
                  />
                </View>
                <Text style={styles.dateText}>
                  {new Date(item.created_at).toLocaleDateString('ko-KR')}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  planCard: { marginBottom: spacing.md },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  planInfo: { flex: 1, marginRight: spacing.sm },
  orgName: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  nurseName: {
    ...typography.caption,
  },
  dateText: {
    ...typography.small,
  },
});
