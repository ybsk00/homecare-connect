import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Modal, TextInput, Alert, Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Users, Plus, Mail, XCircle, CheckCircle } from '@/components/icons/TabIcons';
import { Avatars } from '@/constants/avatars';

const ROLE_OPTIONS = [
  { key: 'nurse', label: '간호사' },
  { key: 'doctor', label: '의사' },
  { key: 'therapist', label: '치료사' },
  { key: 'social_worker', label: '사회복지사' },
];

export default function HospitalStaffList() {
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('nurse');

  const { data: staffList, refetch } = useQuery({
    queryKey: ['hospital-staff', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data } = await supabase
        .from('staff')
        .select(`
          id, staff_type, is_active, license_number, specialties,
          user:profiles!inner(full_name, phone, avatar_url, email)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!orgId,
  });

  // 각 직원의 담당환자 수 조회
  const { data: patientCounts } = useQuery({
    queryKey: ['staff-patient-counts', orgId],
    queryFn: async () => {
      if (!orgId) return {};
      const { data } = await supabase
        .from('patients')
        .select('assigned_nurse_id')
        .eq('organization_id', orgId)
        .not('assigned_nurse_id', 'is', null);

      const counts: Record<string, number> = {};
      (data ?? []).forEach((p: any) => {
        counts[p.assigned_nurse_id] = (counts[p.assigned_nurse_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!orgId,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      // 실제로는 초대 이메일 발송 Edge Function 호출
      const { error } = await supabase.from('staff_invitations').insert({
        organization_id: orgId,
        email: inviteEmail,
        role: inviteRole,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      Alert.alert('초대 완료', `${inviteEmail}로 초대를 보냈습니다.`);
      setShowInviteModal(false);
      setInviteEmail('');
      queryClient.invalidateQueries({ queryKey: ['hospital-staff'] });
    },
    onError: () => {
      Alert.alert('오류', '초대 발송에 실패했습니다.');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getStaffTypeLabel = (type: string) => {
    switch (type) {
      case 'nurse': return '간호사';
      case 'doctor': return '의사';
      case 'therapist': return '치료사';
      case 'social_worker': return '사회복지사';
      case 'org_admin': return '관리자';
      default: return type ?? '직원';
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '직원 관리' }} />
      <View style={styles.container}>
        {/* 헤더 영역 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.count}>총 {(staffList ?? []).length}명</Text>
          </View>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => setShowInviteModal(true)}
          >
            <Plus color={Colors.onPrimary} size={16} />
            <Text style={styles.inviteBtnText}>직원 초대</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
        >
          {(staffList ?? []).length > 0 ? (
            (staffList ?? []).map((staff: any) => (
              <TouchableOpacity
                key={staff.id}
                style={styles.staffCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/hospital/staff/${staff.id}`)}
              >
                <Image
                  source={Avatars.nurse}
                  style={[styles.avatar, !staff.is_active && styles.avatarInactive]}
                />
                <View style={styles.staffInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.staffName}>{staff.user?.full_name ?? '이름없음'}</Text>
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: `${Colors.secondary}15` },
                    ]}>
                      <Text style={styles.typeText}>{getStaffTypeLabel(staff.staff_type)}</Text>
                    </View>
                  </View>
                  <Text style={styles.staffPhone}>{staff.user?.phone ?? ''}</Text>
                  <View style={styles.metaRow}>
                    <View style={[
                      styles.activeBadge,
                      { backgroundColor: staff.is_active ? `${Colors.secondary}15` : `${Colors.error}15` },
                    ]}>
                      <Text style={[
                        styles.activeText,
                        { color: staff.is_active ? Colors.secondary : Colors.error },
                      ]}>
                        {staff.is_active ? '활성' : '비활성'}
                      </Text>
                    </View>
                    <Text style={styles.patientCount}>
                      담당 {(patientCounts as any)?.[staff.id] ?? 0}명
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Users color={Colors.outlineVariant} size={48} />
              <Text style={styles.emptyText}>등록된 직원이 없습니다</Text>
            </View>
          )}
        </ScrollView>

        {/* 초대 모달 */}
        <Modal
          visible={showInviteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>직원 초대</Text>
                <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                  <XCircle color={Colors.onSurfaceVariant} size={24} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>이메일</Text>
              <View style={styles.inputBox}>
                <Mail color={Colors.onSurfaceVariant} size={18} />
                <TextInput
                  style={styles.input}
                  placeholder="초대할 이메일 입력"
                  placeholderTextColor={Colors.outlineVariant}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.inputLabel}>역할</Text>
              <View style={styles.roleRow}>
                {ROLE_OPTIONS.map(role => (
                  <TouchableOpacity
                    key={role.key}
                    style={[
                      styles.roleChip,
                      inviteRole === role.key && styles.roleChipActive,
                    ]}
                    onPress={() => setInviteRole(role.key)}
                  >
                    <Text style={[
                      styles.roleChipText,
                      inviteRole === role.key && styles.roleChipTextActive,
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, !inviteEmail && styles.submitBtnDisabled]}
                onPress={() => inviteMutation.mutate()}
                disabled={!inviteEmail || inviteMutation.isPending}
              >
                <Text style={styles.submitBtnText}>
                  {inviteMutation.isPending ? '전송 중...' : '초대 보내기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  count: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
  },
  inviteBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  staffCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: Spacing.md,
  },
  avatarInactive: {
    opacity: 0.4,
  },
  staffInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  staffName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  typeText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: Colors.secondary,
  },
  staffPhone: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  activeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  activeText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  patientCount: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...Shadows.hero,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.primary,
  },
  inputLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    padding: 0,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
  },
  roleChipText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  roleChipTextActive: {
    color: Colors.onPrimary,
  },
  submitBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
