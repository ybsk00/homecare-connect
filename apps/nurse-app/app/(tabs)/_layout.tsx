import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useRedFlags } from '@/hooks/useRedFlags';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused ? styles.iconFocused : styles.iconInactive]}>
      {icon}
    </Text>
  );
}

export default function TabsLayout() {
  const { activeCount } = useRedFlags();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        headerStyle: {
          backgroundColor: Colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontWeight: '800',
          color: Colors.onSurface,
          fontSize: FontSize.lg,
        },
        headerShadowVisible: false,
        // Glassmorphism tab bar on iOS
        ...(Platform.OS === 'ios'
          ? {
              tabBarBackground: () => (
                <BlurView
                  intensity={80}
                  tint="light"
                  style={StyleSheet.absoluteFill}
                />
              ),
            }
          : {}),
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: '\uC624\uB298',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\uD83D\uDCCB'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: '\uD658\uC790',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\uD83D\uDC65'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: '\uC54C\uB9BC',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\uD83D\uDD14'} focused={focused} />
          ),
          tabBarBadge: activeCount > 0 ? activeCount : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '\uB9C8\uC774\uD398\uC774\uC9C0',
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={'\uD83D\uDC64'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(247, 250, 252, 0.95)',
    borderTopWidth: 0,
    height: 88,
    paddingBottom: 24,
    paddingTop: 8,
    elevation: 0,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tabItem: {
    paddingTop: 4,
  },
  icon: {
    fontSize: 22,
  },
  iconFocused: {
    opacity: 1,
  },
  iconInactive: {
    opacity: 0.4,
  },
  badge: {
    backgroundColor: Colors.redFlag.redAccent,
    fontSize: 10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
});
