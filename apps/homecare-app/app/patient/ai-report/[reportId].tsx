import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Bot, Activity, FileText, AlertTriangle, Shield } from '@/components/icons/TabIcons';

export default function AIReportDetailScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const { data: report, isLoading } = useQuery({
    queryKey: ['ai-report-detail', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      const { data, error } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!reportId,
  });

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'AI 리포트' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <Stack.Screen options={{ title: 'AI 리포트' }} />
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>리포트를 찾을 수 없습니다</Text>
        </View>
      </>
    );
  }

  const analysis = (report as any).analysis ?? {};
  const vitalChanges = analysis.vital_changes ?? [];
  const doctorNote = (report as any).doctor_note;

  return (
    <>
      <Stack.Screen options={{ title: report.title ?? 'AI 리포트' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 리포트 헤더 */}
        <View style={styles.section}>
          <View style={styles.heroCard}>
            <View style={styles.heroIconWrap}>
              <Bot color={Colors.onPrimary} size={28} />
            </View>
            <Text style={styles.heroTitle}>
              {report.title ?? '건강 분석 리포트'}
            </Text>
            <Text style={styles.heroPeriod}>
              {report.period_start && report.period_end
                ? `${report.period_start} ~ ${report.period_end}`
                : new Date(report.created_at).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        </View>

        {/* AI 요약 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bot color={Colors.secondary} size={20} />
            <Text style={styles.sectionTitle}>AI 요약</Text>
          </View>
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>
              {report.summary ??
                analysis.summary ??
                'AI 분석 결과가 아직 생성되지 않았습니다.'}
            </Text>
          </View>
        </View>

        {/* 바이탈 변화 분석 */}
        {vitalChanges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Activity color={Colors.primary} size={20} />
              <Text style={styles.sectionTitle}>바이탈 변화 분석</Text>
            </View>
            <View style={styles.vitalChangeList}>
              {vitalChanges.map((change: any, idx: number) => (
                <View key={idx} style={styles.vitalChangeCard}>
                  <Text style={styles.vitalChangeName}>
                    {change.name ?? `지표 ${idx + 1}`}
                  </Text>
                  <View style={styles.vitalChangeRow}>
                    <View style={styles.vitalChangeValues}>
                      <Text style={styles.vitalChangePrev}>
                        {change.previous ?? '-'}
                      </Text>
                      <Text style={styles.vitalChangeArrow}> → </Text>
                      <Text
                        style={[
                          styles.vitalChangeCurrent,
                          {
                            color: change.trend === 'improved'
                              ? Colors.secondary
                              : change.trend === 'worsened'
                              ? Colors.error
                              : Colors.onSurface,
                          },
                        ]}
                      >
                        {change.current ?? '-'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.trendChip,
                        {
                          backgroundColor:
                            change.trend === 'improved'
                              ? `${Colors.secondary}15`
                              : change.trend === 'worsened'
                              ? `${Colors.error}15`
                              : `${Colors.onSurfaceVariant}15`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.trendText,
                          {
                            color:
                              change.trend === 'improved'
                                ? Colors.secondary
                                : change.trend === 'worsened'
                                ? Colors.error
                                : Colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {change.trend === 'improved'
                          ? '개선'
                          : change.trend === 'worsened'
                          ? '악화'
                          : '유지'}
                      </Text>
                    </View>
                  </View>
                  {change.note && (
                    <Text style={styles.vitalChangeNote}>{change.note}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 의사 소견 */}
        {doctorNote && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText color={Colors.primary} size={20} />
              <Text style={styles.sectionTitle}>의사 소견</Text>
            </View>
            <View style={styles.contentCard}>
              <Text style={styles.contentText}>{doctorNote}</Text>
            </View>
          </View>
        )}

        {/* 면책 고지 */}
        <View style={styles.section}>
          <View style={styles.disclaimerCard}>
            <AlertTriangle color={Colors.onSurfaceVariant} size={18} />
            <Text style={styles.disclaimerText}>
              본 리포트는 AI에 의해 자동 생성되었으며 의학적 진단을 대체하지
              않습니다. 정확한 진단 및 치료는 담당 의사와 상담하시기 바랍니다.
            </Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },

  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },

  // Hero
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginTop: Spacing.lg,
    ...Shadows.hero,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
    textAlign: 'center',
  },
  heroPeriod: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    marginTop: Spacing.xs,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Content
  contentCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },
  contentText: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
    lineHeight: 26,
  },

  // Vital Changes
  vitalChangeList: {
    gap: Spacing.md,
  },
  vitalChangeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  vitalChangeName: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  vitalChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitalChangeValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vitalChangePrev: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  vitalChangeArrow: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
  vitalChangeCurrent: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
  },
  trendChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  trendText: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  vitalChangeNote: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  disclaimerText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },

  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
});
