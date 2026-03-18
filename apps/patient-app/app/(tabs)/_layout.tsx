import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNotificationStore } from '@/stores/notification-store';
import { useUnreadCount } from '@/hooks/useNotifications';
import { colors, spacing, typography } from '@/constants/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>{label}</Text>
  );
}

export default function TabsLayout() {
  useUnreadCount();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ),
        headerTitleStyle: {
          ...typography.bodyBold,
          fontSize: 18,
          color: colors.onSurface,
        },
        headerShadowVisible: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.tabBarBlur]}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          headerTitle: 'HomeCare Connect',
          tabBarIcon: ({ focused }) => <TabIcon label="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="matching"
        options={{
          title: '매칭',
          headerTitle: '기관 매칭',
          tabBarIcon: ({ focused }) => <TabIcon label="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '일정',
          headerTitle: '방문 일정',
          tabBarIcon: ({ focused }) => <TabIcon label="📅" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: '기록',
          headerTitle: '케어 기록',
          tabBarIcon: ({ focused }) => <TabIcon label="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이페이지',
          headerTitle: '마이페이지',
          tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: styles.tabBadge,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    paddingTop: spacing.xs,
    height: Platform.OS === 'ios' ? 88 : 64,
    // NO border - glassmorphism backdrop only
    borderTopWidth: 0,
    elevation: 0,
  },
  tabBarBlur: {
    overflow: 'hidden',
    backgroundColor: 'rgba(247, 250, 252, 0.8)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: Platform.OS === 'ios' ? 0 : spacing.xs,
  },
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
  tabBadge: {
    backgroundColor: colors.secondary,
    fontSize: 10,
    minWidth: 18,
    height: 18,
    lineHeight: 18,
  },
});
