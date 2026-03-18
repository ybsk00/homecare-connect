import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface RedFlagBannerProps {
  severity: 'yellow' | 'orange' | 'red';
  title: string;
  patientName?: string;
  onPress?: () => void;
}

const severityConfig = {
  yellow: {
    bg: Colors.redFlag.yellowBg,
    accent: Colors.redFlag.yellowAccent,
    text: Colors.redFlag.yellow,
    label: '\uC8FC\uC758',
  },
  orange: {
    bg: Colors.redFlag.orangeBg,
    accent: Colors.redFlag.orangeAccent,
    text: Colors.redFlag.orange,
    label: '\uACBD\uACE0',
  },
  red: {
    bg: Colors.redFlag.redBg,
    accent: Colors.redFlag.redAccent,
    text: Colors.redFlag.red,
    label: '\uC704\uD5D8',
  },
};

export function RedFlagBanner({
  severity,
  title,
  patientName,
  onPress,
}: RedFlagBannerProps) {
  const config = severityConfig[severity];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(tabs)/alerts');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: config.bg }]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Accent indicator (no border — tonal transition) */}
      <View style={[styles.accentBar, { backgroundColor: config.accent }]} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.severityChip,
              { backgroundColor: `${config.accent}20` },
            ]}
          >
            <Text style={[styles.severityText, { color: config.text }]}>
              {config.label}
            </Text>
          </View>
          {patientName && (
            <Text style={[styles.patientName, { color: config.text }]}>
              {patientName}
            </Text>
          )}
        </View>
        <Text
          style={[styles.title, { color: config.text }]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>

      <Text style={[styles.arrow, { color: config.text }]}>{'\u203A'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  severityChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  severityText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  patientName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    lineHeight: 20,
  },
  arrow: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    paddingRight: Spacing.lg,
  },
});
