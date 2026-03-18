import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRedFlags } from '@/hooks/useRedFlags';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { formatRelativeTime } from '@homecare/shared-utils';

const severityOrder = { red: 0, orange: 1, yellow: 2 };
const severityConfig: Record<
  string,
  { bg: string; color: string; label: string; variant: 'warm' | 'teal' | 'navy' }
> = {
  red: {
    bg: Colors.redFlag.redBg,
    color: Colors.redFlag.red,
    label: '\uC704\uD5D8',
    variant: 'warm',
  },
  orange: {
    bg: Colors.redFlag.orangeBg,
    color: Colors.redFlag.orange,
    label: '\uACBD\uACE0',
    variant: 'warm',
  },
  yellow: {
    bg: Colors.redFlag.yellowBg,
    color: Colors.redFlag.yellow,
    label: '\uC8FC\uC758',
    variant: 'warm',
  },
};

export default function AlertsScreen() {
  const {
    alerts,
    isLoading,
    refetch,
    acknowledgeAlert,
    resolveAlert,
  } = useRedFlags();

  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const sortedAlerts = [...alerts].sort((a: any, b: any) => {
    const sa = severityOrder[a.severity as keyof typeof severityOrder] ?? 3;
    const sb = severityOrder[b.severity as keyof typeof severityOrder] ?? 3;
    if (sa !== sb) return sa - sb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAlert(id);
    } catch (error) {
      Alert.alert('\uC624\uB958', '\uD655\uC778 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
    }
  };

  const handleResolve = async () => {
    if (!resolveId) return;
    if (!resolveNote.trim()) {
      Alert.alert('\uC54C\uB9BC', '\uD574\uACB0 \uB0B4\uC6A9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.');
      return;
    }
    try {
      await resolveAlert(resolveId, resolveNote.trim());
      setResolveId(null);
      setResolveNote('');
    } catch (error) {
      Alert.alert('\uC624\uB958', '\uD574\uACB0 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
    }
  };

  if (isLoading) {
    return <Loading message={'\uC54C\uB9BC\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...'} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={sortedAlerts}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => {
          const config =
            severityConfig[item.severity] ?? severityConfig.yellow;
          const isResolving = resolveId === item.id;

          return (
            <Card style={[styles.alertCard, { backgroundColor: config.bg }]}>
              <View style={styles.alertHeader}>
                <Badge
                  label={config.label}
                  variant="custom"
                  color="#FFFFFF"
                  backgroundColor={config.color}
                  size="md"
                />
                <Text style={styles.timeText}>
                  {formatRelativeTime(item.created_at)}
                </Text>
              </View>

              <Text style={[styles.alertTitle, { color: config.color }]}>
                {item.title}
              </Text>
              <Text style={styles.alertDescription} numberOfLines={3}>
                {item.description}
              </Text>

              {item.patient && (
                <Text style={styles.patientInfo}>
                  {'\uD658\uC790: '}{item.patient.full_name}
                  {item.patient.care_grade
                    ? ` (${item.patient.care_grade}\uB4F1\uAE09)`
                    : ''}
                </Text>
              )}

              {item.ai_analysis && (
                <View style={styles.aiBox}>
                  <Text style={styles.aiLabel}>AI \uBD84\uC11D</Text>
                  <Text style={styles.aiText}>{item.ai_analysis}</Text>
                </View>
              )}

              {item.status === 'active' && (
                <View style={styles.actions}>
                  <Button
                    title={'\uD655\uC778'}
                    onPress={() => handleAcknowledge(item.id)}
                    variant="tonal"
                    size="md"
                    style={{ flex: 1 }}
                  />
                  <View style={{ width: Spacing.sm }} />
                  <Button
                    title={'\uD574\uACB0'}
                    onPress={() => setResolveId(item.id)}
                    variant="primary"
                    size="md"
                    style={{ flex: 1 }}
                  />
                </View>
              )}

              {item.status === 'acknowledged' && (
                <View style={styles.actions}>
                  <Button
                    title={'\uD574\uACB0 \uCC98\uB9AC'}
                    onPress={() => setResolveId(item.id)}
                    variant="primary"
                    size="md"
                    fullWidth
                  />
                </View>
              )}

              {isResolving && (
                <View style={styles.resolveForm}>
                  <Text style={styles.resolveLabel}>{'\uD574\uACB0 \uB0B4\uC6A9'}</Text>
                  <TextInput
                    style={styles.resolveInput}
                    value={resolveNote}
                    onChangeText={setResolveNote}
                    placeholder={'\uC870\uCE58 \uB0B4\uC6A9\uC744 \uC785\uB825\uD558\uC138\uC694'}
                    placeholderTextColor={Colors.outline}
                    multiline
                    textAlignVertical="top"
                  />
                  <View style={styles.resolveActions}>
                    <Button
                      title={'\uCDE8\uC18C'}
                      onPress={() => {
                        setResolveId(null);
                        setResolveNote('');
                      }}
                      variant="ghost"
                      size="md"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={'\uD574\uACB0 \uC644\uB8CC'}
                      onPress={handleResolve}
                      variant="primary"
                      size="md"
                      style={{ flex: 2 }}
                    />
                  </View>
                </View>
              )}
            </Card>
          );
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBar}>
            <Text style={styles.headerTitle}>{'\uB808\uB4DC\uD50C\uB798\uADF8 \uC54C\uB9BC'}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {'\uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {'\uD604\uC7AC \uD65C\uC131 \uB808\uB4DC\uD50C\uB798\uADF8 \uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  headerBar: {
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.onSurface,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  alertCard: {
    marginBottom: Spacing.lg,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  alertTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  alertDescription: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  patientInfo: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  aiBox: {
    backgroundColor: 'rgba(0, 32, 69, 0.04)',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  aiLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  aiText: {
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  resolveForm: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
  },
  resolveLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  resolveInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
    minHeight: 80,
    marginBottom: Spacing.lg,
  },
  resolveActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
  },
});
