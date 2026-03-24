import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getPatientAvatar } from '@/constants/avatars';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';

// ── 등급 배지 색상 ──
const gradeColors: Record<string, { bg: string; text: string }> = {
  '1': { bg: '#FFDAD6', text: '#BA1A1A' },
  '2': { bg: '#FFF3E0', text: '#E65100' },
  '3': { bg: '#FFF8E1', text: '#321B00' },
  '4': { bg: '#E8F5E9', text: '#2E7D32' },
  '5': { bg: '#E3F2FD', text: '#1565C0' },
  cognitive: { bg: '#F3E5F5', text: '#7B1FA2' },
};

export default function PatientsScreen() {
  const insets = useSafeAreaInsets();
  const { staffInfo } = useAuthStore();
  const nurseId = staffInfo?.id;
  const [search, setSearch] = useState('');

  // ── 담당 환자 조회 (서비스 플랜 기반) ──
  const {
    data: patients,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['nurse-patients', nurseId],
    queryFn: async () => {
      if (!nurseId) return [];
      const { data, error } = await supabase
        .from('service_plans')
        .select('patient:patients(id, full_name, birth_date, gender, care_grade, primary_diagnosis, address, phone, status, mobility)')
        .eq('nurse_id', nurseId)
        .eq('status', 'active');
      if (error) throw error;
      // 중복 제거
      const seen = new Set<string>();
      return (data ?? [])
        .map((d: any) => d.patient)
        .filter((p: any) => {
          if (!p?.id || seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
    },
    enabled: !!nurseId,
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ── 검색 필터 ──
  const filtered = (patients ?? []).filter((p: any) =>
    search ? p.full_name?.includes(search) : true,
  );

  // ── 나이 계산 ──
  function getAge(birthDate: string) {
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>담당 환자</Text>
        <Text style={styles.headerCount}>{filtered.length}명</Text>
      </View>

      {/* ── 검색 ── */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="환자 이름 검색"
          placeholderTextColor={Colors.onSurfaceVariant}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* ── 환자 카드 리스트 ── */}
      {filtered.length > 0 ? (
        filtered.map((patient: any) => {
          const gc = gradeColors[patient.care_grade ?? ''] ?? { bg: Colors.surfaceContainerHigh, text: Colors.onSurfaceVariant };
          return (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              activeOpacity={0.7}
              onPress={() => {
                router.push(`/nurse/patients/${patient.id}`);
              }}
            >
              <View style={styles.cardLeft}>
                <Image
                  source={getPatientAvatar(patient.gender)}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.cardCenter}>
                <View style={styles.nameRow}>
                  <Text style={styles.patientName}>{patient.full_name}</Text>
                  {patient.care_grade && (
                    <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
                      <Text style={[styles.gradeText, { color: gc.text }]}>
                        {patient.care_grade === 'cognitive' ? '인지' : `${patient.care_grade}등급`}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.patientMeta}>
                  {patient.gender === 'male' ? '남' : '여'} · {patient.birth_date ? `${getAge(patient.birth_date)}세` : ''}
                </Text>
                {patient.primary_diagnosis && (
                  <Text style={styles.diagnosis} numberOfLines={1}>{patient.primary_diagnosis}</Text>
                )}
                <Text style={styles.patientAddress} numberOfLines={1}>{patient.address ?? '주소 미등록'}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>담당 환자가 없습니다</Text>
          <Text style={styles.emptySubtext}>서비스 플랜이 배정되면 여기에 표시됩니다</Text>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },

  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // ── 검색 ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },

  // ── 카드 ──
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.ambient,
  },
  cardLeft: {
    marginRight: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  cardCenter: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  patientName: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  gradeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  gradeText: {
    fontSize: FontSize.overline,
    fontWeight: '700',
  },
  patientMeta: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  diagnosis: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    marginTop: 2,
  },
  patientAddress: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  cardRight: {
    marginLeft: Spacing.sm,
  },
  chevron: {
    fontSize: FontSize.title,
    color: Colors.outlineVariant,
    fontWeight: '300',
  },

  // ── 빈 상태 ──
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  emptySubtext: {
    fontSize: FontSize.caption,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
