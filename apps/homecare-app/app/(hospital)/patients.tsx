import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Search, User } from '@/components/icons/TabIcons';

type PatientStatus = 'all' | 'active' | 'paused' | 'discharged';

const STATUS_FILTERS: { key: PatientStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '활성' },
  { key: 'paused', label: '일시중지' },
  { key: 'discharged', label: '퇴원' },
];

export default function HospitalPatients() {
  const insets = useSafeAreaInsets();
  const { staffInfo } = useAuthStore();
  const orgId = staffInfo?.organization_id;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: patients, refetch } = useQuery({
    queryKey: ['hospital-patients', orgId, statusFilter],
    queryFn: async () => {
      if (!orgId) return [];

      let query = supabase
        .from('patients')
        .select(`
          id, care_level, status, created_at,
          user:profiles!inner(full_name, phone, avatar_url),
          assigned_nurse:staff(id, user:profiles!inner(full_name))
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const filteredPatients = (patients ?? []).filter((p: any) => {
    if (!searchQuery) return true;
    const name = p.user?.full_name ?? '';
    return name.includes(searchQuery);
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getCareLevelLabel = (level: number | null) => {
    if (!level) return '';
    return `${level}등급`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.secondary;
      case 'paused': return Colors.redFlag.yellow.accent;
      case 'discharged': return Colors.onSurfaceVariant;
      default: return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'paused': return '일시중지';
      case 'discharged': return '퇴원';
      default: return status;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>환자 관리</Text>
        <Text style={styles.count}>{filteredPatients.length}명</Text>
      </View>

      {/* 검색창 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search color={Colors.onSurfaceVariant} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="환자 이름 검색"
            placeholderTextColor={Colors.outlineVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* 상태 필터 칩 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              statusFilter === f.key && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 환자 리스트 */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient: any) => (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/hospital/patients/${patient.id}`)}
            >
              <View style={styles.avatar}>
                <User color={Colors.onPrimary} size={22} />
              </View>
              <View style={styles.patientInfo}>
                <View style={styles.patientNameRow}>
                  <Text style={styles.patientName}>{patient.user?.full_name ?? '이름없음'}</Text>
                  {patient.care_level && (
                    <View style={styles.careLevelBadge}>
                      <Text style={styles.careLevelText}>{getCareLevelLabel(patient.care_level)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.patientPhone}>{patient.user?.phone ?? ''}</Text>
                {patient.assigned_nurse?.user?.full_name && (
                  <Text style={styles.nurseLabel}>
                    담당: {patient.assigned_nurse.user.full_name}
                  </Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(patient.status)}15` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(patient.status) }]}>
                  {getStatusLabel(patient.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Users color={Colors.outlineVariant} size={48} />
            <Text style={styles.emptyText}>등록된 환자가 없습니다</Text>
          </View>
        )}
      </ScrollView>
    </View>
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
    alignItems: 'baseline',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  count: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    padding: 0,
  },
  filterRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: Colors.onPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 100,
  },
  patientCard: {
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
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  patientInfo: {
    flex: 1,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  patientName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  careLevelBadge: {
    backgroundColor: `${Colors.secondary}15`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  careLevelText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
    color: Colors.secondary,
  },
  patientPhone: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  nurseLabel: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    fontWeight: '500',
    marginTop: 2,
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
