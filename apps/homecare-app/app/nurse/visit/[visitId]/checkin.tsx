import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

export default function CheckinScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string>('위치 확인 중...');
  const [locationLoading, setLocationLoading] = useState(true);
  const [arrivalTime] = useState(new Date());

  // -- GPS --
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setAddress('위치 권한이 거부되었습니다');
          setLocationLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode.length > 0) {
          const g = geocode[0];
          const parts = [g.region, g.city, g.district, g.street, g.streetNumber].filter(Boolean);
          setAddress(parts.join(' ') || '주소를 가져올 수 없습니다');
        }
      } catch (err) {
        setAddress('위치를 가져올 수 없습니다');
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  // -- Checkin mutation --
  const checkinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('visits')
        .update({
          status: 'checked_in' as any,
          checkin_at: new Date().toISOString(),
          checkin_location: location
            ? `POINT(${location.longitude} ${location.latitude})`
            : null,
        } as any)
        .eq('id', visitId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail', visitId] });
      queryClient.invalidateQueries({ queryKey: ['nurse-visits'] });
      router.push(`/nurse/visit/${visitId}/vitals`);
    },
    onError: (err: any) => {
      Alert.alert('오류', err.message ?? '체크인에 실패했습니다');
    },
  });

  const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* -- Header -- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>체크인</Text>
        <Text style={styles.stepBadge}>Step 1/5</Text>
      </View>

      <View style={styles.body}>
        {/* -- GPS Card -- */}
        <View style={styles.gpsCard}>
          <Text style={styles.gpsIcon}>📍</Text>
          {locationLoading ? (
            <View style={styles.gpsLoading}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.gpsLoadingText}>위치 확인 중...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.gpsAddress}>{address}</Text>
              {location && (
                <Text style={styles.gpsCoords}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
              )}
            </>
          )}
        </View>

        {/* -- Arrival Time -- */}
        <View style={styles.timeCard}>
          <Text style={styles.timeLabel}>도착 시간</Text>
          <Text style={styles.timeValue}>{formatTime(arrivalTime)}</Text>
          <Text style={styles.timeDate}>
            {arrivalTime.getFullYear()}.{(arrivalTime.getMonth() + 1).toString().padStart(2, '0')}.{arrivalTime.getDate().toString().padStart(2, '0')}
          </Text>
        </View>

        {/* -- Status Indicator -- */}
        <View style={styles.statusCard}>
          {location ? (
            <>
              <View style={[styles.statusDot, styles.statusDotOk]} />
              <Text style={styles.statusText}>GPS 위치가 확인되었습니다</Text>
            </>
          ) : (
            <>
              <View style={[styles.statusDot, styles.statusDotWarn]} />
              <Text style={styles.statusText}>GPS 위치를 확인할 수 없습니다</Text>
            </>
          )}
        </View>
      </View>

      {/* -- Checkin Button -- */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => checkinMutation.mutate()}
          disabled={checkinMutation.isPending}
        >
          <LinearGradient
            colors={[Colors.secondary, '#004D47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkinButton}
          >
            {checkinMutation.isPending ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.checkinButtonText}>체크인 완료</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, marginTop: Spacing.sm, marginBottom: Spacing.lg,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },
  stepBadge: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, fontWeight: '600' },

  body: { flex: 1, paddingHorizontal: Spacing.xl },

  // GPS Card
  gpsCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    padding: Spacing.xxl, alignItems: 'center', marginBottom: Spacing.xl, ...Shadows.float,
  },
  gpsIcon: { fontSize: 48, marginBottom: Spacing.lg },
  gpsLoading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  gpsLoadingText: { fontSize: FontSize.body, color: Colors.onSurfaceVariant },
  gpsAddress: {
    fontSize: FontSize.body, fontWeight: '700', color: Colors.onSurface,
    textAlign: 'center', lineHeight: 24,
  },
  gpsCoords: {
    fontSize: FontSize.label, color: Colors.onSurfaceVariant, marginTop: Spacing.sm,
  },

  // Time Card
  timeCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.xl, ...Shadows.ambient,
  },
  timeLabel: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  timeValue: {
    fontSize: FontSize.hero, fontWeight: '800', color: Colors.primary,
    letterSpacing: -1, marginTop: Spacing.xs,
  },
  timeDate: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, marginTop: Spacing.xs },

  // Status
  statusCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, padding: Spacing.lg,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotOk: { backgroundColor: Colors.secondary },
  statusDotWarn: { backgroundColor: Colors.warning },
  statusText: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant },

  // Footer
  footer: { paddingHorizontal: Spacing.xl },
  checkinButton: {
    borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center',
    minHeight: TouchTarget.comfortable, justifyContent: 'center',
  },
  checkinButtonText: { fontSize: FontSize.body, fontWeight: '800', color: Colors.onPrimary },
});
