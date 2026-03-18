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
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth-store';
import { useCreatePatient } from '@/hooks/usePatients';
import { colors, spacing, radius, typography } from '@/constants/theme';

const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
] as const;

const CARE_GRADES = [
  { value: '1', label: '1등급' },
  { value: '2', label: '2등급' },
  { value: '3', label: '3등급' },
  { value: '4', label: '4등급' },
  { value: '5', label: '5등급' },
  { value: 'cognitive', label: '인지지원등급' },
] as const;

const MOBILITY_OPTIONS = [
  { value: 'bedridden', label: '와상' },
  { value: 'wheelchair', label: '휠체어' },
  { value: 'walker', label: '보행보조기' },
  { value: 'independent', label: '독립보행' },
] as const;

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

const RELATIONSHIP_OPTIONS = ['자녀', '배우자', '부모', '형제자매', '친척', '기타'] as const;

export default function PatientRegisterScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const createPatient = useCreatePatient();

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [careGrade, setCareGrade] = useState('');
  const [mobility, setMobility] = useState('');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [neededServices, setNeededServices] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState('any');
  const [specialNotes, setSpecialNotes] = useState('');
  const [relationship, setRelationship] = useState('자녀');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleService = (svc: string) => {
    setNeededServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc],
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (fullName.trim().length < 2) newErrors.fullName = '이름은 2자 이상 입력해주세요';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) newErrors.birthDate = 'YYYY-MM-DD 형식으로 입력해주세요';
    if (!gender) newErrors.gender = '성별을 선택해주세요';
    if (address.trim().length < 5) newErrors.address = '주소를 입력해주세요';
    if (neededServices.length === 0) newErrors.services = '서비스를 1개 이상 선택해주세요';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    try {
      const patientData = {
        primary_guardian_id: user.id,
        full_name: fullName.trim(),
        birth_date: birthDate,
        gender: gender as 'male' | 'female',
        phone: phone.replace(/-/g, '') || null,
        address: address.trim(),
        address_detail: addressDetail.trim() || null,
        location: 'POINT(127.0 37.5)',
        care_grade: (careGrade || null) as any,
        mobility: (mobility || null) as any,
        primary_diagnosis: primaryDiagnosis.trim() || null,
        medical_history: medicalHistory
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        current_medications: medications
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        allergies: allergies
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        needed_services: neededServices,
        preferred_time: (preferredTime || null) as any,
        special_notes: specialNotes.trim() || null,
      };

      await createPatient.mutateAsync({
        patient: patientData,
        relationship,
      });

      Alert.alert('등록 완료', '환자가 등록되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('오류', error?.message ?? '환자 등록에 실패했습니다.');
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
        <Text style={styles.heading}>환자 정보를 등록해주세요</Text>

        {/* Section: Basic info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>기본 정보</Text>

          <Input
            label="이름"
            placeholder="환자 이름"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
            required
          />
          <Input
            label="생년월일"
            placeholder="1945-03-15"
            value={birthDate}
            onChangeText={setBirthDate}
            error={errors.birthDate}
            required
          />

          <Text style={styles.label}>성별 *</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, gender === opt.value && styles.chipSelected]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[styles.chipText, gender === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.gender && <Text style={styles.error}>{errors.gender}</Text>}

          <Input
            label="환자 연락처"
            placeholder="01012345678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            hint="없으면 비워두세요"
          />
          <Input
            label="주소"
            placeholder="서울특별시 강남구 역삼동 123"
            value={address}
            onChangeText={setAddress}
            error={errors.address}
            required
          />
          <Input
            label="상세 주소"
            placeholder="아파트 101동 502호"
            value={addressDetail}
            onChangeText={setAddressDetail}
          />
        </View>

        {/* Section: Medical info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>의료 정보</Text>

          <Text style={styles.label}>장기요양등급</Text>
          <View style={styles.chipRow}>
            {CARE_GRADES.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, careGrade === opt.value && styles.chipSelected]}
                onPress={() => setCareGrade(careGrade === opt.value ? '' : opt.value)}
              >
                <Text style={[styles.chipText, careGrade === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>이동능력</Text>
          <View style={styles.chipRow}>
            {MOBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, mobility === opt.value && styles.chipSelected]}
                onPress={() => setMobility(mobility === opt.value ? '' : opt.value)}
              >
                <Text style={[styles.chipText, mobility === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="주진단명"
            placeholder="예: 뇌졸중, 치매, 파킨슨병"
            value={primaryDiagnosis}
            onChangeText={setPrimaryDiagnosis}
          />
          <Input
            label="병력"
            placeholder="쉼표로 구분 (예: 고혈압, 당뇨)"
            value={medicalHistory}
            onChangeText={setMedicalHistory}
            hint="여러 항목은 쉼표(,)로 구분"
          />
          <Input
            label="현재 복용 약물"
            placeholder="쉼표로 구분"
            value={medications}
            onChangeText={setMedications}
            hint="여러 항목은 쉼표(,)로 구분"
          />
          <Input
            label="알레르기"
            placeholder="쉼표로 구분"
            value={allergies}
            onChangeText={setAllergies}
            hint="없으면 비워두세요"
          />
        </View>

        {/* Section: Service info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>서비스 정보</Text>

          <Text style={styles.label}>필요한 서비스 *</Text>
          <View style={styles.chipRow}>
            {SERVICE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, neededServices.includes(opt.value) && styles.chipSelected]}
                onPress={() => toggleService(opt.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    neededServices.includes(opt.value) && styles.chipTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.services && <Text style={styles.error}>{errors.services}</Text>}

          <Text style={styles.label}>희망 시간대</Text>
          <View style={styles.chipRow}>
            {TIME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, preferredTime === opt.value && styles.chipSelected]}
                onPress={() => setPreferredTime(opt.value)}
              >
                <Text style={[styles.chipText, preferredTime === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="특이사항"
            placeholder="기타 참고할 사항을 입력해주세요"
            value={specialNotes}
            onChangeText={setSpecialNotes}
            multiline
            maxLength={1000}
          />
        </View>

        {/* Section: Guardian info */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>보호자 정보</Text>
          <Text style={styles.label}>환자와의 관계</Text>
          <View style={styles.chipRow}>
            {RELATIONSHIP_OPTIONS.map((rel) => (
              <TouchableOpacity
                key={rel}
                style={[styles.chip, relationship === rel && styles.chipSelected]}
                onPress={() => setRelationship(rel)}
              >
                <Text style={[styles.chipText, relationship === rel && styles.chipTextSelected]}>
                  {rel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.submitSection}>
          <Button
            title="환자 등록"
            onPress={handleSubmit}
            loading={createPatient.isPending}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },

  heading: {
    ...typography.title,
    marginBottom: spacing.xxl,
  },

  sectionContainer: {
    marginBottom: spacing.xxl,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 18,
    marginBottom: spacing.lg,
    color: colors.primary,
  },

  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHighest,
    // NO borders
  },
  chipSelected: {
    backgroundColor: 'rgba(0, 32, 69, 0.08)',
  },
  chipText: {
    ...typography.captionMedium,
    color: colors.onSurfaceVariant,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  submitSection: { marginTop: spacing.xl },
});
