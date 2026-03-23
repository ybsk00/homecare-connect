import { Tabs } from 'expo-router';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '@/constants/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    today: '📋',
    patients: '👥',
    alerts: '🔔',
    mypage: '👤',
  };
  const labels: Record<string, string> = {
    today: '오늘',
    patients: '환자',
    alerts: '알림',
    mypage: '마이',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabEmoji, !focused && styles.tabEmojiInactive]}>
        {icons[name]}
      </Text>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? Colors.secondary : 'rgba(66, 71, 78, 0.4)' },
        ]}
      >
        {labels[name]}
      </Text>
    </View>
  );
}

export default function NurseLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          
          
          
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: Colors.surfaceContainerLowest,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: Colors.surfaceContainerLowest },
              ]}
            />
          ),
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: 'rgba(66, 71, 78, 0.4)',
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="today" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="patients" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="alerts" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="mypage" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
  },
  tabEmoji: {
    fontSize: 24,
  },
  tabEmojiInactive: {
    opacity: 0.4,
  },
  tabLabel: {
    fontSize: FontSize.overline,
    fontWeight: '600',
    marginTop: 2,
  },
});
