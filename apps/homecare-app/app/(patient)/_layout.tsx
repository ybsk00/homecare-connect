import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import {
  Home,
  Search,
  Calendar,
  ClipboardList,
  User,
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

export default function PatientLayout() {
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
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="matching"
        options={{
          title: '매칭',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '일정',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: '기록',
          tabBarIcon: ({ color, size }) => (
            <ClipboardList color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
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
