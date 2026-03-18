import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useVisitFlow } from '@/hooks/useVisitFlow';
import { useVisitStore } from '@/stores/visit-store';
import { VitalInput } from '@/components/visit/VitalInput';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import type { VitalRanges } from '@homecare/shared-utils';

export default function VitalsScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { visit, formData, saveVitals } = useVisitFlow(visitId!);
  const initFormData = useVisitStore((s) => s.initFormData);

  useEffect(() => {
    if (visitId) {
      initFormData(visitId);
    }
  }, [visitId, initFormData]);

  const vitals = formData.vitals;

  const handleVitalChange = (
    type: keyof VitalRanges | 'weight',
    value: number | undefined,
  ) => {
    saveVitals({
      ...vitals,
      [type]: value,
    });
  };

  const handleNext = () => {
    router.push(`/visit/${visitId}/checklist`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {'\uBC14\uC774\uD0C8 \uC0AC\uC778 \uCE21\uC815'}
        </Text>
        <Text style={styles.subtitle}>
          {visit?.patient?.full_name ?? '\uD658\uC790'}{'\uB2D8\uC758 \uD65C\uB825\uC9D5\uD6C4\uB97C \uC785\uB825\uD558\uC138\uC694'}
        </Text>
      </View>

      {/* Required vitals */}
      <Text style={styles.sectionLabel}>{'\uD544\uC218 \uD56D\uBAA9'}</Text>

      <VitalInput
        vitalType="systolic_bp"
        value={vitals.systolic_bp}
        onChange={(v) => handleVitalChange('systolic_bp', v)}
      />

      <VitalInput
        vitalType="diastolic_bp"
        value={vitals.diastolic_bp}
        onChange={(v) => handleVitalChange('diastolic_bp', v)}
      />

      <VitalInput
        vitalType="heart_rate"
        value={vitals.heart_rate}
        onChange={(v) => handleVitalChange('heart_rate', v)}
      />

      <VitalInput
        vitalType="temperature"
        value={vitals.temperature}
        onChange={(v) => handleVitalChange('temperature', v)}
      />

      {/* Optional vitals */}
      <Text style={styles.sectionLabel}>{'\uC120\uD0DD \uD56D\uBAA9'}</Text>

      <VitalInput
        vitalType="blood_sugar"
        value={vitals.blood_sugar}
        onChange={(v) => handleVitalChange('blood_sugar', v)}
        optional
      />

      <VitalInput
        vitalType="spo2"
        value={vitals.spo2}
        onChange={(v) => handleVitalChange('spo2', v)}
        optional
      />

      {/* Weight */}
      <View style={styles.weightContainer}>
        <Text style={styles.weightLabel}>{'\uCCB4\uC911 (\uC120\uD0DD)'}</Text>
        <View style={styles.weightInputRow}>
          <Text style={styles.weightValue}>
            {vitals.weight !== undefined ? `${vitals.weight}` : '--'}
          </Text>
          <Text style={styles.weightUnit}>kg</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={'\uB2E4\uC74C: \uCCB4\uD06C\uB9AC\uC2A4\uD2B8'}
          onPress={handleNext}
          variant="primary"
          size="xl"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    paddingVertical: Spacing.xl,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  weightContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  weightLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.lg,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
  },
  weightValue: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.onSurface,
  },
  weightUnit: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    marginLeft: Spacing.sm,
  },
  actions: {
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
});
