import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';
import {
  User,
  Bell,
  Shield,
  MessageCircle,
  LogOut,
  ChevronRight,
} from '@/components/icons/TabIcons';

export default function SettingsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  // 알림 설정
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(true);

  const handleSaveProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      Alert.alert('저장 완료', '프로필이 업데이트되었습니다');
    } catch (err: any) {
      Alert.alert('오류', err.message || '저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
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
    <>
      <Stack.Screen options={{ title: '설정' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 수정 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User color={Colors.primary} size={20} />
            <Text style={styles.sectionTitle}>프로필 수정</Text>
          </View>
          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>이름</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="이름"
                placeholderTextColor={Colors.onSurfaceVariant}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>전화번호</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="010-0000-0000"
                placeholderTextColor={Colors.onSurfaceVariant}
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity
              style={styles.saveBtn}
              activeOpacity={0.8}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.onPrimary} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 알림 설정 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell color={Colors.primary} size={20} />
            <Text style={styles.sectionTitle}>알림 설정</Text>
          </View>
          <View style={styles.toggleCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>푸시 알림</Text>
                <Text style={styles.toggleSub}>방문, 매칭, 레드플래그 알림</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{
                  false: Colors.surfaceContainerHigh,
                  true: `${Colors.secondary}50`,
                }}
                thumbColor={pushEnabled ? Colors.secondary : Colors.surfaceContainerHighest}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>이메일 알림</Text>
                <Text style={styles.toggleSub}>주간 리포트, 공지사항</Text>
              </View>
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{
                  false: Colors.surfaceContainerHigh,
                  true: `${Colors.secondary}50`,
                }}
                thumbColor={emailEnabled ? Colors.secondary : Colors.surfaceContainerHighest}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>SMS 알림</Text>
                <Text style={styles.toggleSub}>긴급 알림, 방문 확인</Text>
              </View>
              <Switch
                value={smsEnabled}
                onValueChange={setSmsEnabled}
                trackColor={{
                  false: Colors.surfaceContainerHigh,
                  true: `${Colors.secondary}50`,
                }}
                thumbColor={smsEnabled ? Colors.secondary : Colors.surfaceContainerHighest}
              />
            </View>
          </View>
        </View>

        {/* 서비스 플랜 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield color={Colors.primary} size={20} />
            <Text style={styles.sectionTitle}>서비스 플랜</Text>
          </View>
          <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>현재 플랜</Text>
              <Text style={styles.menuValue}>기본 플랜</Text>
            </View>
            <ChevronRight color={Colors.onSurfaceVariant} size={18} />
          </TouchableOpacity>
        </View>

        {/* 기관 소통 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageCircle color={Colors.primary} size={20} />
            <Text style={styles.sectionTitle}>기관 소통</Text>
          </View>
          <TouchableOpacity style={styles.menuCard} activeOpacity={0.7}>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>메시지</Text>
              <Text style={styles.menuSub}>담당 기관에 메시지를 보냅니다</Text>
            </View>
            <ChevronRight color={Colors.onSurfaceVariant} size={18} />
          </TouchableOpacity>
        </View>

        {/* 로그아웃 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutBtn}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <LogOut color={Colors.error} size={20} />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* 앱 버전 */}
        <Text style={styles.version}>홈케어커넥트 v1.0.0</Text>
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
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Form
  formCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadows.ambient,
  },
  field: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget.min,
  },
  saveBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },

  // Toggle
  toggleCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadows.ambient,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: TouchTarget.min,
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.lg,
  },
  toggleLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  toggleSub: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: Spacing.sm,
  },

  // Menu
  menuCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  menuValue: {
    fontSize: FontSize.label,
    color: Colors.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  menuSub: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Logout
  logoutBtn: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.ambient,
  },
  logoutText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.error,
  },

  version: {
    textAlign: 'center',
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xxl,
  },
});
