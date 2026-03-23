import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Search, Building2, Star, MapPin } from '@/components/icons/TabIcons';

type OrgStatus = 'all' | 'active' | 'pending' | 'suspended';

const STATUS_FILTERS: { key: OrgStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '활성' },
  { key: 'pending', label: '심사중' },
  { key: 'suspended', label: '정지' },
];

export default function AdminOrganizations() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrgStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: organizations, refetch } = useQuery({
    queryKey: ['admin-organizations', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('organizations')
        .select('id, name, org_type, status, address, phone, rating, created_at')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const filteredOrgs = (organizations ?? []).filter((org: any) => {
    if (!searchQuery) return true;
    return org.name?.includes(searchQuery);
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
      default: return Colors.onSurfaceVariant;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '활성';
      case 'pending': return '심사중';
      case 'suspended': return '정지';
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>기관 관리</Text>
        <Text style={styles.count}>{filteredOrgs.length}개</Text>
      </View>

      {/* 검색창 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search color={Colors.onSurfaceVariant} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="기관명 검색"
            placeholderTextColor={Colors.outlineVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* 상태 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 기관 리스트 */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
      >
        {filteredOrgs.length > 0 ? (
          filteredOrgs.map((org: any) => (
            <TouchableOpacity
              key={org.id}
              style={styles.orgCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/admin/organizations/${org.id}`)}
            >
              <View style={styles.orgHeader}>
                <View style={styles.orgIcon}>
                  <Building2 color={Colors.onPrimary} size={20} />
                </View>
                <View style={styles.orgInfo}>
                  <View style={styles.orgNameRow}>
                    <Text style={styles.orgName}>{org.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(org.status)}15` }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(org.status) }]}>
                        {getStatusLabel(org.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.orgType}>{getOrgTypeLabel(org.org_type)}</Text>
                </View>
              </View>

              <View style={styles.orgDetails}>
                {org.address && (
                  <View style={styles.detailRow}>
                    <MapPin color={Colors.onSurfaceVariant} size={13} />
                    <Text style={styles.detailText} numberOfLines={1}>{org.address}</Text>
                  </View>
                )}
                {org.rating != null && (
                  <View style={styles.detailRow}>
                    <Star color={Colors.redFlag.yellow.accent} size={13} />
                    <Text style={styles.detailText}>{org.rating.toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Building2 color={Colors.outlineVariant} size={48} />
            <Text style={styles.emptyText}>등록된 기관이 없습니다</Text>
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
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceContainerLow,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  orgCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  orgInfo: {
    flex: 1,
  },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orgName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  orgType: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  orgDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    flex: 1,
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
