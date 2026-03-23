import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';
import { getPatientAvatar } from '@/constants/avatars';

// -- Stepper --
const STEPS = [
  { key: 'checkin', label: '체크인', icon: '📍' },
  { key: 'vitals', label: '바이탈', icon: '💓' },
  { key: 'checklist', label: '체크리스트', icon: '✅' },
  { key: 'memo', label: '메모', icon: '📝' },
  { key: 'checkout', label: '체크아웃', icon: '🏁' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'scheduled':
    case 'en_route':
      return -1;
    case 'checked_in':
      return 0;
    case 'in_progress':
      return 1;
    case 'completed':
      return 5;
    default:
      return -1;
  }
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.stepper}>
      {STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <View key={step.key} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                done && styles.stepCircleDone,
                active && styles.stepCircleActive,
              ]}
            >
              <Text style={styles.stepIcon}>
                {done ? '✓' : step.icon}
              </Text>
            </View>
            <Text
              style={[
                styles.stepLabel,
                (done || active) && styles.stepLabelActive,
              ]}
            >
              {step.label}
            </Text>
            {i < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  done && styles.stepLineDone,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

// -- Grade badge --
const gradeColors: Record<string, { bg: string; text: string }> = {
  '1': { bg: '#FFDAD6', text: '#BA1A1A' },
  '2': { bg: '#FFF3E0', text: '#E65100' },
  '3': { bg: '#FFF8E1', text: '#321B00' },
  '4': { bg: '#E8F5E9', text: '#2E7D32' },
  '5': { bg: '#E3F2FD', text: '#1565C0' },
  cognitive: { bg: '#F3E5F5', text: '#7B1FA2' },
};

export default function VisitDetailScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const insets = useSafeAreaInsets();

  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit-detail', visitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id, scheduled_date, scheduled_time, estimated_duration_min, status,
          checkin_at, checkout_at, visit_order,
          patient:patients(id, full_name, birth_date, gender, care_grade, primary_diagnosis, address, phone),
          service_plan:service_plans(id, plan_type, care_items, visit_frequency, duration_months)
        `)
        .eq('id', visitId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!visitId,
  });

  if (isLoading || !visit) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  const patient = visit.patient as any;
  const plan = visit.service_plan as any;
  const stepIndex = getStepIndex(visit.status);
  const gc = gradeColors[patient?.care_grade ?? ''] ?? { bg: Colors.surfaceContainerHigh, text: Colors.onSurfaceVariant };

  const canStart = visit.status === 'scheduled' || visit.status === 'en_route';
  const canContinue = visit.status === 'checked_in' || visit.status === 'in_progress';

  const handleStart = () => {
    router.push(`/nurse/visit/${visitId}/checkin`);
  };

  const handleContinue = () => {
    if (stepIndex <= 0) router.push(`/nurse/visit/${visitId}/vitals`);
    else if (stepIndex === 1) router.push(`/nurse/visit/${visitId}/checklist`);
    else if (stepIndex === 2) router.push(`/nurse/visit/${visitId}/memo`);
    else router.push(`/nurse/visit/${visitId}/checkout`);
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* -- Header -- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>방문 상세</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* -- Patient Card -- */}
      <LinearGradient
        colors={[Colors.primaryContainer, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.patientCard}
      >
        <View style={styles.patientRow}>
          <Image source={getPatientAvatar(patient?.gender)} style={styles.avatar} />
          <View style={styles.patientInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.patientName}>{patient?.full_name ?? '환자'}</Text>
              {patient?.care_grade && (
                <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
                  <Text style={[styles.gradeText, { color: gc.text }]}>
                    {patient.care_grade === 'cognitive' ? '인지' : `${patient.care_grade}등급`}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.patientAddress} numberOfLines={1}>
              {patient?.address ?? '주소 미등록'}
            </Text>
            {patient?.primary_diagnosis && (
              <Text style={styles.patientDiag}>{patient.primary_diagnosis}</Text>
            )}
          </View>
        </View>
        <View style={styles.visitMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>예정 시간</Text>
            <Text style={styles.metaValue}>
              {visit.scheduled_time?.slice(0, 5) ?? '--:--'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>소요 시간</Text>
            <Text style={styles.metaValue}>
              {visit.estimated_duration_min ?? 30}분
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>순서</Text>
            <Text style={styles.metaValue}>
              {visit.visit_order ?? '-'}번째
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* -- Service Plan -- */}
      {plan && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>서비스 플랜</Text>
          <View style={styles.planCard}>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>유형</Text>
              <Text style={styles.planValue}>{plan.plan_type ?? '-'}</Text>
            </View>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>빈도</Text>
              <Text style={styles.planValue}>{plan.visit_frequency ?? '-'}</Text>
            </View>
            <View style={styles.planRow}>
              <Text style={styles.planLabel}>기간</Text>
              <Text style={styles.planValue}>{plan.duration_months ? `${plan.duration_months}개월` : '-'}</Text>
            </View>
            {plan.care_items && plan.care_items.length > 0 && (
              <View style={styles.careItemsContainer}>
                <Text style={styles.planLabel}>케어 항목</Text>
                <View style={styles.careItemsList}>
                  {plan.care_items.map((item: string, i: number) => (
                    <View key={i} style={styles.careItemChip}>
                      <Text style={styles.careItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* -- Stepper -- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>방문 진행 상태</Text>
        <Stepper currentStep={stepIndex} />
      </View>

      {/* -- Action Button -- */}
      {canStart && (
        <TouchableOpacity activeOpacity={0.8} onPress={handleStart}>
          <LinearGradient
            colors={[Colors.secondary, '#004D47']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>방문 시작</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {canContinue && (
        <TouchableOpacity activeOpacity={0.8} onPress={handleContinue}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>기록 계속</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {visit.status === 'completed' && (
        <View style={styles.completedBanner}>
          <Text style={styles.completedIcon}>✅</Text>
          <Text style={styles.completedText}>방문이 완료되었습니다</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: Spacing.xl },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface,
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.lg,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },

  // Patient Card
  patientCard: {
    borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadows.hero,
  },
  patientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: Spacing.md },
  patientInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  patientName: { fontSize: FontSize.subtitle, fontWeight: '800', color: Colors.onPrimary },
  gradeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  gradeText: { fontSize: FontSize.overline, fontWeight: '700' },
  patientAddress: { fontSize: FontSize.caption, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  patientDiag: { fontSize: FontSize.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  visitMeta: { flexDirection: 'row', gap: Spacing.md },
  metaItem: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  metaLabel: { fontSize: FontSize.overline, color: 'rgba(255,255,255,0.6)' },
  metaValue: { fontSize: FontSize.body, fontWeight: '800', color: Colors.onPrimary, marginTop: 2 },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.md },

  // Plan Card
  planCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, ...Shadows.ambient,
  },
  planRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  planLabel: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant, fontWeight: '600' },
  planValue: { fontSize: FontSize.caption, color: Colors.onSurface, fontWeight: '700' },
  careItemsContainer: { marginTop: Spacing.sm },
  careItemsList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  careItemChip: {
    backgroundColor: Colors.surfaceContainerHigh, paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs, borderRadius: Radius.sm,
  },
  careItemText: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, fontWeight: '600' },

  // Stepper
  stepper: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.xl, ...Shadows.ambient,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceContainerHigh,
    justifyContent: 'center', alignItems: 'center',
  },
  stepCircleDone: { backgroundColor: Colors.secondary },
  stepCircleActive: { backgroundColor: Colors.primary },
  stepIcon: { fontSize: 16 },
  stepLabel: {
    fontSize: FontSize.overline, color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs, textAlign: 'center',
  },
  stepLabelActive: { color: Colors.primary, fontWeight: '700' },
  stepLine: {
    position: 'absolute', top: 20, left: '70%', width: '60%', height: 2,
    backgroundColor: Colors.outlineVariant,
  },
  stepLineDone: { backgroundColor: Colors.secondary },

  // Action Button
  actionButton: {
    borderRadius: Radius.lg, padding: Spacing.lg,
    alignItems: 'center', minHeight: TouchTarget.comfortable,
    justifyContent: 'center', marginBottom: Spacing.md,
  },
  actionButtonText: { fontSize: FontSize.body, fontWeight: '800', color: Colors.onPrimary },

  // Completed
  completedBanner: {
    backgroundColor: Colors.vital.normal.bg, borderRadius: Radius.lg,
    padding: Spacing.xl, alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: Spacing.sm,
  },
  completedIcon: { fontSize: 20 },
  completedText: { fontSize: FontSize.body, fontWeight: '700', color: Colors.vital.normal.text },
});
