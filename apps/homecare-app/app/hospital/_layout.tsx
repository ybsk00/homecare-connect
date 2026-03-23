import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function HospitalStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: Colors.primary,
        headerStyle: {
          backgroundColor: Colors.surface,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          color: Colors.primary,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.surface },
        animation: 'slide_from_right',
      }}
    />
  );
}
