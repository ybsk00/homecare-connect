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
import { Button } from '@/components/ui/Button';
import { Badge, getRequestStatusVariant } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useServiceRequests } from '@/hooks/useMatching';
import { usePatientStore } from '@/stores/patient-store';
import { colors, spacing, radius, shadows, typography } from '@/constants/theme';
import { formatRequestStatus, formatRelativeTime, formatServiceType } from '@homecare/shared-utils';
import type { Tables } from '@homecare/shared-types';

type ServiceRequestWithRelations = Tables<'service_requests'> & {
  patient?: { full_name: string } | null;
  selected_org?: { name: string } | null;
};

export default function MatchingScreen() {
  const router = useRouter();
  const patients = usePatientStore((s) => s.patients);
  const requestsQuery = useServiceRequests();

  const requests = requestsQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={requestsQuery.isRefetching}
            onRefresh={() => requestsQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* CTA Card */}
        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>새로운 매칭 요청</Text>
          <Text style={styles.actionDesc}>
            AI가 환자에게 최적의 방문 의료 기관을 추천해 드립니다
          </Text>
          <Button
            title="매칭 요청하기"
            onPress={() => router.push('/matching/request')}
            fullWidth
            disabled={patients.length === 0}
          />
          {patients.length === 0 && (
            <Text style={styles.disabledHint}>
              먼저 환자를 등록해주세요
            </Text>
          )}
        </Card>

        {/* Request history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>매칭 요청 이력</Text>
          {requestsQuery.isLoading ? (
            <Loading />
          ) : requests.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="매칭 요청 내역이 없습니다"
              description="매칭 요청을 하면 AI가 최적의 기관을 추천합니다"
            />
          ) : (
            (requests as any[]).map((req: ServiceRequestWithRelations) => (
              <TouchableOpacity
                key={req.id}
                onPress={() => {
                  if (req.status === 'waiting_selection') {
                    router.push(`/matching/results?requestId=${req.id}&patientId=${req.patient_id}`);
                  }
                }}
                activeOpacity={0.7}
              >
                <Card style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestPatient}>
                      {req.patient?.full_name ?? '환자'}
                    </Text>
                    <Badge
                      text={formatRequestStatus(req.status)}
                      variant={getRequestStatusVariant(req.status)}
                    />
                  </View>
                  <View style={styles.requestServices}>
                    {req.requested_services?.map((svc: string) => (
                      <Badge key={svc} text={formatServiceType(svc)} variant="primary" />
                    ))}
                  </View>
                  {req.selected_org && (
                    <Text style={styles.requestOrg}>
                      선택 기관: {req.selected_org.name}
                    </Text>
                  )}
                  <Text style={styles.requestTime}>
                    {formatRelativeTime(req.created_at)}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl + 40 },

  actionCard: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.xl,
  },
  actionTitle: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  actionDesc: {
    ...typography.koreanCaption,
    marginBottom: spacing.xl,
  },
  disabledHint: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    marginBottom: spacing.lg,
  },

  requestCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requestPatient: {
    ...typography.bodyBold,
  },
  requestServices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  requestOrg: {
    ...typography.small,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  requestTime: {
    ...typography.small,
  },
});
