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
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { Check, ChevronDown } from '@/components/icons/TabIcons';

const CARE_LEVELS = ['1등급', '2등급', '3등급', '4등급', '5등급', '인지지원등급'];
const MOBILITY = ['독립보행', '보조기구 사용', '휠체어', '와상(침상)'];
const SERVICES_NEEDED = [
  { key: 'nursing', label: '방문간호' },
  { key: 'rehab', label: '방문재활' },
  { key: 'bathing', label: '방문목욕' },
  { key: 'care', label: '방문돌봄' },
];
const RELATIONSHIPS = ['본인', '배우자', '자녀', '기타'];

export default function PatientRegisterScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [careLevel, setCareLevel] = useState<string | null>(null);
  const [showCareLevel, setShowCareLevel] = useState(false);
  const [mobility, setMobility] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [relationship, setRelationship] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleService = (key: string) => {
    setSelectedServices((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해주세요');
      return;
    }
    if (!gender) {
      Alert.alert('알림', '성별을 선택해주세요');
      return;
    }

    setSubmitting(true);
    try {
      const careLevelNum = careLevel
        ? parseInt(careLevel.replace(/[^0-9]/g, '')) || null
        : null;

      const { data: patient, error: patientError } = await (supabase
        .from('patients') as any)
        .insert({
          name: name.trim(),
          birth_date: birthDate || null,
          gender,
          phone: phone || null,
          address: address || null,
          care_level: careLevelNum,
          mobility: mobility || null,
          primary_diagnosis: diagnosis || null,
          services_needed: selectedServices.length > 0 ? selectedServices : null,
          notes: memo || null,
        })
        .select('id')
        .single();

      if (patientError) throw patientError;

      // guardian_patient_links에 연결
      if (patient && user?.id) {
        await supabase.from('guardian_patient_links').insert({
          guardian_id: user.id,
          patient_id: patient.id,
          relationship: relationship || '기타',
        });
      }

      Alert.alert('등록 완료', '환자 정보가 등록되었습니다', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('오류', err.message || '등록 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '환자 등록' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 기본 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>
          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>이름 *</Text>
              <TextInput
                style={styles.input}
                placeholder="환자 이름"
                placeholderTextColor={Colors.onSurfaceVariant}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>생년월일</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.onSurfaceVariant}
                value={birthDate}
                onChangeText={setBirthDate}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>성별 *</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
                  activeOpacity={0.7}
                  onPress={() => setGender('male')}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === 'male' && styles.genderTextActive,
                    ]}
                  >
                    남
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'female' && styles.genderBtnActive]}
                  activeOpacity={0.7}
                  onPress={() => setGender('female')}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === 'female' && styles.genderTextActive,
                    ]}
                  >
                    여
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>전화번호</Text>
              <TextInput
                style={styles.input}
                placeholder="010-0000-0000"
                placeholderTextColor={Colors.onSurfaceVariant}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* 주소 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>주소</Text>
          <TextInput
            style={[styles.input, styles.inputFull]}
            placeholder="주소를 입력해주세요"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* 요양 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>요양 정보</Text>
          <View style={styles.formCard}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>요양등급</Text>
              <TouchableOpacity
                style={styles.selectField}
                activeOpacity={0.7}
                onPress={() => setShowCareLevel(!showCareLevel)}
              >
                <Text
                  style={[
                    styles.selectText,
                    careLevel && styles.selectTextActive,
                  ]}
                >
                  {careLevel || '등급 선택'}
                </Text>
                <ChevronDown color={Colors.onSurfaceVariant} size={18} />
              </TouchableOpacity>
              {showCareLevel && (
                <View style={styles.dropdownList}>
                  {CARE_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.dropdownItem,
                        careLevel === level && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setCareLevel(level);
                        setShowCareLevel(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          careLevel === level && styles.dropdownTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>이동능력</Text>
              <View style={styles.chipGrid}>
                {MOBILITY.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, mobility === m && styles.chipSelected]}
                    activeOpacity={0.7}
                    onPress={() => setMobility(m)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        mobility === m && styles.chipTextSelected,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>주요 진단명</Text>
              <TextInput
                style={styles.input}
                placeholder="예: 뇌졸중, 치매 등"
                placeholderTextColor={Colors.onSurfaceVariant}
                value={diagnosis}
                onChangeText={setDiagnosis}
              />
            </View>
          </View>
        </View>

        {/* 필요 서비스 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>필요 서비스</Text>
          <View style={styles.chipGrid}>
            {SERVICES_NEEDED.map((s) => {
              const selected = selectedServices.includes(s.key);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  activeOpacity={0.7}
                  onPress={() => toggleService(s.key)}
                >
                  {selected && <Check color={Colors.onPrimary} size={14} />}
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 관계 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>환자와의 관계</Text>
          <View style={styles.chipGrid}>
            {RELATIONSHIPS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, relationship === r && styles.chipSelected]}
                activeOpacity={0.7}
                onPress={() => setRelationship(r)}
              >
                <Text
                  style={[
                    styles.chipText,
                    relationship === r && styles.chipTextSelected,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 특이사항 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>특이사항 메모</Text>
          <TextInput
            style={[styles.input, styles.inputFull, { minHeight: 100 }]}
            placeholder="알레르기, 주의사항 등을 입력해주세요"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={memo}
            onChangeText={setMemo}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* 제출 */}
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
              <Text style={styles.submitBtnText}>환자 등록</Text>
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
  },

  formCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...Shadows.ambient,
  },
  field: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  inputFull: {
    backgroundColor: Colors.surfaceContainerLowest,
    ...Shadows.ambient,
    borderRadius: Radius.lg,
  },

  genderRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: Colors.primary,
  },
  genderText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  genderTextActive: {
    color: Colors.onPrimary,
  },

  selectField: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
  selectTextActive: {
    color: Colors.onSurface,
    fontWeight: '600',
  },

  dropdownList: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dropdownItemActive: {
    backgroundColor: `${Colors.secondary}15`,
  },
  dropdownText: {
    fontSize: FontSize.body,
    color: Colors.onSurface,
  },
  dropdownTextActive: {
    color: Colors.secondary,
    fontWeight: '700',
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
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
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
});
