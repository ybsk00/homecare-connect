import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

export default function ChecklistScreen() {
  const { visitId, vitals } = useLocalSearchParams<{ visitId: string; vitals?: string }>();
  const insets = useSafeAreaInsets();

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  // -- Fetch service plan care_items --
  const { data: careItems, isLoading } = useQuery({
    queryKey: ['visit-care-items', visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('service_plan:service_plans(care_items)')
        .eq('id', visitId!)
        .single();
      if (error) throw error;
      const plan = data?.service_plan as any;
      return (plan?.care_items as string[]) ?? [];
    },
    enabled: !!visitId,
  });

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const allChecked = careItems ? checkedItems.size === careItems.length : false;
  const checkedCount = checkedItems.size;
  const totalCount = careItems?.length ?? 0;

  const handleNext = () => {
    const completedItems = careItems
      ? careItems.filter((_: string, i: number) => checkedItems.has(i))
      : [];
    router.push({
      pathname: `/nurse/visit/${visitId}/memo`,
      params: {
        vitals: vitals ?? '{}',
        checklist: JSON.stringify(completedItems),
      },
    } as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* -- Header -- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'} 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>수행 체크리스트</Text>
          <Text style={styles.stepBadge}>Step 3/5</Text>
        </View>

        {/* -- Progress -- */}
        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            {checkedCount} / {totalCount} 완료
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: totalCount > 0 ? `${(checkedCount / totalCount) * 100}%` : '0%' },
              ]}
            />
          </View>
        </View>

        {/* -- Checklist Items -- */}
        {careItems && careItems.length > 0 ? (
          careItems.map((item: string, index: number) => {
            const checked = checkedItems.has(index);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.checkItem, checked && styles.checkItemDone]}
                onPress={() => toggleItem(index)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, checked && styles.checkboxDone]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text
                  style={[styles.checkLabel, checked && styles.checkLabelDone]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>등록된 케어 항목이 없습니다</Text>
          </View>
        )}

        {/* -- Select All -- */}
        {totalCount > 0 && (
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={() => {
              if (allChecked) {
                setCheckedItems(new Set());
              } else {
                setCheckedItems(new Set(careItems!.map((_: string, i: number) => i)));
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.selectAllText}>
              {allChecked ? '전체 해제' : '전체 선택'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* -- Next Button -- */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={handleNext}>
          <LinearGradient
            colors={[Colors.secondary, '#004D47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>다음</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: Spacing.xl },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.xl,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },
  stepBadge: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, fontWeight: '600' },

  // Progress
  progressCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadows.ambient,
  },
  progressText: {
    fontSize: FontSize.caption, fontWeight: '700', color: Colors.secondary,
    marginBottom: Spacing.sm, textAlign: 'center',
  },
  progressBar: {
    height: 8, backgroundColor: Colors.surfaceContainerHigh, borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: Colors.secondary, borderRadius: 4,
  },

  // Check Item
  checkItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.sm,
    minHeight: TouchTarget.comfortable, ...Shadows.ambient,
  },
  checkItemDone: {
    backgroundColor: Colors.vital.normal.bg,
  },
  checkbox: {
    width: TouchTarget.min, height: TouchTarget.min, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  checkboxDone: {
    backgroundColor: Colors.secondary,
  },
  checkmark: {
    fontSize: FontSize.subtitle, fontWeight: '800', color: Colors.onPrimary,
  },
  checkLabel: {
    flex: 1, fontSize: FontSize.body, color: Colors.onSurface, fontWeight: '600',
  },
  checkLabelDone: {
    color: Colors.vital.normal.text,
  },

  // Select All
  selectAllButton: {
    alignSelf: 'center', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
  },
  selectAllText: { fontSize: FontSize.caption, color: Colors.secondary, fontWeight: '700' },

  // Empty
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg,
    padding: Spacing.xxxl, alignItems: 'center',
  },
  emptyText: { fontSize: FontSize.body, color: Colors.onSurfaceVariant },

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
