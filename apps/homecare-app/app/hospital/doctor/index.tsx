import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Briefcase, User, Sparkles, Edit3 } from '@/components/icons/TabIcons';

export default function HospitalDoctorVisits() {
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [opinionText, setOpinionText] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const { data: doctorVisits, refetch } = useQuery({
    queryKey: ['doctor-visits', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('doctor_visits')
        .select(`
          id, visit_date, opinion, simplified_opinion, status, created_at,
          patient:patients(id, user:profiles!inner(full_name)),
          doctor:staff(id, user:profiles!inner(full_name))
        `)
        .eq('organization_id', orgId)
        .order('visit_date', { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const saveOpinionMutation = useMutation({
    mutationFn: async ({ visitId, opinion }: { visitId: string; opinion: string }) => {
      const { error } = await (supabase
        .from('doctor_visits') as any)
        .update({ opinion })
        .eq('id', visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      setOpinionText('');
      queryClient.invalidateQueries({ queryKey: ['doctor-visits'] });
      Alert.alert('저장 완료', '소견이 저장되었습니다.');
    },
    onError: () => {
      Alert.alert('오류', '저장에 실패했습니다.');
    },
  });

  const aiConvertMutation = useMutation({
    mutationFn: async ({ visitId, opinion }: { visitId: string; opinion: string }) => {
      setConvertingId(visitId);
      // Edge Function 호출하여 Gemini로 어르신용 변환
      const { data, error } = await supabase.functions.invoke('simplify-opinion', {
        body: { opinion, visitId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setConvertingId(null);
      queryClient.invalidateQueries({ queryKey: ['doctor-visits'] });
      Alert.alert('변환 완료', 'AI가 어르신용으로 변환했습니다.');
    },
    onError: () => {
      setConvertingId(null);
      Alert.alert('오류', 'AI 변환에 실패했습니다.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <Stack.Screen options={{ title: '의사 방문' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        <View style={styles.headerInfo}>
          <Text style={styles.count}>{(doctorVisits ?? []).length}건</Text>
        </View>

        {(doctorVisits ?? []).length > 0 ? (
          (doctorVisits ?? []).map((visit: any) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <View style={styles.visitInfo}>
                  <Text style={styles.patientName}>
                    {visit.patient?.user?.full_name ?? '환자'}
                  </Text>
                  <Text style={styles.doctorName}>
                    의사: {visit.doctor?.user?.full_name ?? '-'}
                  </Text>
                </View>
                <Text style={styles.visitDate}>
                  {new Date(visit.visit_date).toLocaleDateString('ko-KR')}
                </Text>
              </View>

              {/* 소견 표시 */}
              {visit.opinion && editingId !== visit.id && (
                <View style={styles.opinionBox}>
                  <Text style={styles.opinionLabel}>의사 소견</Text>
                  <Text style={styles.opinionText}>{visit.opinion}</Text>
                </View>
              )}

              {/* 변환된 소견 */}
              {visit.simplified_opinion && (
                <View style={styles.simplifiedBox}>
                  <View style={styles.simplifiedHeader}>
                    <Sparkles color={Colors.secondary} size={14} />
                    <Text style={styles.simplifiedLabel}>어르신용 변환</Text>
                  </View>
                  <Text style={styles.simplifiedText}>{visit.simplified_opinion}</Text>
                </View>
              )}

              {/* 소견 입력/수정 */}
              {editingId === visit.id && (
                <View style={styles.editBox}>
                  <TextInput
                    style={styles.opinionInput}
                    placeholder="소견을 입력하세요..."
                    placeholderTextColor={Colors.outlineVariant}
                    value={opinionText}
                    onChangeText={setOpinionText}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => { setEditingId(null); setOpinionText(''); }}
                    >
                      <Text style={styles.cancelBtnText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={() => saveOpinionMutation.mutate({ visitId: visit.id, opinion: opinionText })}
                      disabled={!opinionText.trim()}
                    >
                      <Text style={styles.saveBtnText}>저장</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* 액션 버튼 */}
              <View style={styles.actionRow}>
                {editingId !== visit.id && (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setEditingId(visit.id);
                      setOpinionText(visit.opinion ?? '');
                    }}
                  >
                    <Edit3 color={Colors.primary} size={14} />
                    <Text style={styles.editBtnText}>소견 {visit.opinion ? '수정' : '입력'}</Text>
                  </TouchableOpacity>
                )}

                {visit.opinion && !visit.simplified_opinion && (
                  <TouchableOpacity
                    style={styles.aiBtn}
                    onPress={() => aiConvertMutation.mutate({ visitId: visit.id, opinion: visit.opinion })}
                    disabled={convertingId === visit.id}
                  >
                    {convertingId === visit.id ? (
                      <ActivityIndicator size="small" color={Colors.onPrimary} />
                    ) : (
                      <Sparkles color={Colors.onPrimary} size={14} />
                    )}
                    <Text style={styles.aiBtnText}>
                      {convertingId === visit.id ? 'AI 변환 중...' : 'AI 어르신용 변환'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Briefcase color={Colors.outlineVariant} size={48} />
            <Text style={styles.emptyText}>의사 방문 기록이 없습니다</Text>
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
  headerInfo: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  count: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  visitCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  visitInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  doctorName: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  visitDate: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  opinionBox: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  opinionLabel: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  opinionText: {
    fontSize: FontSize.caption,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  simplifiedBox: {
    backgroundColor: `${Colors.secondary}08`,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  simplifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  simplifiedLabel: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: Colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  simplifiedText: {
    fontSize: FontSize.caption,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  editBox: {
    marginBottom: Spacing.sm,
  },
  opinionInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    minHeight: 100,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  cancelBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondary,
  },
  saveBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: `${Colors.primary}10`,
  },
  editBtnText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.primary,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.secondary,
    flex: 1,
    justifyContent: 'center',
  },
  aiBtnText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
});
