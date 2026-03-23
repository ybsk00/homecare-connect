import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getVitalStatus, getVitalStatusLabel } from '@homecare/shared-utils';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

type VitalKey = 'systolic_bp' | 'diastolic_bp' | 'heart_rate' | 'temperature' | 'blood_sugar' | 'spo2' | 'weight';

interface VitalField {
  key: VitalKey;
  label: string;
  unit: string;
  placeholder: string;
  required: boolean;
  keyboard: 'numeric' | 'decimal-pad';
}

const VITAL_FIELDS: VitalField[] = [
  { key: 'systolic_bp', label: '수축기 혈압', unit: 'mmHg', placeholder: '120', required: true, keyboard: 'numeric' },
  { key: 'diastolic_bp', label: '이완기 혈압', unit: 'mmHg', placeholder: '80', required: true, keyboard: 'numeric' },
  { key: 'heart_rate', label: '심박수', unit: 'bpm', placeholder: '72', required: true, keyboard: 'numeric' },
  { key: 'temperature', label: '체온', unit: '\u00B0C', placeholder: '36.5', required: true, keyboard: 'decimal-pad' },
  { key: 'blood_sugar', label: '혈당', unit: 'mg/dL', placeholder: '100', required: false, keyboard: 'numeric' },
  { key: 'spo2', label: '산소포화도', unit: '%', placeholder: '98', required: false, keyboard: 'numeric' },
  { key: 'weight', label: '체중', unit: 'kg', placeholder: '60', required: false, keyboard: 'decimal-pad' },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  normal: { bg: Colors.vital.normal.bg, text: Colors.vital.normal.text, label: '정상' },
  warning: { bg: Colors.vital.warning.bg, text: Colors.vital.warning.text, label: '주의' },
  critical: { bg: Colors.vital.critical.bg, text: Colors.vital.critical.text, label: '위험' },
};

export default function VitalsScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const insets = useSafeAreaInsets();

  const [vitals, setVitals] = useState<Record<string, string>>({});

  const updateVital = (key: string, value: string) => {
    setVitals((prev) => ({ ...prev, [key]: value }));
  };

  const getStatus = (field: VitalField) => {
    const val = vitals[field.key];
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return null;
    if (field.key === 'weight') return null; // no range for weight
    try {
      const status = getVitalStatus(field.key as any, num);
      return statusColors[status] ?? null;
    } catch {
      return null;
    }
  };

  const requiredFilled = VITAL_FIELDS.filter((f) => f.required).every(
    (f) => vitals[f.key] && parseFloat(vitals[f.key]) > 0,
  );

  const handleNext = () => {
    // Store vitals in route params or global state - pass via search params
    const vitalsJson = JSON.stringify({
      systolic_bp: vitals.systolic_bp ? parseInt(vitals.systolic_bp) : null,
      diastolic_bp: vitals.diastolic_bp ? parseInt(vitals.diastolic_bp) : null,
      heart_rate: vitals.heart_rate ? parseInt(vitals.heart_rate) : null,
      temperature: vitals.temperature ? parseFloat(vitals.temperature) : null,
      blood_sugar: vitals.blood_sugar ? parseInt(vitals.blood_sugar) : null,
      spo2: vitals.spo2 ? parseInt(vitals.spo2) : null,
      weight: vitals.weight ? parseFloat(vitals.weight) : null,
    });
    router.push({
      pathname: `/nurse/visit/${visitId}/checklist`,
      params: { vitals: vitalsJson },
    } as any);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* -- Header -- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'} 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>바이탈 입력</Text>
          <Text style={styles.stepBadge}>Step 2/5</Text>
        </View>

        {/* -- Vital Fields -- */}
        {VITAL_FIELDS.map((field) => {
          const st = getStatus(field);
          return (
            <View key={field.key} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  {!field.required && <Text style={styles.optionalBadge}>선택</Text>}
                </View>
                {st && (
                  <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                  </View>
                )}
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.vitalInput, st && { borderColor: st.text, borderWidth: 1.5 }]}
                  value={vitals[field.key] ?? ''}
                  onChangeText={(v) => updateVital(field.key, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.outlineVariant}
                  keyboardType={field.keyboard}
                  maxLength={6}
                />
                <Text style={styles.unitText}>{field.unit}</Text>
              </View>
            </View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* -- Next Button -- */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleNext}
          disabled={!requiredFilled}
        >
          <LinearGradient
            colors={requiredFilled ? [Colors.secondary, '#004D47'] : [Colors.outlineVariant, Colors.outlineVariant]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

  // Field Card
  fieldCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.ambient,
  },
  fieldHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fieldLabel: { fontSize: FontSize.body, fontWeight: '700', color: Colors.onSurface },
  optionalBadge: {
    fontSize: FontSize.overline, fontWeight: '600', color: Colors.onSurfaceVariant,
    backgroundColor: Colors.surfaceContainerHigh, paddingHorizontal: Spacing.sm,
    paddingVertical: 2, borderRadius: Radius.sm,
  },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.sm },
  statusText: { fontSize: FontSize.label, fontWeight: '700' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  vitalInput: {
    flex: 1, fontSize: FontSize.hero, fontWeight: '800', color: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    textAlign: 'center', minHeight: TouchTarget.comfortable,
  },
  unitText: { fontSize: FontSize.body, color: Colors.onSurfaceVariant, fontWeight: '600', minWidth: 50 },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
  },
  nextButton: {
    borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center',
    minHeight: TouchTarget.comfortable, justifyContent: 'center',
  },
  nextButtonText: { fontSize: FontSize.body, fontWeight: '800', color: Colors.onPrimary },
});
