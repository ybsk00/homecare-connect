import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { usePatientsList } from '@/hooks/usePatients';
import { usePatientStore } from '@/stores/patient-store';
import { useNotificationStore } from '@/stores/notification-store';
import { colors, spacing, radius, shadows, typography } from '@/constants/theme';
import { formatPhoneNumber, formatUserRole, formatCareGrade } from '@homecare/shared-utils';

export default function MyPageScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const patientsQuery = usePatientsList();
  const patients = usePatientStore((s) => s.patients);
  const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
  const setSelectedPatientId = usePatientStore((s) => s.setSelectedPatientId);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Card style={styles.profileCard}>
          <LinearGradient
            colors={[colors.primary, colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) ?? '?'}
            </Text>
          </LinearGradient>
          <Text style={styles.name}>{profile?.full_name ?? '사용자'}</Text>
          <Badge
            text={formatUserRole(profile?.role ?? 'guardian')}
            variant="primary"
            size="md"
          />
          {profile?.phone && (
            <Text style={styles.phone}>{formatPhoneNumber(profile.phone)}</Text>
          )}
        </Card>

        {/* Patient management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>내 환자</Text>
            <TouchableOpacity onPress={() => router.push('/patient/register')}>
              <Text style={styles.addLink}>+ 환자 등록</Text>
            </TouchableOpacity>
          </View>

          {patients.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>등록된 환자가 없습니다</Text>
            </Card>
          ) : (
            patients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                onPress={() => {
                  setSelectedPatientId(patient.id);
                  router.push(`/patient/${patient.id}`);
                }}
                activeOpacity={0.7}
              >
                <Card
                  style={[
                    styles.patientItem,
                    patient.id === selectedPatientId && styles.patientSelected,
                  ] as any}
                >
                  <View style={styles.patientRow}>
                    <View>
                      <Text style={styles.patientName}>{patient.full_name}</Text>
                      <Text style={styles.patientDetail}>
                        {patient.gender === 'male' ? '남' : '여'}
                        {patient.care_grade ? ` | ${formatCareGrade(patient.care_grade)}` : ''}
                      </Text>
                    </View>
                    {patient.id === selectedPatientId && (
                      <Badge text="선택됨" variant="success" />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Menu - tonal backgrounds, no dividers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>설정</Text>
          <View style={styles.menuContainer}>
            <MenuItem
              label="알림 센터"
              badge={unreadCount > 0 ? `${unreadCount}` : undefined}
              onPress={() => router.push('/notifications')}
            />
            <MenuItem
              label="서비스 계획"
              onPress={() => router.push('/service-plan')}
            />
            <MenuItem
              label="AI 건강 리포트"
              onPress={() => router.push('/ai-report')}
            />
            <MenuItem
              label="리뷰 관리"
              onPress={() => router.push('/review/write' as any)}
            />
            <MenuItem
              label="AI 건강 상담"
              onPress={() => router.push('/chat')}
            />
            <MenuItem
              label="매칭 요청 내역"
              onPress={() => router.push('/(tabs)/matching')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button
            title="로그아웃"
            onPress={handleSignOut}
            variant="ghost"
            fullWidth
          />
        </View>

        <Text style={styles.version}>홈케어커넥트 v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  label,
  badge,
  onPress,
}: {
  label: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={menuStyles.item} onPress={onPress} activeOpacity={0.6}>
      <Text style={menuStyles.label}>{label}</Text>
      <View style={menuStyles.right}>
        {badge && (
          <View style={menuStyles.badge}>
            <Text style={menuStyles.badgeText}>{badge}</Text>
          </View>
        )}
        <Text style={menuStyles.arrow}>{'>'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    // NO borders or dividers - tonal background shift
  },
  label: {
    ...typography.body,
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.onPrimary },
  arrow: { fontSize: 18, color: colors.outlineVariant },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl + 40,
  },

  profileCard: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  avatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  name: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
  },
  phone: {
    ...typography.caption,
    marginTop: spacing.sm,
  },

  section: { marginBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
  },
  addLink: {
    ...typography.captionMedium,
    color: colors.secondary,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
  },
  patientItem: { marginBottom: spacing.sm },
  patientSelected: {
    // Tonal shift instead of border
    backgroundColor: colors.surfaceContainerLow,
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientName: {
    ...typography.bodyBold,
  },
  patientDetail: {
    ...typography.small,
    marginTop: spacing.xs,
  },

  menuContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },

  logoutSection: { marginBottom: spacing.xl },
  version: {
    ...typography.small,
    textAlign: 'center',
  },
});
