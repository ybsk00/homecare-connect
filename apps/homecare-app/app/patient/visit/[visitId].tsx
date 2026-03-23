import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Avatars } from '@/constants/avatars';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import {
  Calendar,
  Clock,
  Activity,
  Heart,
  Shield,
  CheckCircle,
  User,
  MessageCircle,
} from '@/components/icons/TabIcons';

export default function VisitDetailScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();

  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit-detail', visitId],
    queryFn: async () => {
      if (!visitId) return null;
      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          nurse:staff(user:profiles(full_name, avatar_url)),
          patient:patients(name, gender)
        `)
        .eq('id', visitId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  // 방문 기록
  const { data: visitRecord } = useQuery({
    queryKey: ['visit-record', visitId],
    queryFn: async () => {
      if (!visitId) return null;
      const { data, error } = await supabase
        .from('visit_records')
        .select('*')
        .eq('visit_id', visitId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!visitId,
  });

  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      scheduled: { label: '예정', color: Colors.onSurfaceVariant, bg: `${Colors.onSurfaceVariant}15` },
      confirmed: { label: '확정', color: Colors.primary, bg: `${Colors.primary}15` },
      in_progress: { label: '진행중', color: '#F59E0B', bg: '#FEF3C7' },
      completed: { label: '완료', color: Colors.secondary, bg: `${Colors.secondary}15` },
      cancelled: { label: '취소', color: Colors.error, bg: `${Colors.error}15` },
    };
    return map[status] ?? map.scheduled;
  };

  const vitals = (visitRecord?.vitals as any) ?? {};
  const checklist = (visitRecord?.checklist as any[]) ?? [];
  const nurseName = (visit as any)?.nurse?.user?.full_name ?? '간호사 미정';

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '방문 상세' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      </>
    );
  }

  const statusCfg = visit ? getStatusConfig(visit.status) : getStatusConfig('scheduled');

  return (
    <>
      <Stack.Screen options={{ title: '방문 상세' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 방문 정보 헤더 */}
        <View style={styles.section}>
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View style={styles.heroInfo}>
                <View style={[styles.statusChip, { backgroundColor: statusCfg.bg }]}>
                  <Text style={[styles.statusText, { color: statusCfg.color }]}>
                    {statusCfg.label}
                  </Text>
                </View>
                <View style={styles.heroDateRow}>
                  <Calendar color={Colors.onPrimary} size={18} />
                  <Text style={styles.heroDate}>
                    {visit?.scheduled_date ?? '-'}
                  </Text>
                </View>
                <View style={styles.heroDateRow}>
                  <Clock color={Colors.onPrimary} size={18} />
                  <Text style={styles.heroTime}>
                    {visit?.scheduled_time?.slice(0, 5) ?? '시간 미정'}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroType}>
                {visit?.visit_type === 'regular' ? '정기' : '특별'}
              </Text>
            </View>
          </View>
        </View>

        {/* 간호사 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>담당 간호사</Text>
          <View style={styles.nurseCard}>
            <Image source={Avatars.nurse} style={styles.nurseAvatar} />
            <View style={styles.nurseInfo}>
              <Text style={styles.nurseName}>{nurseName}</Text>
              <Text style={styles.nurseRole}>방문간호사</Text>
            </View>
          </View>
        </View>

        {/* 바이탈 기록 */}
        {(vitals.systolic || vitals.heart_rate || vitals.temperature || vitals.spo2) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>바이탈 기록</Text>
            <View style={styles.vitalGrid}>
              <View style={styles.vitalCard}>
                <Heart color={Colors.error} size={20} />
                <Text style={styles.vitalLabel}>혈압</Text>
                <Text style={styles.vitalValue}>
                  {vitals.systolic && vitals.diastolic
                    ? `${vitals.systolic}/${vitals.diastolic}`
                    : '-'}
                </Text>
                <Text style={styles.vitalUnit}>mmHg</Text>
              </View>
              <View style={styles.vitalCard}>
                <Activity color={Colors.primary} size={20} />
                <Text style={styles.vitalLabel}>심박수</Text>
                <Text style={styles.vitalValue}>
                  {vitals.heart_rate ?? '-'}
                </Text>
                <Text style={styles.vitalUnit}>bpm</Text>
              </View>
              <View style={styles.vitalCard}>
                <Activity color="#F59E0B" size={20} />
                <Text style={styles.vitalLabel}>체온</Text>
                <Text style={styles.vitalValue}>
                  {vitals.temperature ?? '-'}
                </Text>
                <Text style={styles.vitalUnit}>&deg;C</Text>
              </View>
              <View style={styles.vitalCard}>
                <Shield color={Colors.secondary} size={20} />
                <Text style={styles.vitalLabel}>SpO2</Text>
                <Text style={styles.vitalValue}>
                  {vitals.spo2 ?? '-'}
                </Text>
                <Text style={styles.vitalUnit}>%</Text>
              </View>
            </View>
          </View>
        )}

        {/* 수행 내역 */}
        {checklist.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>수행 내역</Text>
            <View style={styles.checklistCard}>
              {checklist.map((item: any, idx: number) => (
                <View key={idx} style={styles.checklistItem}>
                  <CheckCircle
                    color={item.done ? Colors.secondary : Colors.onSurfaceVariant}
                    size={18}
                  />
                  <Text
                    style={[
                      styles.checklistText,
                      item.done && styles.checklistTextDone,
                    ]}
                  >
                    {item.label ?? item.text ?? `항목 ${idx + 1}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 간호 노트 */}
        {visitRecord?.nursing_note && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>간호 노트</Text>
            <View style={styles.noteCard}>
              <User color={Colors.primary} size={18} />
              <Text style={styles.noteText}>{visitRecord.nursing_note}</Text>
            </View>
          </View>
        )}

        {/* 보호자 메시지 */}
        {visitRecord?.guardian_message && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>보호자 메시지</Text>
            <View style={styles.noteCard}>
              <MessageCircle color={Colors.secondary} size={18} />
              <Text style={styles.noteText}>
                {visitRecord.guardian_message}
              </Text>
            </View>
          </View>
        )}
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
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },

  // Hero
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    ...Shadows.hero,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroInfo: {
    gap: Spacing.sm,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroDate: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  heroTime: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
  },
  heroType: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },

  // Nurse
  nurseCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  nurseAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  nurseInfo: {
    marginLeft: Spacing.lg,
  },
  nurseName: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  nurseRole: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 2,
  },

  // Vitals
  vitalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  vitalCard: {
    width: '47%',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadows.ambient,
  },
  vitalLabel: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
  vitalValue: {
    fontSize: FontSize.title,
    fontWeight: '900',
    color: Colors.onSurface,
  },
  vitalUnit: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
  },

  // Checklist
  checklistCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checklistText: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
    flex: 1,
  },
  checklistTextDone: {
    color: Colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },

  // Note
  noteCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  noteText: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
    flex: 1,
    lineHeight: 24,
  },
});
