import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { FileText, ChevronRight, Clock, Bot } from '@/components/icons/TabIcons';
import { useState } from 'react';

export default function AIReportListScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const [refreshing, setRefreshing] = useState(false);

  // 연결된 환자 ID
  const { data: patients } = useQuery({
    queryKey: ['guardian-patients', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('guardian_patient_links')
        .select('patient:patients(id, name)')
        .eq('guardian_id', userId);
      if (error) throw error;
      return data?.map((d: any) => d.patient) ?? [];
    },
    enabled: !!userId,
  });

  const patientId = patients?.[0]?.id;

  const {
    data: reports,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['ai-reports', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!patientId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      generated: { label: '생성완료', color: Colors.secondary, bg: `${Colors.secondary}15` },
      pending: { label: '생성중', color: '#F59E0B', bg: '#FEF3C7' },
      reviewed: { label: '검토완료', color: Colors.primary, bg: `${Colors.primary}15` },
    };
    return map[status] ?? map.generated;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'AI 리포트' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Bot color={Colors.onPrimary} size={28} />
          </View>
          <Text style={styles.headerTitle}>AI 건강 분석 리포트</Text>
          <Text style={styles.headerSubtitle}>
            방문 기록을 기반으로 AI가 분석한 건강 리포트입니다
          </Text>
        </View>

        {/* 리포트 리스트 */}
        <View style={styles.section}>
          {isLoading ? (
            <ActivityIndicator
              color={Colors.secondary}
              style={{ paddingVertical: Spacing.xxxl }}
            />
          ) : reports && reports.length > 0 ? (
            <View style={styles.reportList}>
              {reports.map((report: any) => {
                const statusCfg = getStatusConfig(report.status);
                return (
                  <TouchableOpacity
                    key={report.id}
                    style={styles.reportCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      router.push(`/patient/ai-report/${report.id}`)
                    }
                  >
                    <View style={styles.reportLeft}>
                      <View style={styles.reportIconWrap}>
                        <FileText color={Colors.primary} size={20} />
                      </View>
                    </View>
                    <View style={styles.reportContent}>
                      <View style={styles.reportHeader}>
                        <Text style={styles.reportTitle}>
                          {report.title ?? '건강 분석 리포트'}
                        </Text>
                        <View
                          style={[
                            styles.statusChip,
                            { backgroundColor: statusCfg.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: statusCfg.color },
                            ]}
                          >
                            {statusCfg.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.reportPeriod}>
                        {report.period_start && report.period_end
                          ? `${report.period_start} ~ ${report.period_end}`
                          : new Date(report.created_at).toLocaleDateString('ko-KR')}
                      </Text>
                    </View>
                    <ChevronRight color={Colors.onSurfaceVariant} size={18} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Clock color={Colors.onSurfaceVariant} size={32} />
              <Text style={styles.emptyText}>
                아직 생성된 리포트가 없습니다
              </Text>
              <Text style={styles.emptySubtext}>
                방문 기록이 쌓이면 AI가 자동으로 분석합니다
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  headerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  section: {
    paddingHorizontal: Spacing.xl,
  },

  reportList: {
    gap: Spacing.md,
  },
  reportCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  reportLeft: {
    marginRight: Spacing.lg,
  },
  reportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportContent: {
    flex: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  reportTitle: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  reportPeriod: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },

  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  emptyText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  emptySubtext: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
