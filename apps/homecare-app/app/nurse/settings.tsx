import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';
import { Avatars } from '@/constants/avatars';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, staffInfo, signOut } = useAuthStore();

  const [notifVisit, setNotifVisit] = useState(true);
  const [notifRedFlag, setNotifRedFlag] = useState(true);
  const [notifSchedule, setNotifSchedule] = useState(true);
  const [notifMessage, setNotifMessage] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  const staffTypeLabel: Record<string, string> = {
    nurse: '간호사',
    doctor: '의사',
    physio: '물리치료사',
    caregiver: '요양보호사',
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* -- Header -- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* -- Profile Section -- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>프로필 정보</Text>
        <View style={styles.profileCard}>
          <Image source={Avatars.nurse} style={styles.profileAvatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name ?? '간호사'}</Text>
            <Text style={styles.profileRole}>
              {staffTypeLabel[staffInfo?.staff_type ?? ''] ?? '의료진'}
            </Text>
            {profile?.phone && (
              <Text style={styles.profileDetail}>{profile.phone}</Text>
            )}
            {staffInfo?.license_number && (
              <Text style={styles.profileDetail}>면허: {staffInfo.license_number}</Text>
            )}
          </View>
        </View>

        {/* Additional profile details */}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>이메일</Text>
            <Text style={styles.detailValue}>{profile?.id ? '(Supabase Auth)' : '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>전문분야</Text>
            <Text style={styles.detailValue}>
              {staffInfo?.specialties?.join(', ') || '-'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>최대 담당 환자</Text>
            <Text style={styles.detailValue}>{staffInfo?.max_patients ?? '-'}명</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>활성 상태</Text>
            <Text style={[styles.detailValue, { color: staffInfo?.is_active ? Colors.secondary : Colors.error }]}>
              {staffInfo?.is_active ? '활성' : '비활성'}
            </Text>
          </View>
        </View>
      </View>

      {/* -- Notification Settings -- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>알림 설정</Text>
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>방문 알림</Text>
              <Text style={styles.toggleDesc}>방문 시작/완료 알림</Text>
            </View>
            <Switch
              value={notifVisit}
              onValueChange={setNotifVisit}
              trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.secondaryFixed }}
              thumbColor={notifVisit ? Colors.secondary : Colors.outlineVariant}
            />
          </View>
          <View style={styles.toggleDivider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>레드플래그 알림</Text>
              <Text style={styles.toggleDesc}>위험/경고 알림</Text>
            </View>
            <Switch
              value={notifRedFlag}
              onValueChange={setNotifRedFlag}
              trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.secondaryFixed }}
              thumbColor={notifRedFlag ? Colors.secondary : Colors.outlineVariant}
            />
          </View>
          <View style={styles.toggleDivider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>일정 알림</Text>
              <Text style={styles.toggleDesc}>일정 변경 및 리마인더</Text>
            </View>
            <Switch
              value={notifSchedule}
              onValueChange={setNotifSchedule}
              trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.secondaryFixed }}
              thumbColor={notifSchedule ? Colors.secondary : Colors.outlineVariant}
            />
          </View>
          <View style={styles.toggleDivider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>메시지 알림</Text>
              <Text style={styles.toggleDesc}>보호자/기관 메시지</Text>
            </View>
            <Switch
              value={notifMessage}
              onValueChange={setNotifMessage}
              trackColor={{ false: Colors.surfaceContainerHigh, true: Colors.secondaryFixed }}
              thumbColor={notifMessage ? Colors.secondary : Colors.outlineVariant}
            />
          </View>
        </View>
      </View>

      {/* -- Logout -- */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>

      <Text style={styles.version}>홈케어커넥트 v1.0.0</Text>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: Spacing.xl },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.lg,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.md },

  // Profile
  profileCard: {
    flexDirection: 'row', backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.md, ...Shadows.float,
  },
  profileAvatar: { width: 64, height: 64, borderRadius: 32, marginRight: Spacing.lg },
  profileInfo: { flex: 1, justifyContent: 'center' },
  profileName: { fontSize: FontSize.subtitle, fontWeight: '800', color: Colors.onSurface },
  profileRole: { fontSize: FontSize.caption, fontWeight: '600', color: Colors.secondary, marginTop: 2 },
  profileDetail: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, marginTop: 4 },

  // Detail Card
  detailCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, ...Shadows.ambient,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabel: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant },
  detailValue: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.onSurface },

  // Toggle Card
  toggleCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, ...Shadows.ambient,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, minHeight: TouchTarget.comfortable,
  },
  toggleInfo: { flex: 1, marginRight: Spacing.md },
  toggleLabel: { fontSize: FontSize.body, fontWeight: '600', color: Colors.onSurface },
  toggleDesc: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, marginTop: 2 },
  toggleDivider: { height: 1, backgroundColor: Colors.surfaceContainerHigh },

  // Logout
  logoutButton: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg,
    padding: Spacing.lg, alignItems: 'center', minHeight: TouchTarget.comfortable,
    justifyContent: 'center', marginBottom: Spacing.md,
  },
  logoutText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.error },

  // Version
  version: {
    fontSize: FontSize.label, color: Colors.outlineVariant, textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
