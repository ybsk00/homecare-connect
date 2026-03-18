import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useVisitFlow } from '@/hooks/useVisitFlow';
import { useVisitStore } from '@/stores/visit-store';
import { ChecklistItem } from '@/components/visit/ChecklistItem';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function ChecklistScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { visit, formData, saveChecklist } = useVisitFlow(visitId!);
  const initFormData = useVisitStore((s) => s.initFormData);

  const planQuery = useQuery({
    queryKey: ['visitPlan', visit?.plan_id],
    queryFn: async () => {
      if (!visit?.plan_id) return null;
      const { data, error } = await supabase
        .from('service_plans')
        .select('care_items')
        .eq('id', visit.plan_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!visit?.plan_id,
  });

  useEffect(() => {
    if (!planQuery.data?.care_items || !visitId) return;

    const careItems = planQuery.data.care_items;
    const items: { item: string; done: boolean; note?: string }[] = [];

    if (Array.isArray(careItems)) {
      for (const ci of careItems) {
        if (typeof ci === 'string') {
          items.push({ item: ci, done: false });
        } else if (typeof ci === 'object' && ci !== null && 'item' in ci) {
          items.push({ item: (ci as any).item, done: false });
        }
      }
    } else if (typeof careItems === 'object' && careItems !== null) {
      for (const [category, categoryItems] of Object.entries(careItems)) {
        if (Array.isArray(categoryItems)) {
          for (const ci of categoryItems) {
            const itemText = typeof ci === 'string' ? ci : String(ci);
            items.push({ item: `[${category}] ${itemText}`, done: false });
          }
        }
      }
    }

    if (items.length > 0 && formData.performedItems.length === 0) {
      initFormData(visitId, items);
    }
  }, [planQuery.data, visitId, initFormData, formData.performedItems.length]);

  const items = formData.performedItems;
  const completedCount = items.filter((i) => i.done).length;
  const progressPercent =
    items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const handleToggle = (index: number, done: boolean) => {
    const updated = [...items];
    updated[index] = { ...updated[index], done };
    saveChecklist(updated);
  };

  const handleNoteChange = (index: number, note: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], note };
    saveChecklist(updated);
  };

  const handleNext = () => {
    router.push(`/visit/${visitId}/memo`);
  };

  if (planQuery.isLoading) {
    return <Loading message={'\uC218\uD589 \uD56D\uBAA9\uC744 \uBD88\uB7EC\uC624\uB294 \uC911...'} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{'\uC218\uD589 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8'}</Text>
        <Text style={styles.subtitle}>
          {'\uC218\uD589\uD55C \uD56D\uBAA9\uC744 \uCCB4\uD06C\uD558\uC138\uC694. \uBBF8\uC218\uD589 \uC2DC \uC0AC\uC720\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.'}
        </Text>
      </View>

      {/* Progress bar — teal gradient */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completedCount} / {items.length} {'\uC644\uB8CC'}
        </Text>
      </View>

      {/* Checklist items */}
      {items.length > 0 ? (
        items.map((item, index) => (
          <ChecklistItem
            key={`${item.item}-${index}`}
            item={item.item}
            done={item.done}
            note={item.note}
            onToggle={(done) => handleToggle(index, done)}
            onNoteChange={(note) => handleNoteChange(index, note)}
          />
        ))
      ) : (
        <View style={styles.emptyItems}>
          <Text style={styles.emptyText}>
            {'\uB4F1\uB85D\uB41C \uC218\uD589 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title={'\uB2E4\uC74C: \uBA54\uBAA8 \uBC0F \uAE30\uB85D'}
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
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainerHigh,
    marginRight: Spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    minWidth: 70,
    textAlign: 'right',
  },
  emptyItems: {
    padding: Spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
  },
  actions: {
    marginTop: Spacing['2xl'],
    marginBottom: Spacing['2xl'],
  },
});
