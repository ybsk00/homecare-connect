import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useVisitFlow } from '@/hooks/useVisitFlow';
import { useLocation } from '@/hooks/useLocation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckoutButton } from '@/components/visit/CheckoutButton';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import {
  getVitalStatus,
  getVitalStatusLabel,
  getVitalTypeLabel,
  getVitalUnit,
  type VitalRanges,
} from '@homecare/shared-utils';

function getSanctuaryColor(status: string): string {
  switch (status) {
    case 'normal':
      return Colors.secondary;
    case 'warning':
    case 'caution':
      return Colors.tertiary;
    case 'critical':
    case 'danger':
      return '#BA1A1A';
    default:
      return Colors.onSurfaceVariant;
  }
}

export default function CheckoutScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { visit, formData, checkout, updateFormData } = useVisitFlow(visitId!);

  const {
    currentLocation,
    distance,
    isWithinRange,
    isLoading: locationLoading,
    getCurrentLocation,
  } = useLocation();

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const handleCheckout = async () => {
    if (!currentLocation) {
      Alert.alert('\uC624\uB958', 'GPS \uC704\uCE58\uB97C \uAC00\uC838\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await checkout(
        currentLocation.latitude,
        currentLocation.longitude,
      );

      if (success) {
        Alert.alert('\uC644\uB8CC', '\uBC29\uBB38 \uAE30\uB85D\uC774 \uC81C\uCD9C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', [
          {
            text: '\uD655\uC778',
            onPress: () => router.replace('/(tabs)/today'),
          },
        ]);
      }
    } catch (error) {
      Alert.alert('\uC624\uB958', '\uCCB4\uD06C\uC544\uC6C3\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const vitals = formData.vitals;
  const vitalEntries = Object.entries(vitals).filter(
    ([, v]) => v !== undefined,
  ) as [keyof VitalRanges | 'weight', number][];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {'\uBC29\uBB38 \uC694\uC57D \uBC0F \uCCB4\uD06C\uC544\uC6C3'}
        </Text>
        <Text style={styles.subtitle}>
          {'\uC785\uB825\uD55C \uB0B4\uC6A9\uC744 \uD655\uC778\uD558\uACE0 \uCCB4\uD06C\uC544\uC6C3\uD558\uC138\uC694'}
        </Text>
      </View>

      {/* Vitals summary */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{'\uBC14\uC774\uD0C8 \uC0AC\uC778'}</Text>
        {vitalEntries.length > 0 ? (
          <View style={styles.vitalsGrid}>
            {vitalEntries.map(([key, value]) => {
              if (key === 'weight') {
                return (
                  <View key={key} style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>{'\uCCB4\uC911'}</Text>
                    <Text style={styles.vitalValue}>{value} kg</Text>
                  </View>
                );
              }
              const vitalKey = key as keyof VitalRanges;
              const status = getVitalStatus(vitalKey, value);
              const statusColor = getSanctuaryColor(status);

              return (
                <View key={key} style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>
                    {getVitalTypeLabel(vitalKey)}
                  </Text>
                  <Text style={[styles.vitalValue, { color: statusColor }]}>
                    {value} {getVitalUnit(vitalKey)}
                  </Text>
                  <Badge
                    label={getVitalStatusLabel(status)}
                    variant="custom"
                    color={statusColor}
                    backgroundColor={`${statusColor}18`}
                    size="sm"
                  />
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noDataText}>
            {'\uC785\uB825\uB41C \uBC14\uC774\uD0C8 \uC5C6\uC74C'}
          </Text>
        )}
      </Card>

      {/* Checklist summary */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{'\uC218\uD589 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8'}</Text>
        {formData.performedItems.length > 0 ? (
          <>
            <Text style={styles.summaryText}>
              {formData.performedItems.filter((i) => i.done).length} /{' '}
              {formData.performedItems.length} {'\uC218\uD589 \uC644\uB8CC'}
            </Text>
            {formData.performedItems
              .filter((i) => !i.done)
              .map((item, index) => (
                <View key={index} style={styles.uncheckedItem}>
                  <Text style={styles.uncheckedIcon}>{'\u2715'}</Text>
                  <View style={styles.uncheckedContent}>
                    <Text style={styles.uncheckedText}>{item.item}</Text>
                    {item.note && (
                      <Text style={styles.uncheckedNote}>
                        {'\uC0AC\uC720: '}{item.note}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
          </>
        ) : (
          <Text style={styles.noDataText}>{'\uC218\uD589 \uD56D\uBAA9 \uC5C6\uC74C'}</Text>
        )}
      </Card>

      {/* Status summary */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{'\uC0C1\uD0DC \uAE30\uB85D'}</Text>
        <View style={styles.statusGrid}>
          {formData.generalCondition && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>{'\uC804\uC2E0 \uC0C1\uD0DC'}</Text>
              <Text style={styles.statusValue}>
                {formData.generalCondition === 'good'
                  ? '\uC591\uD638'
                  : formData.generalCondition === 'fair'
                    ? '\uBCF4\uD1B5'
                    : '\uBD88\uB7C9'}
              </Text>
            </View>
          )}
          {formData.consciousness && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>{'\uC758\uC2DD'}</Text>
              <Text style={styles.statusValue}>{formData.consciousness}</Text>
            </View>
          )}
          {formData.skinCondition && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>{'\uD53C\uBD80'}</Text>
              <Text style={styles.statusValue}>{formData.skinCondition}</Text>
            </View>
          )}
          {formData.painScore !== null && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>{'\uD1B5\uC99D'}</Text>
              <Text style={styles.statusValue}>{formData.painScore}/10</Text>
            </View>
          )}
        </View>

        {formData.nurseNote ? (
          <View style={styles.notePreview}>
            <Text style={styles.noteLabel}>{'\uAC04\uD638\uC0AC \uBA54\uBAA8'}</Text>
            <Text style={styles.noteText} numberOfLines={3}>
              {formData.nurseNote}
            </Text>
          </View>
        ) : null}

        {formData.photos.length > 0 && (
          <Text style={styles.attachmentText}>
            {'\uC0AC\uC9C4'} {formData.photos.length}{'\uC7A5 \uCCA8\uBD80'}
          </Text>
        )}
        {formData.voiceMemoUri && (
          <Text style={styles.attachmentText}>
            {'\uC74C\uC131 \uBA54\uBAA8 1\uAC74 \uCCA8\uBD80'}
          </Text>
        )}
      </Card>

      {/* Guardian message */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>
          {'\uBCF4\uD638\uC790\uC5D0\uAC8C \uC804\uB2EC \uBA54\uC2DC\uC9C0 (\uC120\uD0DD)'}
        </Text>
        <TextInput
          style={styles.messageInput}
          value={formData.messageToGuardian}
          onChangeText={(text) => updateFormData({ messageToGuardian: text })}
          placeholder={'\uBCF4\uD638\uC790\uC5D0\uAC8C \uC804\uB2EC\uD560 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694'}
          placeholderTextColor={Colors.outline}
          multiline
          textAlignVertical="top"
        />
      </Card>

      {/* Checkout */}
      <CheckoutButton
        distance={distance}
        isWithinRange={distance !== null ? isWithinRange : true}
        isLoading={locationLoading || isSubmitting}
        onCheckout={handleCheckout}
        onRefreshLocation={getCurrentLocation}
      />
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
  vitalsGrid: {
    gap: Spacing.md,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
  },
  vitalLabel: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    flex: 1,
  },
  vitalValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    marginRight: Spacing.sm,
  },
  noDataText: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  summaryText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: Spacing.lg,
  },
  uncheckedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(50, 27, 0, 0.04)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  uncheckedIcon: {
    fontSize: FontSize.sm,
    color: Colors.tertiary,
    fontWeight: '700',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  uncheckedContent: {
    flex: 1,
  },
  uncheckedText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  uncheckedNote: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statusItem: {
    width: '45%',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  statusLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  notePreview: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  noteLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  noteText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  attachmentText: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  messageInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    minHeight: 80,
    lineHeight: 22,
  },
});
