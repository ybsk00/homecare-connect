import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import {
  BarChart3,
  Building2,
  Settings,
  MoreHorizontal,
} from '@/components/icons/TabIcons';

function TabBarBackground() {
  return (
    <BlurView
      intensity={80}
      tint="light"
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.glassOverlay} />
    </BlurView>
  );
}

export default function AdminLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 0,
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : Colors.glass.light,
          elevation: 0,
        },
        tabBarBackground: Platform.OS === 'ios' ? TabBarBackground : undefined,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: `${Colors.onSurfaceVariant}66`,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarItemStyle: {
          paddingTop: Spacing.sm,
        },
      }}
    >
      <Tabs.Screen
        name="kpi"
        options={{
          title: 'KPI',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="organizations"
        options={{
          title: '기관',
          tabBarIcon: ({ color, size }) => <Building2 color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: '운영',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: '더보기',
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.glass.light,
  },
});
