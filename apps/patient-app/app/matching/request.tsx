import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { usePatientStore } from '@/stores/patient-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCreateMatchingRequest } from '@/hooks/useMatching';
import { colors, spacing, radius, typography } from '@/constants/theme';

const SERVICE_OPTIONS = [
  { value: 'nursing', label: '방문간호' },
  { value: 'physio', label: '방문재활' },
  { value: 'bath', label: '방문목욕' },
  { value: 'care', label: '방문요양' },
  { value: 'doctor_visit', label: '의사방문' },
] as const;

const TIME_OPTIONS = [
  { value: 'morning', label: '오전' },
  { value: 'afternoon', label: '오후' },
  { value: 'any', label: '시간 무관' },
] as const;

const URGENCY_OPTIONS = [
  { value: 'normal', label: '일반' },
  { value: 'urgent', label: '긴급' },
] as const;

export default function MatchingRequestScreen() {
  const router = useRouter();
  const patients = usePatientStore((s) => s.patients);
  const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
  const user = useAuthStore((s) => s.user);
  const createRequest = useCreateMatchingRequest();

  const [patientId, setPatientId] = useState(selectedPatientId ?? '');
  const [services, setServices] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState<string>('any');
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');

  const toggleService = (svc: string) => {
    setServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc],
    );
  };

  const handleSubmit = async () => {
    if (!patientId) {
      Alert.alert('오류', '환자를 선택해주세요.');
      return;
    }
    if (services.length === 0) {
      Alert.alert('오류', '필요한 서비스를 1개 이상 선택해주세요.');
      return;
    }
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    try {
      const result = await createRequest.mutateAsync({
        patient_id: patientId,
        guardian_id: user.id,
        requested_services: services,
        preferred_time: preferredTime,
        urgency,
        notes: notes.trim() || undefined,
      });

      Alert.alert('매칭 요청 완료', 'AI가 최적의 기관을 찾고 있습니다.', [
        {
          text: '결과 보기',
          onPress: () =>
            router.replace(
              `/matching/results?requestId=${result.id}&patientId=${patientId}`,
            ),
        },
      ]);
    } catch (error: any) {
      Alert.alert('오류', error?.message ?? '매칭 요청에 실패했습니다.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Patient selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>환자 선택</Text>
          {patients.map((patient) => (
            <TouchableOpacity
              key={patient.id}
              onPress={() => setPatientId(patient.id)}
              activeOpacity={0.7}
            >
              <Card
                style={[
                  styles.patientOption,
                  patient.id === patientId && styles.patientSelected,
                ]}
              >
                <Text style={styles.patientName}>{patient.full_name}</Text>
                <Text style={styles.patientInfo}>
                  {patient.gender === 'male' ? '남' : '여'} |{' '}
                  {patient.address}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Service selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>필요한 서비스 *</Text>
          <View style={styles.optionGrid}>
            {SERVICE_OPTIONS.map((opt) => {
              const selected = services.includes(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleService(opt.value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Time preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>희망 시간대</Text>
          <View style={styles.optionGrid}>
            {TIME_OPTIONS.map((opt) => {
              const selected = preferredTime === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setPreferredTime(opt.value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Urgency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>긴급도</Text>
          <View style={styles.optionGrid}>
            {URGENCY_OPTIONS.map((opt) => {
              const selected = urgency === opt.value;
              const isUrgent = opt.value === 'urgent' && selected;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    selected && (isUrgent ? styles.chipUrgent : styles.chipSelected),
                  ]}
                  onPress={() => setUrgency(opt.value as 'normal' | 'urgent')}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && (isUrgent ? styles.chipTextUrgent : styles.chipTextSelected),
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Input
            label="요청 사항 (선택)"
            placeholder="특별히 요청할 사항이 있으면 입력해주세요"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={1000}
          />
        </View>

        {/* Submit */}
        <Button
          title="AI 매칭 시작"
          onPress={handleSubmit}
          loading={createRequest.isPending}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  section: { marginBottom: spacing.xxl },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },

  patientOption: { marginBottom: spacing.sm },
  patientSelected: {
    backgroundColor: colors.surfaceContainerLow,
  },
  patientName: {
    ...typography.bodyBold,
  },
  patientInfo: {
    ...typography.small,
    marginTop: spacing.xs,
  },

  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    // NO borders
  },
  chipSelected: {
    backgroundColor: 'rgba(0, 32, 69, 0.08)',
  },
  chipUrgent: {
    backgroundColor: colors.vital.critical.bg,
  },
  chipText: {
    ...typography.captionMedium,
    color: colors.onSurfaceVariant,
  },
  chipTextSelected: { color: colors.primary, fontWeight: '600' },
  chipTextUrgent: { color: colors.error, fontWeight: '600' },
});
