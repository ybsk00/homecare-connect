import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Building2, Users, Star, MapPin, CheckCircle, XCircle, Shield } from '@/components/icons/TabIcons';

export default function AdminOrganizationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: organization, refetch } = useQuery({
    queryKey: ['admin-org-detail', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: staffCount } = useQuery({
    queryKey: ['org-staff-count', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('staff')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', id);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: patientCount } = useQuery({
    queryKey: ['org-patient-count', id],
    queryFn: async () => {
      const { count } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', id);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('organizations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      const labels: Record<string, string> = { active: '승인', rejected: '거절', suspended: '정지' };
      Alert.alert('완료', `기관이 ${labels[status] ?? status}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: ['admin-org-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
    },
    onError: () => {
      Alert.alert('오류', '상태 변경에 실패했습니다.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.secondary;
      case 'pending': return Colors.redFlag.yellow.accent;
      case 'suspended': return Colors.error;
      case 'rejected': return Colors.error;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'pending': return '심사중';
      case 'suspended': return '정지';
      case 'rejected': return '거절';
      default: return status;
    }
  };

  const getOrgTypeLabel = (type: string) => {
    switch (type) {
      case 'hospital': return '병원';
      case 'clinic': return '의원';
      case 'nursing_home': return '요양원';
      case 'home_care': return '방문간호센터';
      default: return type ?? '기관';
    }
  };

  const org = organization as any;

  return (
    <>
      <Stack.Screen options={{ title: '기관 상세' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* 기관 히어로 카드 */}
        <View style={styles.heroCard}>
          <View style={styles.orgIcon}>
            <Building2 color={Colors.onPrimary} size={32} />
          </View>
          <Text style={styles.orgName}>{org?.name ?? '기관'}</Text>
          <Text style={styles.orgType}>{getOrgTypeLabel(org?.org_type)}</Text>
          {org?.status && (
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(org.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(org.status) }]}>
                {getStatusLabel(org.status)}
              </Text>
            </View>
          )}
          {/* 통계 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{staffCount ?? 0}</Text>
              <Text style={styles.statLabel}>직원 수</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{patientCount ?? 0}</Text>
              <Text style={styles.statLabel}>환자 수</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{org?.rating?.toFixed(1) ?? '-'}</Text>
              <Text style={styles.statLabel}>평점</Text>
            </View>
          </View>
        </View>

        {/* 기관 상세 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기관 정보</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>주소</Text>
              <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                {org?.address ?? '-'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>전화번호</Text>
              <Text style={styles.infoValue}>{org?.phone ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>사업자번호</Text>
              <Text style={styles.infoValue}>{org?.business_number ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>대표자</Text>
              <Text style={styles.infoValue}>{org?.representative ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>가입일</Text>
              <Text style={styles.infoValue}>
                {org?.created_at ? new Date(org.created_at).toLocaleDateString('ko-KR') : '-'}
              </Text>
            </View>
          </View>
        </View>

        {/* 구독 플랜 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>구독 플랜</Text>
          <View style={styles.planCard}>
            <Text style={styles.planName}>{org?.subscription_plan ?? 'Basic'}</Text>
            <Text style={styles.planDesc}>
              {org?.subscription_plan === 'premium' ? '프리미엄 - 모든 기능 이용 가능' :
               org?.subscription_plan === 'standard' ? '스탠다드 - 핵심 기능 이용' :
               '기본 플랜'}
            </Text>
          </View>
        </View>

        {/* 리뷰 요약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>리뷰 요약</Text>
          <View style={styles.reviewCard}>
            <View style={styles.reviewRow}>
              <Star color={Colors.redFlag.yellow.accent} size={20} />
              <Text style={styles.reviewScore}>{org?.rating?.toFixed(1) ?? '0.0'}</Text>
              <Text style={styles.reviewCount}>({org?.review_count ?? 0}건)</Text>
            </View>
          </View>
        </View>

        {/* 심사 액션 */}
        {(org?.status === 'pending' || org?.status === 'active') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>심사 관리</Text>
            <View style={styles.actionRow}>
              {org?.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => {
                      Alert.alert('승인 확인', '이 기관을 승인하시겠습니까?', [
                        { text: '취소' },
                        { text: '승인', onPress: () => updateStatusMutation.mutate('active') },
                      ]);
                    }}
                  >
                    <CheckCircle color={Colors.onPrimary} size={18} />
                    <Text style={styles.actionBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => {
                      Alert.alert('거절 확인', '이 기관을 거절하시겠습니까?', [
                        { text: '취소' },
                        { text: '거절', style: 'destructive', onPress: () => updateStatusMutation.mutate('rejected') },
                      ]);
                    }}
                  >
                    <XCircle color={Colors.error} size={18} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>거절</Text>
                  </TouchableOpacity>
                </>
              )}
              {org?.status === 'active' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.suspendBtn]}
                  onPress={() => {
                    Alert.alert('정지 확인', '이 기관을 정지하시겠습니까?', [
                      { text: '취소' },
                      { text: '정지', style: 'destructive', onPress: () => updateStatusMutation.mutate('suspended') },
                    ]);
                  }}
                >
                  <Shield color={Colors.onPrimary} size={18} />
                  <Text style={styles.actionBtnText}>기관 정지</Text>
                </TouchableOpacity>
              )}
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
  heroCard: {
    margin: Spacing.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    alignItems: 'center',
    ...Shadows.float,
  },
  orgIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  orgName: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
    marginBottom: Spacing.xs,
  },
  orgType: {
    fontSize: FontSize.caption,
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xl,
    marginBottom: Spacing.lg,
  },
  statusText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  statLabel: {
    fontSize: FontSize.overline,
    color: Colors.onPrimaryContainer,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: `${Colors.onPrimary}30`,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.ambient,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    minWidth: 80,
  },
  infoValue: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  planCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },
  planName: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'capitalize',
    marginBottom: Spacing.xs,
  },
  planDesc: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
  reviewCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewScore: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
  },
  reviewCount: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    flex: 1,
  },
  approveBtn: {
    backgroundColor: Colors.secondary,
  },
  rejectBtn: {
    backgroundColor: Colors.errorContainer,
  },
  suspendBtn: {
    backgroundColor: Colors.error,
  },
  actionBtnText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
