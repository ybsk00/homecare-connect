import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { VitalChart } from '@/components/patient/VitalChart';
import { usePatientDetail } from '@/hooks/usePatients';
import { useVisitsByPatient } from '@/hooks/useVisits';
import { colors, spacing, radius, typography } from '@/constants/theme';
import {
  formatDate,
  formatCareGrade,
  formatMobility,
  formatServiceType,
  getTimeSlotLabel,
  formatPhoneNumber,
} from '@homecare/shared-utils';

export default function PatientDetailScreen() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();

  const patientQuery = usePatientDetail(patientId ?? null);
  const visitsQuery = useVisitsByPatient(patientId ?? null, 5, 0);

  const patient = patientQuery.data;

  if (patientQuery.isLoading) {
    return <Loading fullScreen />;
  }

  if (!patient) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>환자 정보를 불러올 수 없습니다</Text>
      </View>
    );
  }

  const age = new Date().getFullYear() - new Date(patient.birth_date).getFullYear();
  const genderLabel = patient.gender === 'male' ? '남성' : '여성';

  const latestVisitWithRecord = (visitsQuery.data?.data ?? []).find(
    (v: any) => v.visit_record && v.visit_record.length > 0,
  );
  const latestVitals = latestVisitWithRecord
    ? (latestVisitWithRecord as any).visit_record?.[0]?.vitals
    : null;

  const statusVariant =
    patient.status === 'active' ? 'success' : patient.status === 'paused' ? 'warning' : 'neutral';
  const statusLabel =
    patient.status === 'active' ? '활동' : patient.status === 'paused' ? '일시중지' : '퇴원';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={patientQuery.isRefetching}
          onRefresh={() => {
            patientQuery.refetch();
            visitsQuery.refetch();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.patientName}>{patient.full_name}</Text>
            <Text style={styles.patientInfo}>
              {age}세 {genderLabel} | {formatDate(patient.birth_date)}
            </Text>
          </View>
          <Badge text={statusLabel} variant={statusVariant} size="md" />
        </View>

        <View style={styles.detailGrid}>
          {patient.care_grade && (
            <DetailItem label="장기요양등급" value={formatCareGrade(patient.care_grade)} />
          )}
          {patient.mobility && (
            <DetailItem label="이동능력" value={formatMobility(patient.mobility)} />
          )}
          {patient.primary_diagnosis && (
            <DetailItem label="주진단" value={patient.primary_diagnosis} />
          )}
          {patient.preferred_time && (
            <DetailItem label="희망시간" value={getTimeSlotLabel(patient.preferred_time)} />
          )}
        </View>
      </Card>

      {/* Contact & Address */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>연락처 및 주소</Text>
        {patient.phone && (
          <Text style={styles.infoText}>{formatPhoneNumber(patient.phone)}</Text>
        )}
        <Text style={styles.infoText}>{patient.address}</Text>
        {patient.address_detail && (
          <Text style={styles.infoSubtext}>{patient.address_detail}</Text>
        )}
      </Card>

      {/* Medical info */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>의료 정보</Text>

        {patient.medical_history && (patient.medical_history as string[]).length > 0 && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>병력</Text>
            <View style={styles.tagRow}>
              {(patient.medical_history as string[]).map((item, i) => (
                <Badge key={i} text={String(item)} variant="neutral" />
              ))}
            </View>
          </View>
        )}

        {patient.current_medications && (patient.current_medications as string[]).length > 0 && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>현재 복용 약물</Text>
            <View style={styles.tagRow}>
              {(patient.current_medications as string[]).map((item, i) => (
                <Badge key={i} text={String(item)} variant="info" />
              ))}
            </View>
          </View>
        )}

        {patient.allergies && (patient.allergies as string[]).length > 0 && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>알레르기</Text>
            <View style={styles.tagRow}>
              {(patient.allergies as string[]).map((item, i) => (
                <Badge key={i} text={String(item)} variant="danger" />
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Needed services */}
      {patient.needed_services && patient.needed_services.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>필요 서비스</Text>
          <View style={styles.tagRow}>
            {patient.needed_services.map((svc) => (
              <Badge key={svc} text={formatServiceType(svc)} variant="primary" size="md" />
            ))}
          </View>
        </Card>
      )}

      {/* Latest vitals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitleStandalone}>최근 바이탈</Text>
        {latestVitals ? (
          <VitalChart vitals={latestVitals} />
        ) : (
          <Card>
            <Text style={styles.emptyText}>아직 측정된 바이탈이 없습니다</Text>
          </Card>
        )}
      </View>

      {/* Special notes */}
      {patient.special_notes && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>특이사항</Text>
          <Text style={styles.noteText}>{patient.special_notes}</Text>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="매칭 요청"
          onPress={() => router.push('/matching/request')}
          fullWidth
        />
        <Button
          title="방문 기록 보기"
          onPress={() => router.push('/(tabs)/records')}
          variant="secondary"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.item}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  item: { width: '48%', marginBottom: spacing.md },
  label: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  value: {
    ...typography.label,
  },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.error },

  headerCard: { marginBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  patientName: {
    ...typography.title,
  },
  patientInfo: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  sectionTitleStandalone: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  infoSubtext: {
    ...typography.small,
  },
  infoBlock: { marginBottom: spacing.md },
  infoLabel: {
    ...typography.small,
    marginBottom: spacing.sm,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
  },
  noteText: {
    ...typography.koreanBody,
  },
  actions: { gap: spacing.md, marginTop: spacing.xl },
});
