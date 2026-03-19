import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { VisitTimeline } from '@/components/visit/VisitTimeline';
import { usePatientStore } from '@/stores/patient-store';
import { useVisitsByPatient } from '@/hooks/useVisits';
import { colors, spacing, typography } from '@/constants/theme';
import type { Tables } from '@homecare/shared-types';

type Visit = Tables<'visits'>;

export default function RecordsScreen() {
  const router = useRouter();
  const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
  const patients = usePatientStore((s) => s.patients);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const visitsQuery = useVisitsByPatient(selectedPatientId, 30, 0);

  const completedVisits = ((visitsQuery.data?.data ?? []) as any[]).filter(
    (v: Visit) => v.status === 'completed' || v.status === 'checked_out',
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={visitsQuery.isRefetching}
            onRefresh={() => visitsQuery.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {!selectedPatientId ? (
          <EmptyState
            icon="👤"
            title="환자를 먼저 등록해주세요"
            actionLabel="환자 등록"
            onAction={() => router.push('/patient/register')}
          />
        ) : (
          <>
            {selectedPatient && (
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>
                  {selectedPatient.full_name} 님의 방문 기록
                </Text>
                <Text style={styles.totalCount}>
                  총 {visitsQuery.data?.count ?? 0}건
                </Text>
              </View>
            )}

            {visitsQuery.isLoading ? (
              <Loading />
            ) : completedVisits.length === 0 ? (
              <EmptyState
                icon="📋"
                title="방문 기록이 없습니다"
                description="완료된 방문이 있으면 여기에 기록이 표시됩니다"
              />
            ) : (
              <VisitTimeline
                visits={completedVisits}
                onVisitPress={(id) => router.push(`/visit/${id}`)}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl + 40,
  },
  patientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  patientName: {
    ...typography.bodyBold,
  },
  totalCount: {
    ...typography.caption,
  },
});
