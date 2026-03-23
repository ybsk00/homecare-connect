import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Switch, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Building2, MapPin, Phone, Settings, Bell } from '@/components/icons/TabIcons';

export default function HospitalSettings() {
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [notifyNewRequest, setNotifyNewRequest] = useState(true);
  const [notifyVisitComplete, setNotifyVisitComplete] = useState(true);
  const [notifyRedFlag, setNotifyRedFlag] = useState(true);

  const { data: organization, refetch } = useQuery({
    queryKey: ['organization-detail', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
      return data;
    },
    enabled: !!orgId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const org = organization as any;

  return (
    <>
      <Stack.Screen options={{ title: '기관 설정' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {/* 기관 정보 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>기관 정보</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>기관명</Text>
              <Text style={styles.infoValue}>{org?.name ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>기관 유형</Text>
              <Text style={styles.infoValue}>
                {org?.org_type === 'hospital' ? '병원' :
                 org?.org_type === 'clinic' ? '의원' :
                 org?.org_type === 'nursing_home' ? '요양원' :
                 org?.org_type === 'home_care' ? '방문간호센터' : org?.org_type ?? '-'}
              </Text>
            </View>
            <View style={styles.divider} />
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
          </View>
        </View>

        {/* 서비스 설정 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>서비스 설정</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>운영 상태</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: org?.status === 'active' ? `${Colors.secondary}15` : `${Colors.error}15` },
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: org?.status === 'active' ? Colors.secondary : Colors.error },
                ]}>
                  {org?.status === 'active' ? '운영중' : org?.status ?? '-'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>서비스 지역</Text>
              <Text style={styles.infoValue}>{org?.service_area ?? '-'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>운영 시간</Text>
              <Text style={styles.infoValue}>{org?.operating_hours ?? '09:00 - 18:00'}</Text>
            </View>
          </View>
        </View>

        {/* 알림 설정 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell color={Colors.secondary} size={18} />
            <Text style={styles.sectionTitle}>알림 설정</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>새 서비스 요청</Text>
                <Text style={styles.switchSublabel}>요청 접수 시 알림</Text>
              </View>
              <Switch
                value={notifyNewRequest}
                onValueChange={setNotifyNewRequest}
                trackColor={{ false: Colors.surfaceContainerHigh, true: `${Colors.secondary}50` }}
                thumbColor={notifyNewRequest ? Colors.secondary : Colors.outlineVariant}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>방문 완료</Text>
                <Text style={styles.switchSublabel}>간호사 방문 완료 시 알림</Text>
              </View>
              <Switch
                value={notifyVisitComplete}
                onValueChange={setNotifyVisitComplete}
                trackColor={{ false: Colors.surfaceContainerHigh, true: `${Colors.secondary}50` }}
                thumbColor={notifyVisitComplete ? Colors.secondary : Colors.outlineVariant}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>레드플래그 알림</Text>
                <Text style={styles.switchSublabel}>환자 위험 상태 감지 시</Text>
              </View>
              <Switch
                value={notifyRedFlag}
                onValueChange={setNotifyRedFlag}
                trackColor={{ false: Colors.surfaceContainerHigh, true: `${Colors.secondary}50` }}
                thumbColor={notifyRedFlag ? Colors.secondary : Colors.outlineVariant}
              />
            </View>
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
  section: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.3,
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
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  switchLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  switchSublabel: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
});
