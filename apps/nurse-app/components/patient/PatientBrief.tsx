import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { formatCareGrade, formatMobility } from '@homecare/shared-utils';

interface PatientBriefProps {
  name: string;
  birthDate?: string;
  gender?: string;
  careGrade?: string | null;
  mobility?: string | null;
  diagnosis?: string | null;
  allergies?: string[];
  specialNotes?: string | null;
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function PatientBrief({
  name,
  birthDate,
  gender,
  careGrade,
  mobility,
  diagnosis,
  allergies,
  specialNotes,
}: PatientBriefProps) {
  const age = birthDate ? calculateAge(birthDate) : null;
  const genderLabel = gender === 'male' ? '\uB0A8' : gender === 'female' ? '\uC5EC' : '';

  return (
    <Card style={styles.card}>
      {/* Header with avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0)}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            {age !== null ? `${age}\uC138` : ''}
            {genderLabel ? ` / ${genderLabel}` : ''}
          </Text>
        </View>
      </View>

      {/* Vitality chips */}
      <View style={styles.badges}>
        {careGrade && (
          <Badge
            label={formatCareGrade(careGrade)}
            variant="teal"
            size="md"
          />
        )}
        {mobility && (
          <Badge
            label={formatMobility(mobility)}
            variant="navy"
            size="md"
          />
        )}
      </View>

      {/* Info rows — tonal backgrounds, no borders, no dividers */}
      {diagnosis && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{'\uC8FC\uC9C4\uB2E8'}</Text>
          <Text style={styles.infoValue}>{diagnosis}</Text>
        </View>
      )}

      {allergies && allergies.length > 0 && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{'\uC54C\uB808\uB974\uAE30'}</Text>
          <View style={styles.allergyTags}>
            {allergies.map((allergy, i) => (
              <Badge
                key={i}
                label={allergy as string}
                variant="warm"
                size="sm"
                style={styles.allergyTag}
              />
            ))}
          </View>
        </View>
      )}

      {specialNotes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>{'\uD2B9\uC774\uC0AC\uD56D'}</Text>
          <Text style={styles.notesText}>{specialNotes}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 32, 69, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  meta: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    width: 64,
    marginRight: Spacing.sm,
  },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    flex: 1,
  },
  allergyTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    flex: 1,
  },
  allergyTag: {
    marginBottom: 2,
  },
  notesContainer: {
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.warningContainer,
    borderRadius: BorderRadius.md,
  },
  notesLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.tertiary,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 20,
  },
});
