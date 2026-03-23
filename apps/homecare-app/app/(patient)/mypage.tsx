import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';
import {
  User,
  FileText,
  Star,
  MessageCircle,
  Bell,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
  Users,
} from '@/components/icons/TabIcons';

const patientAvatar = require('@/assets/images/patient_man.jpg');

interface MenuItem {
  icon: React.ComponentType<{ color: string; size: number }>;
  label: string;
  subtitle?: string;
  route?: string;
  color?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: Users, label: '환자 관리', subtitle: '연결된 환자 정보를 관리합니다', route: '/patient/register' },
  { icon: FileText, label: 'AI 리포트', subtitle: 'AI 건강 분석 리포트', route: '/patient/ai-report' },
  { icon: Star, label: '리뷰', subtitle: '방문 서비스 리뷰 작성', route: '/patient/review/write' },
  { icon: MessageCircle, label: 'AI 상담', subtitle: 'AI 기반 건강 상담', route: '/patient/chat' },
  { icon: Shield, label: 'AI 도우미', subtitle: '스마트 케어 어시스턴트', route: '/patient/agent' },
  { icon: Bell, label: '알림', subtitle: '알림 및 공지사항', route: '/patient/notifications' },
  { icon: Settings, label: '설정', subtitle: '앱 설정 및 계정 관리', route: '/patient/settings' },
];

export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const displayName = profile?.full_name || '사용자';

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '로그아웃 하시겠습니까?',
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.lg,
        paddingBottom: 120,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* 프로필 섹션 */}
      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
          <Image source={patientAvatar} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>보호자</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>편집</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 메뉴 리스트 */}
      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index === 0 && styles.menuItemFirst,
                index === MENU_ITEMS.length - 1 && styles.menuItemLast,
              ]}
              activeOpacity={0.6}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <View style={styles.menuIconWrap}>
                <Icon color={item.color ?? Colors.primary} size={20} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.subtitle && (
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                )}
              </View>
              <ChevronRight color={Colors.onSurfaceVariant} size={18} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 로그아웃 버튼 */}
      <View style={styles.logoutSection}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // Profile
  profileSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  profileCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.ambient,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  profileName: {
    fontSize: FontSize.subtitle,
    fontWeight: '800',
    color: Colors.primary,
  },
  roleChip: {
    backgroundColor: `${Colors.secondary}15`,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  roleChipText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.secondary,
  },
  editBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  editBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },

  // Menu
  menuSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  menuItem: {
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TouchTarget.comfortable,
  },
  menuItemFirst: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  menuItemLast: {
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  menuLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  menuSubtitle: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  // Logout
  logoutSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
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

  // Version
  version: {
    textAlign: 'center',
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
  },
});
