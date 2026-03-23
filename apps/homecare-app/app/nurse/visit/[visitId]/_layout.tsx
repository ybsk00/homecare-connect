import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function VisitLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.surface },
        animation: 'slide_from_right',
      }}
    />
  );
}
