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
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import { getPatientAvatar } from '@/constants/avatars';

// -- Grade colors --
const gradeColors: Record<string, { bg: string; text: string }> = {
  '1': { bg: '#FFDAD6', text: '#BA1A1A' },
  '2': { bg: '#FFF3E0', text: '#E65100' },
  '3': { bg: '#FFF8E1', text: '#321B00' },
  '4': { bg: '#E8F5E9', text: '#2E7D32' },
  '5': { bg: '#E3F2FD', text: '#1565C0' },
  cognitive: { bg: '#F3E5F5', text: '#7B1FA2' },
};

function getAge(birthDate: string) {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // -- Patient info --
  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, birth_date, gender, care_grade, primary_diagnosis, address, phone, emergency_contact, emergency_phone, mobility, status')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // -- Recent vitals (last 5 visit records) --
  const { data: recentVitals } = useQuery({
    queryKey: ['patient-vitals', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visit_records')
        .select('id, systolic_bp, diastolic_bp, heart_rate, temperature, blood_sugar, spo2, weight, recorded_at')
        .eq('patient_id', id!)
        .order('recorded_at', { ascending: false })
        .limit(5);
      if (error) {
        // Fallback: query via visits
        const { data: vData, error: vErr } = await supabase
          .from('visits')
          .select('id, visit_records(id, systolic_bp, diastolic_bp, heart_rate, temperature, blood_sugar, spo2, weight, recorded_at)')
          .eq('patient_id', id!)
          .eq('status', 'completed')
          .order('scheduled_date', { ascending: false })
          .limit(5);
        if (vErr) return [];
        return (vData ?? []).flatMap((v: any) => v.visit_records ?? []);
      }
      return data ?? [];
    },
    enabled: !!id,
  });

  // -- Visit history --
  const { data: visits } = useQuery({
    queryKey: ['patient-visit-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visits')
        .select('id, scheduled_date, scheduled_time, status, nurse:staff(id, user_id, profiles:profiles(full_name))')
        .eq('patient_id', id!)
        .order('scheduled_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // -- Prescriptions --
  const { data: prescriptions } = useQuery({
    queryKey: ['patient-prescriptions', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, medication_name, dosage, frequency, start_date, end_date, notes, status')
        .eq('patient_id', id!)
        .eq('status', 'active')
        .order('start_date', { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!id,
  });

  // -- Condition checks --
  const { data: conditionChecks } = useQuery({
    queryKey: ['patient-condition-checks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condition_checks')
        .select('id, check_date, pain_score, condition, mood, sleep_quality, appetite, notes')
        .eq('patient_id', id!)
        .order('check_date', { ascending: false })
        .limit(5);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading || !patient) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  const gc = gradeColors[patient.care_grade ?? ''] ?? { bg: Colors.surfaceContainerHigh, text: Colors.onSurfaceVariant };

  const statusLabel: Record<string, string> = {
    scheduled: '예정', completed: '완료', cancelled: '취소', in_progress: '진행중',
    checked_in: '체크인', en_route: '이동중',
  };

  const conditionEmoji: Record<string, string> = { good: '😊', okay: '😐', bad: '😟' };

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
        <Text style={styles.headerTitle}>환자 상세</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* -- Patient Info -- */}
      <LinearGradient
        colors={[Colors.primaryContainer, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.patientHero}
      >
        <Image source={getPatientAvatar(patient.gender)} style={styles.avatar} />
        <View style={styles.heroInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.patientName}>{patient.full_name}</Text>
            {patient.care_grade && (
              <View style={[styles.gradeBadge, { backgroundColor: gc.bg }]}>
                <Text style={[styles.gradeText, { color: gc.text }]}>
                  {patient.care_grade === 'cognitive' ? '인지' : `${patient.care_grade}등급`}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.heroMeta}>
            {patient.gender === 'male' ? '남' : '여'} {patient.birth_date ? `· ${getAge(patient.birth_date)}세` : ''}
          </Text>
          {patient.primary_diagnosis && (
            <Text style={styles.heroDiag}>{patient.primary_diagnosis}</Text>
          )}
          <Text style={styles.heroAddr} numberOfLines={1}>{patient.address ?? '주소 미등록'}</Text>
        </View>
      </LinearGradient>

      {/* -- Recent Vitals -- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>최근 바이탈 (최근 5회)</Text>
        {recentVitals && recentVitals.length > 0 ? (
          recentVitals.map((v: any, i: number) => (
            <View key={v.id ?? i} style={styles.vitalRow}>
              <Text style={styles.vitalDate}>
                {v.recorded_at ? new Date(v.recorded_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'}
              </Text>
              <View style={styles.vitalValues}>
                {v.systolic_bp && v.diastolic_bp && (
                  <Text style={styles.vitalItem}>BP {v.systolic_bp}/{v.diastolic_bp}</Text>
                )}
                {v.heart_rate && <Text style={styles.vitalItem}>HR {v.heart_rate}</Text>}
                {v.temperature && <Text style={styles.vitalItem}>{v.temperature}&deg;C</Text>}
                {v.spo2 && <Text style={styles.vitalItem}>SpO2 {v.spo2}%</Text>}
                {v.blood_sugar && <Text style={styles.vitalItem}>BS {v.blood_sugar}</Text>}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>기록된 바이탈이 없습니다</Text>
        )}
      </View>

      {/* -- Visit History -- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>방문 이력</Text>
        {visits && visits.length > 0 ? (
          visits.map((v: any) => (
            <TouchableOpacity
              key={v.id}
              style={styles.historyItem}
              onPress={() => router.push(`/nurse/visit/${v.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.historyLeft}>
                <Text style={styles.historyDate}>{v.scheduled_date}</Text>
                <Text style={styles.historyTime}>{v.scheduled_time?.slice(0, 5) ?? '--:--'}</Text>
              </View>
              <View style={[styles.historyBadge, {
                backgroundColor: v.status === 'completed' ? Colors.vital.normal.bg : Colors.surfaceContainerHigh,
              }]}>
                <Text style={[styles.historyBadgeText, {
                  color: v.status === 'completed' ? Colors.vital.normal.text : Colors.onSurfaceVariant,
                }]}>
                  {statusLabel[v.status] ?? v.status}
                </Text>
              </View>
              <Text style={styles.chevron}>{'>'}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>방문 이력이 없습니다</Text>
        )}
      </View>

      {/* -- Prescriptions -- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>처방약 정보</Text>
        {prescriptions && prescriptions.length > 0 ? (
          prescriptions.map((p: any) => (
            <View key={p.id} style={styles.prescriptionCard}>
              <Text style={styles.prescriptionName}>{p.medication_name}</Text>
              <Text style={styles.prescriptionDetail}>
                {p.dosage} · {p.frequency}
              </Text>
              {p.notes && <Text style={styles.prescriptionNote}>{p.notes}</Text>}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>등록된 처방약이 없습니다</Text>
        )}
      </View>

      {/* -- Condition Checks -- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>컨디션 기록</Text>
        {conditionChecks && conditionChecks.length > 0 ? (
          conditionChecks.map((c: any) => (
            <View key={c.id} style={styles.conditionItem}>
              <Text style={styles.conditionDate}>{c.check_date}</Text>
              <View style={styles.conditionDetails}>
                {c.condition && (
                  <Text style={styles.conditionChip}>
                    {conditionEmoji[c.condition] ?? ''} {c.condition === 'good' ? '좋음' : c.condition === 'okay' ? '보통' : '나쁨'}
                  </Text>
                )}
                {c.pain_score != null && (
                  <Text style={styles.conditionChip}>통증 {c.pain_score}/10</Text>
                )}
                {c.sleep_quality && (
                  <Text style={styles.conditionChip}>수면 {c.sleep_quality}</Text>
                )}
              </View>
              {c.notes && <Text style={styles.conditionNote}>{c.notes}</Text>}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>컨디션 기록이 없습니다</Text>
        )}
      </View>

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

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.lg,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },

  // Patient Hero
  patientHero: {
    flexDirection: 'row', borderRadius: Radius.xl, padding: Spacing.xl,
    marginBottom: Spacing.xl, ...Shadows.hero,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: Spacing.lg },
  heroInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  patientName: { fontSize: FontSize.subtitle, fontWeight: '800', color: Colors.onPrimary },
  gradeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  gradeText: { fontSize: FontSize.overline, fontWeight: '700' },
  heroMeta: { fontSize: FontSize.caption, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  heroDiag: { fontSize: FontSize.caption, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  heroAddr: { fontSize: FontSize.label, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  // Section
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface, marginBottom: Spacing.md },

  // Vitals
  vitalRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.ambient,
  },
  vitalDate: {
    fontSize: FontSize.label, fontWeight: '700', color: Colors.primary,
    minWidth: 56, marginRight: Spacing.md,
  },
  vitalValues: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  vitalItem: {
    fontSize: FontSize.label, color: Colors.onSurface, fontWeight: '600',
    backgroundColor: Colors.surfaceContainerHigh, paddingHorizontal: Spacing.sm,
    paddingVertical: 2, borderRadius: Radius.sm,
  },

  // Visit History
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.ambient,
  },
  historyLeft: { marginRight: Spacing.md, minWidth: 72 },
  historyDate: { fontSize: FontSize.label, fontWeight: '700', color: Colors.onSurface },
  historyTime: { fontSize: FontSize.overline, color: Colors.onSurfaceVariant, marginTop: 2 },
  historyBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  historyBadgeText: { fontSize: FontSize.overline, fontWeight: '700' },
  chevron: { fontSize: FontSize.body, color: Colors.outlineVariant, marginLeft: 'auto', paddingLeft: Spacing.sm },

  // Prescriptions
  prescriptionCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.md,
    padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadows.ambient,
  },
  prescriptionName: { fontSize: FontSize.body, fontWeight: '700', color: Colors.onSurface },
  prescriptionDetail: { fontSize: FontSize.caption, color: Colors.secondary, marginTop: 4 },
  prescriptionNote: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, marginTop: 4 },

  // Condition
  conditionItem: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.ambient,
  },
  conditionDate: { fontSize: FontSize.label, fontWeight: '700', color: Colors.primary },
  conditionDetails: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  conditionChip: {
    fontSize: FontSize.label, color: Colors.onSurfaceVariant, fontWeight: '600',
    backgroundColor: Colors.surfaceContainerHigh, paddingHorizontal: Spacing.sm,
    paddingVertical: 2, borderRadius: Radius.sm,
  },
  conditionNote: { fontSize: FontSize.label, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },

  emptyText: { fontSize: FontSize.caption, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.xl },
});
