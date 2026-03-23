import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Check, MapPin, Clock, AlertTriangle } from '@/components/icons/TabIcons';

const SERVICE_TYPES = [
  { key: 'nursing', label: '방문간호' },
  { key: 'rehab', label: '방문재활' },
  { key: 'bathing', label: '방문목욕' },
  { key: 'care', label: '방문돌봄' },
];

const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주',
  '대전', '울산', '세종', '강원', '충북', '충남',
  '전북', '전남', '경북', '경남', '제주',
];

const TIME_SLOTS = [
  { key: 'morning', label: '오전 (09~12시)' },
  { key: 'afternoon', label: '오후 (13~17시)' },
  { key: 'evening', label: '저녁 (18~20시)' },
  { key: 'flexible', label: '시간 무관' },
];

export default function MatchingRequestScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRegions, setShowRegions] = useState(false);

  const { data: patients } = useQuery({
    queryKey: ['guardian-patients', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('guardian_patient_links')
        .select('patient:patients(id, name, care_level)')
        .eq('guardian_id', userId);
      if (error) throw error;
      return data?.map((d: any) => d.patient) ?? [];
    },
    enabled: !!userId,
  });

  const toggleService = (key: string) => {
    setSelectedServices((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      Alert.alert('알림', '환자를 선택해주세요');
      return;
    }
    if (selectedServices.length === 0) {
      Alert.alert('알림', '서비스를 하나 이상 선택해주세요');
      return;
    }
    if (!selectedRegion) {
      Alert.alert('알림', '지역을 선택해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('service_requests').insert({
        patient_id: selectedPatientId,
        guardian_id: userId,
        service_type: selectedServices[0],
        preferred_region: selectedRegion,
        preferred_time_slot: selectedTime,
        urgency,
        memo,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert('매칭 요청 완료', 'AI가 최적의 기관을 매칭하고 있습니다', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('오류', err.message || '요청 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '매칭 요청' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 환자 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>환자 선택</Text>
          <View style={styles.optionList}>
            {patients && patients.length > 0 ? (
              patients.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.optionCard,
                    selectedPatientId === p.id && styles.optionCardSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedPatientId(p.id)}
                >
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionLabel,
                        selectedPatientId === p.id && styles.optionLabelSelected,
                      ]}
                    >
                      {p.name}
                    </Text>
                    {p.care_level && (
                      <Text style={styles.optionSub}>
                        요양 {p.care_level}등급
                      </Text>
                    )}
                  </View>
                  {selectedPatientId === p.id && (
                    <Check color={Colors.onPrimary} size={18} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>연결된 환자가 없습니다</Text>
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => router.push('/patient/register')}
                >
                  <Text style={styles.linkBtnText}>환자 등록하기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* 서비스 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>서비스 선택</Text>
          <View style={styles.chipGrid}>
            {SERVICE_TYPES.map((s) => {
              const selected = selectedServices.includes(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleService(s.key)}
                >
                  {selected && <Check color={Colors.onPrimary} size={14} />}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 지역 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>지역 선택</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            activeOpacity={0.7}
            onPress={() => setShowRegions(!showRegions)}
          >
            <MapPin color={Colors.onSurfaceVariant} size={18} />
            <Text style={[styles.selectBtnText, selectedRegion && styles.selectBtnTextActive]}>
              {selectedRegion || '지역을 선택해주세요'}
            </Text>
          </TouchableOpacity>
          {showRegions && (
            <View style={styles.regionGrid}>
              {REGIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.regionChip,
                    selectedRegion === r && styles.regionChipSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedRegion(r);
                    setShowRegions(false);
                  }}
                >
                  <Text
                    style={[
                      styles.regionChipText,
                      selectedRegion === r && styles.regionChipTextSelected,
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 희망 시간대 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>희망 시간대</Text>
          <View style={styles.optionList}>
            {TIME_SLOTS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.timeCard,
                  selectedTime === t.key && styles.timeCardSelected,
                ]}
                activeOpacity={0.7}
                onPress={() => setSelectedTime(t.key)}
              >
                <Clock
                  color={selectedTime === t.key ? Colors.onPrimary : Colors.onSurfaceVariant}
                  size={16}
                />
                <Text
                  style={[
                    styles.timeLabel,
                    selectedTime === t.key && styles.timeLabelSelected,
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 긴급도 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>긴급도</Text>
          <View style={styles.urgencyRow}>
            <TouchableOpacity
              style={[styles.urgencyBtn, urgency === 'normal' && styles.urgencyBtnActive]}
              activeOpacity={0.7}
              onPress={() => setUrgency('normal')}
            >
              <Text style={[styles.urgencyText, urgency === 'normal' && styles.urgencyTextActive]}>
                일반
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.urgencyBtn, urgency === 'urgent' && styles.urgencyBtnUrgent]}
              activeOpacity={0.7}
              onPress={() => setUrgency('urgent')}
            >
              <AlertTriangle
                color={urgency === 'urgent' ? Colors.onPrimary : Colors.error}
                size={16}
              />
              <Text style={[styles.urgencyText, urgency === 'urgent' && styles.urgencyTextActive]}>
                긴급
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 메모 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>메모</Text>
          <TextInput
            style={styles.memoInput}
            placeholder="특이사항이나 요청사항을 입력해주세요"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={memo}
            onChangeText={setMemo}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* 제출 버튼 */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>매칭 시작</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.lg,
    letterSpacing: -0.3,
  },

  optionList: {
    gap: Spacing.sm,
  },
  optionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.ambient,
  },
  optionCardSelected: {
    backgroundColor: Colors.primary,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  optionLabelSelected: {
    color: Colors.onPrimary,
  },
  optionSub: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.ambient,
  },
  chipSelected: {
    backgroundColor: Colors.secondary,
  },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  chipTextSelected: {
    color: Colors.onPrimary,
  },

  selectBtn: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  selectBtnText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
  selectBtnTextActive: {
    color: Colors.onSurface,
    fontWeight: '600',
  },

  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  regionChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLow,
  },
  regionChipSelected: {
    backgroundColor: Colors.secondary,
  },
  regionChipText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  regionChipTextSelected: {
    color: Colors.onPrimary,
  },

  timeCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  timeCardSelected: {
    backgroundColor: Colors.primary,
  },
  timeLabel: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  timeLabelSelected: {
    color: Colors.onPrimary,
  },

  urgencyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  urgencyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.ambient,
  },
  urgencyBtnActive: {
    backgroundColor: Colors.primary,
  },
  urgencyBtnUrgent: {
    backgroundColor: Colors.error,
  },
  urgencyText: {
    fontSize: FontSize.body,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  urgencyTextActive: {
    color: Colors.onPrimary,
  },

  memoInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    fontSize: FontSize.body,
    color: Colors.onSurface,
    minHeight: 120,
    ...Shadows.ambient,
  },

  submitSection: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    ...Shadows.hero,
  },
  submitBtnText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '800',
    color: Colors.onPrimary,
  },

  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
  linkBtn: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  linkBtnText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    color: Colors.onPrimary,
  },
});
