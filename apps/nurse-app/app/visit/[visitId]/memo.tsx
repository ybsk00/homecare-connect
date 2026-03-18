import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useVisitFlow } from '@/hooks/useVisitFlow';
import { PhotoCapture } from '@/components/visit/PhotoCapture';
import { VoiceMemo } from '@/components/visit/VoiceMemo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing, FontSize, BorderRadius, TouchTarget } from '@/constants/theme';

const CONDITION_OPTIONS = [
  { value: 'good', label: '\uC591\uD638', color: Colors.secondary },
  { value: 'fair', label: '\uBCF4\uD1B5', color: Colors.tertiary },
  { value: 'poor', label: '\uBD88\uB7C9', color: '#BA1A1A' },
];

const CONSCIOUSNESS_OPTIONS = ['\uBA85\uB8CC', '\uAE30\uBA74', '\uD63C\uBBF8', '\uBC18\uD63C\uC218', '\uD63C\uC218'];
const SKIN_OPTIONS = ['\uC815\uC0C1', '\uAC74\uC870', '\uBC1C\uC801', '\uBD80\uC885', '\uCC3D\uC0C1', '\uC695\uCC3D'];
const NUTRITION_OPTIONS = [
  { value: 'full', label: '\uC804\uB7C9 \uC12D\uCDE8' },
  { value: 'half', label: '\uBC18\uB7C9 \uC12D\uCDE8' },
  { value: 'poor', label: '\uC18C\uB7C9 \uC12D\uCDE8' },
  { value: 'none', label: '\uAE08\uC2DD/\uBBF8\uC12D\uCDE8' },
];

export default function MemoScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { formData, saveMemo } = useVisitFlow(visitId!);

  const handleNext = () => {
    router.push(`/visit/${visitId}/checkout`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>{'\uBA54\uBAA8 \uBC0F \uAE30\uB85D'}</Text>
        <Text style={styles.subtitle}>
          {'\uD658\uC790 \uC0C1\uD0DC\uB97C \uC0C1\uC138\uD788 \uAE30\uB85D\uD574\uC8FC\uC138\uC694'}
        </Text>
      </View>

      {/* General condition — tonal chips */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{'\uC804\uC2E0 \uC0C1\uD0DC'}</Text>
        <View style={styles.optionRow}>
          {CONDITION_OPTIONS.map((opt) => {
            const isSelected = formData.generalCondition === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionButton,
                  isSelected && { backgroundColor: `${opt.color}15` },
                ]}
                onPress={() =>
                  saveMemo({
                    generalCondition:
                      formData.generalCondition === opt.value ? null : opt.value,
                  })
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    isSelected && { color: opt.color, fontWeight: '700' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Consciousness */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{'\uC758\uC2DD \uC218\uC900'}</Text>
        <View style={styles.chipRow}>
          {CONSCIOUSNESS_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip,
                formData.consciousness === opt && styles.chipSelected,
              ]}
              onPress={() =>
                saveMemo({
                  consciousness: formData.consciousness === opt ? null : opt,
                })
              }
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  formData.consciousness === opt && styles.chipTextSelected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Skin condition */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{'\uD53C\uBD80 \uC0C1\uD0DC'}</Text>
        <View style={styles.chipRow}>
          {SKIN_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip,
                formData.skinCondition === opt && styles.chipSelected,
              ]}
              onPress={() =>
                saveMemo({
                  skinCondition: formData.skinCondition === opt ? null : opt,
                })
              }
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  formData.skinCondition === opt && styles.chipTextSelected,
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Nutrition */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{'\uC601\uC591 \uC12D\uCDE8'}</Text>
        <View style={styles.optionRow}>
          {NUTRITION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.nutritionButton,
                formData.nutritionIntake === opt.value &&
                  styles.nutritionSelected,
              ]}
              onPress={() =>
                saveMemo({
                  nutritionIntake:
                    formData.nutritionIntake === opt.value ? null : opt.value,
                })
              }
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.nutritionText,
                  formData.nutritionIntake === opt.value &&
                    styles.nutritionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Pain score — teal track */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>
          {'\uD1B5\uC99D \uC810\uC218 (NRS) '}
          <Text style={styles.painValue}>
            {formData.painScore !== null ? formData.painScore : '--'}
          </Text>
        </Text>
        <View style={styles.painRow}>
          {Array.from({ length: 11 }, (_, i) => i).map((score) => {
            const isSelected = formData.painScore === score;
            const painColor =
              score <= 3
                ? Colors.secondary
                : score <= 6
                  ? Colors.tertiary
                  : '#BA1A1A';

            return (
              <TouchableOpacity
                key={score}
                style={[
                  styles.painButton,
                  isSelected && {
                    backgroundColor: painColor,
                  },
                ]}
                onPress={() =>
                  saveMemo({
                    painScore: formData.painScore === score ? null : score,
                  })
                }
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.painButtonText,
                    isSelected && styles.painButtonTextSelected,
                  ]}
                >
                  {score}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.painLabels}>
          <Text style={styles.painLabel}>{'\uD1B5\uC99D \uC5C6\uC74C'}</Text>
          <Text style={styles.painLabel}>{'\uADF9\uC2EC\uD55C \uD1B5\uC99D'}</Text>
        </View>
      </Card>

      {/* Nurse note */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{'\uAC04\uD638\uC0AC \uBA54\uBAA8'}</Text>
        <TextInput
          style={styles.noteInput}
          value={formData.nurseNote}
          onChangeText={(text) => saveMemo({ nurseNote: text })}
          placeholder={'\uD658\uC790 \uC0C1\uD0DC, \uAD00\uCC30 \uB0B4\uC6A9, \uD2B9\uC774\uC0AC\uD56D \uB4F1\uC744 \uAE30\uB85D\uD558\uC138\uC694'}
          placeholderTextColor={Colors.outline}
          multiline
          textAlignVertical="top"
        />
      </Card>

      {/* Voice memo */}
      <Card style={styles.section}>
        <VoiceMemo
          voiceMemoUri={formData.voiceMemoUri}
          onVoiceMemoChange={(uri) => saveMemo({ voiceMemoUri: uri })}
        />
      </Card>

      {/* Photo capture */}
      <Card style={styles.section}>
        <PhotoCapture
          photos={formData.photos}
          onPhotosChange={(photos) => saveMemo({ photos })}
        />
      </Card>

      <View style={styles.actions}>
        <Button
          title={'\uB2E4\uC74C: \uCCB4\uD06C\uC544\uC6C3'}
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
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    minHeight: TouchTarget.comfortable,
    justifyContent: 'center',
  },
  optionText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceContainerLow,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: 'rgba(0, 32, 69, 0.08)',
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  nutritionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerLow,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  nutritionSelected: {
    backgroundColor: 'rgba(0, 32, 69, 0.08)',
  },
  nutritionText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    textAlign: 'center',
  },
  nutritionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  painRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  painButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceContainerLow,
  },
  painButtonText: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  painButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  painLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  painLabel: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  painValue: {
    color: Colors.secondary,
    fontWeight: '800',
    fontSize: FontSize.lg,
  },
  noteInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    minHeight: 120,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
});
