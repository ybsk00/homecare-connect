import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

export default function CheckoutScreen() {
  const { visitId, vitals: vitalsJson, checklist: checklistJson, memo: memoJson } =
    useLocalSearchParams<{
      visitId: string;
      vitals?: string;
      checklist?: string;
      memo?: string;
    }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { staffInfo } = useAuthStore();

  const vitals = vitalsJson ? JSON.parse(vitalsJson) : {};
  const checklist: string[] = checklistJson ? JSON.parse(checklistJson) : [];
  const memo = memoJson ? JSON.parse(memoJson) : {};

  const [checkoutLocation, setCheckoutLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('위치 확인 중...');

  // -- Fetch visit for checkin time --
  const { data: visit } = useQuery({
    queryKey: ['visit-detail', visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, checkin_at, scheduled_time, estimated_duration_min, patient:patients(full_name)')
        .eq('id', visitId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  // -- GPS --
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationAddress('위치 권한 거부');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCheckoutLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode.length > 0) {
          const g = geocode[0];
          setLocationAddress(
            [g.region, g.city, g.district, g.street, g.streetNumber].filter(Boolean).join(' ') ||
              '주소 확인 불가',
          );
        }
      } catch {
        setLocationAddress('위치 확인 실패');
      }
    })();
  }, []);

  // -- Calculate duration --
  const getDuration = () => {
    if (!visit?.checkin_at) return '-';
    const checkinTime = new Date(visit.checkin_at);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - checkinTime.getTime()) / 60000);
    if (diffMin < 60) return `${diffMin}분`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}시간 ${m}분`;
  };

  // -- Checkout mutation --
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();

      // 1. Update visit status
      const { error: visitError } = await supabase
        .from('visits')
        .update({
          status: 'completed' as any,
          checkout_at: now,
          checkout_location: checkoutLocation
            ? `POINT(${checkoutLocation.longitude} ${checkoutLocation.latitude})`
            : null,
        } as any)
        .eq('id', visitId!);
      if (visitError) throw visitError;

      // 2. Insert visit_record
      const { error: recordError } = await supabase.from('visit_records').insert({
        visit_id: visitId!,
        nurse_id: staffInfo?.id!,
        systolic_bp: vitals.systolic_bp,
        diastolic_bp: vitals.diastolic_bp,
        heart_rate: vitals.heart_rate,
        temperature: vitals.temperature,
        blood_sugar: vitals.blood_sugar,
        spo2: vitals.spo2,
        weight: vitals.weight,
        performed_services: checklist,
        nurse_note: memo.nurse_note || null,
        guardian_message: memo.guardian_message || null,
        pain_score: memo.pain_score,
        condition: memo.condition,
        recorded_at: now,
      } as any);
      if (recordError) throw recordError;

      // 3. Call red-flag-detect Edge Function
      try {
        await supabase.functions.invoke('red-flag-detect', {
          body: { visit_id: visitId, vitals, nurse_id: staffInfo?.id },
        });
      } catch {
        // Non-blocking
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-detail'] });
      queryClient.invalidateQueries({ queryKey: ['nurse-visits'] });
      queryClient.invalidateQueries({ queryKey: ['nurse-alerts'] });
      Alert.alert('완료', '방문이 성공적으로 완료되었습니다', [
        { text: '확인', onPress: () => router.dismissAll() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('오류', err.message ?? '체크아웃에 실패했습니다');
    },
  });

  // -- Vital display helpers --
  const vitalItems = [
    { label: '수축기/이완기', value: vitals.systolic_bp && vitals.diastolic_bp ? `${vitals.systolic_bp}/${vitals.diastolic_bp} mmHg` : '-' },
    { label: '심박수', value: vitals.heart_rate ? `${vitals.heart_rate} bpm` : '-' },
    { label: '체온', value: vitals.temperature ? `${vitals.temperature}\u00B0C` : '-' },
    { label: '혈당', value: vitals.blood_sugar ? `${vitals.blood_sugar} mg/dL` : '-' },
    { label: '산소포화도', value: vitals.spo2 ? `${vitals.spo2}%` : '-' },
    { label: '체중', value: vitals.weight ? `${vitals.weight} kg` : '-' },
  ].filter((v) => v.value !== '-');

  const conditionLabel: Record<string, string> = { good: '좋음 😊', okay: '보통 😐', bad: '나쁨 😟' };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* -- Header -- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>체크아웃</Text>
        <Text style={styles.stepBadge}>Step 5/5</Text>
      </View>

      {/* -- GPS -- */}
      <View style={styles.gpsCard}>
        <Text style={styles.gpsIcon}>📍</Text>
        <Text style={styles.gpsAddress}>{locationAddress}</Text>
      </View>

      {/* -- Summary -- */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>방문 요약</Text>

        {/* Duration */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>환자</Text>
            <Text style={styles.summaryValue}>
              {(visit?.patient as any)?.full_name ?? '-'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>소요 시간</Text>
            <Text style={styles.summaryValueHighlight}>{getDuration()}</Text>
          </View>
        </View>

        {/* Vitals */}
        {vitalItems.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>바이탈 사인</Text>
            {vitalItems.map((item, i) => (
              <View key={i} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>수행 내역 ({checklist.length}건)</Text>
            {checklist.map((item: string, i: number) => (
              <View key={i} style={styles.checkRow}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Memo */}
        {(memo.nurse_note || memo.condition || memo.pain_score != null) && (
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>메모</Text>
            {memo.nurse_note && (
              <Text style={styles.memoText}>{memo.nurse_note}</Text>
            )}
            {memo.pain_score != null && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>통증</Text>
                <Text style={styles.summaryValue}>{memo.pain_score}/10</Text>
              </View>
            )}
            {memo.condition && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>컨디션</Text>
                <Text style={styles.summaryValue}>{conditionLabel[memo.condition] ?? '-'}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* -- Checkout Button -- */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => checkoutMutation.mutate()}
        disabled={checkoutMutation.isPending}
      >
        <LinearGradient
          colors={[Colors.secondary, '#004D47']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.checkoutButton}
        >
          {checkoutMutation.isPending ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.checkoutButtonText}>체크아웃 완료</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: Spacing.xl },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.xl,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },
  stepBadge: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, fontWeight: '600' },

  // GPS
  gpsCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadows.ambient,
  },
  gpsIcon: { fontSize: 24 },
  gpsAddress: { flex: 1, fontSize: FontSize.caption, color: Colors.onSurface, fontWeight: '600' },

  // Summary
  summarySection: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.md },
  summaryCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.ambient,
  },
  cardTitle: {
    fontSize: FontSize.caption, fontWeight: '700', color: Colors.secondary,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  summaryLabel: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant },
  summaryValue: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.onSurface },
  summaryValueHighlight: {
    fontSize: FontSize.subtitle, fontWeight: '800', color: Colors.primary,
  },

  // Checklist
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  checkIcon: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '800' },
  checkText: { fontSize: FontSize.caption, color: Colors.onSurface },

  // Memo
  memoText: {
    fontSize: FontSize.caption, color: Colors.onSurface, lineHeight: 20,
    marginBottom: Spacing.sm,
  },

  // Checkout Button
  checkoutButton: {
    borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center',
    minHeight: TouchTarget.comfortable, justifyContent: 'center',
  },
  checkoutButtonText: { fontSize: FontSize.body, fontWeight: '800', color: Colors.onPrimary },
});
