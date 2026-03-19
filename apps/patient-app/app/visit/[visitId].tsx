import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Badge, getVisitStatusVariant } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { VitalDisplay } from '@/components/visit/VitalDisplay';
import { useVisitDetail } from '@/hooks/useVisits';
import { colors, spacing, radius, typography } from '@/constants/theme';
import {
  formatVisitStatus,
  formatDateWithDay,
  formatDuration,
  formatDateTime,
} from '@homecare/shared-utils';

export default function VisitDetailScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const visitQuery = useVisitDetail(visitId ?? null);
  const visit = visitQuery.data;

  if (visitQuery.isLoading) {
    return <Loading fullScreen message="방문 정보 불러오는 중..." />;
  }

  if (!visit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>방문 정보를 불러올 수 없습니다</Text>
      </View>
    );
  }

  const visitData = visit as any;
  const record = Array.isArray(visitData.visit_record)
    ? visitData.visit_record[0]
    : visitData.visit_record;
  const patient = visitData.patient;
  const nurseProfile = visitData.nurse?.user;
  const nurseName = Array.isArray(nurseProfile)
    ? nurseProfile[0]?.full_name
    : nurseProfile?.full_name;

  const statusLabel = formatVisitStatus(visitData.status);
  const statusVariant = getVisitStatusVariant(visitData.status);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={visitQuery.isRefetching}
          onRefresh={() => visitQuery.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      {/* Visit header */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.dateText}>
              {formatDateWithDay(visitData.scheduled_date)}
            </Text>
            {visitData.scheduled_time && (
              <Text style={styles.timeText}>{visitData.scheduled_time}</Text>
            )}
          </View>
          <Badge text={statusLabel} variant={statusVariant} size="md" />
        </View>

        <View style={styles.infoGrid}>
          {patient && (
            <InfoItem
              label="환자"
              value={Array.isArray(patient) ? patient[0]?.full_name : patient.full_name}
            />
          )}
          {nurseName && <InfoItem label="담당" value={nurseName} />}
          <InfoItem
            label="소요시간"
            value={
              visitData.actual_duration_min
                ? formatDuration(visitData.actual_duration_min)
                : `예상 ${formatDuration(visitData.estimated_duration_min)}`
            }
          />
        </View>

        {visitData.checkin_at && (
          <View style={styles.checkinInfo}>
            <Text style={styles.checkinLabel}>체크인: {formatDateTime(visitData.checkin_at)}</Text>
            {visitData.checkout_at && (
              <Text style={styles.checkinLabel}>
                체크아웃: {formatDateTime(visitData.checkout_at)}
              </Text>
            )}
          </View>
        )}
      </Card>

      {record ? (
        <>
          {/* Vitals */}
          {record.vitals && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>바이탈 사인</Text>
              <VitalDisplay vitals={record.vitals} />
            </View>
          )}

          {/* Performed items */}
          {record.performed_items && record.performed_items.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>수행 항목</Text>
              {record.performed_items.map(
                (item: { item: string; done: boolean; note?: string }, idx: number) => (
                  <View key={idx} style={styles.checkItem}>
                    <View
                      style={[
                        styles.checkDot,
                        {
                          backgroundColor: item.done
                            ? colors.secondary
                            : colors.surfaceContainerHigh,
                        },
                      ]}
                    />
                    <View style={styles.checkContent}>
                      <Text
                        style={[
                          styles.checkText,
                          !item.done && styles.checkTextUndone,
                        ]}
                      >
                        {item.item}
                      </Text>
                      {item.note && (
                        <Text style={styles.checkNote}>{item.note}</Text>
                      )}
                    </View>
                  </View>
                ),
              )}
            </Card>
          )}

          {/* Condition assessment */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>환자 상태</Text>
            <View style={styles.conditionGrid}>
              {record.general_condition && (
                <ConditionItem
                  label="전반 상태"
                  value={
                    record.general_condition === 'good'
                      ? '양호'
                      : record.general_condition === 'fair'
                        ? '보통'
                        : '불량'
                  }
                  chipColors={
                    record.general_condition === 'good'
                      ? colors.vital.normal
                      : record.general_condition === 'fair'
                        ? colors.vital.warning
                        : colors.vital.critical
                  }
                />
              )}
              {record.consciousness && (
                <ConditionItem label="의식" value={record.consciousness} />
              )}
              {record.skin_condition && (
                <ConditionItem label="피부" value={record.skin_condition} />
              )}
              {record.nutrition_intake && (
                <ConditionItem
                  label="식사 섭취"
                  value={
                    record.nutrition_intake === 'full'
                      ? '전량'
                      : record.nutrition_intake === 'half'
                        ? '반량'
                        : record.nutrition_intake === 'poor'
                          ? '소량'
                          : '거부'
                  }
                />
              )}
              {record.pain_score !== null && record.pain_score !== undefined && (
                <ConditionItem
                  label="통증"
                  value={`${record.pain_score}/10`}
                  chipColors={
                    record.pain_score >= 7
                      ? colors.vital.critical
                      : record.pain_score >= 4
                        ? colors.vital.warning
                        : colors.vital.normal
                  }
                />
              )}
              {record.mood && <ConditionItem label="기분" value={record.mood} />}
            </View>
          </Card>

          {/* Nurse note */}
          {record.nurse_note && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>간호사 메모</Text>
              <Text style={styles.noteText}>{record.nurse_note}</Text>
            </Card>
          )}

          {/* Guardian message */}
          {record.message_to_guardian && (
            <Card style={[styles.section, styles.messageBubble] as any}>
              <Text style={styles.messageLabel}>보호자님께 전달 메시지</Text>
              <Text style={styles.messageText}>{record.message_to_guardian}</Text>
            </Card>
          )}

          {/* Photos */}
          {record.photos && record.photos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>첨부 사진</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photoRow}>
                  {record.photos.map((url: string, idx: number) => (
                    <Image
                      key={idx}
                      source={{ uri: url }}
                      style={styles.photo}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </>
      ) : (
        <Card style={styles.section}>
          <Text style={styles.emptyText}>
            {visitData.status === 'completed' || visitData.status === 'checked_out'
              ? '방문 기록이 아직 작성되지 않았습니다'
              : '방문 완료 후 기록이 표시됩니다'}
          </Text>
        </Card>
      )}

      {/* Cancel reason */}
      {visitData.cancel_reason && (
        <Card style={[styles.section, styles.cancelCard] as any}>
          <Text style={styles.cancelLabel}>취소 사유</Text>
          <Text style={styles.cancelText}>{visitData.cancel_reason}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.item}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

function ConditionItem({
  label,
  value,
  chipColors,
}: {
  label: string;
  value: string;
  chipColors?: { bg: string; text: string };
}) {
  return (
    <View style={conditionStyles.item}>
      <Text style={conditionStyles.label}>{label}</Text>
      {chipColors ? (
        <View style={[conditionStyles.chip, { backgroundColor: chipColors.bg }]}>
          <Text style={[conditionStyles.chipText, { color: chipColors.text }]}>{value}</Text>
        </View>
      ) : (
        <Text style={conditionStyles.value}>{value}</Text>
      )}
    </View>
  );
}

const infoStyles = StyleSheet.create({
  item: { marginBottom: spacing.sm },
  label: { ...typography.small },
  value: { ...typography.label },
});

const conditionStyles = StyleSheet.create({
  item: { width: '48%', marginBottom: spacing.md },
  label: {
    ...typography.small,
    marginBottom: spacing.xs,
  },
  value: { ...typography.label },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: spacing.lg,
  },
  dateText: {
    ...typography.subtitle,
  },
  timeText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.xs,
    letterSpacing: -0.5,
  },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  checkinInfo: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    // Tonal separator instead of border
    backgroundColor: colors.surfaceContainerLow,
    marginHorizontal: -spacing.lg,
    marginBottom: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  checkinLabel: {
    ...typography.small,
    marginBottom: spacing.xs,
  },

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.md,
  },

  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
    marginTop: spacing.xs + 2,
  },
  checkContent: { flex: 1 },
  checkText: {
    ...typography.body,
  },
  checkTextUndone: {
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  checkNote: {
    ...typography.small,
    marginTop: spacing.xs,
  },

  conditionGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  noteText: {
    ...typography.koreanBody,
  },
  messageBubble: {
    backgroundColor: colors.surfaceContainerLow,
  },
  messageLabel: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  messageText: {
    ...typography.koreanBody,
    color: colors.primary,
  },

  photoRow: { flexDirection: 'row', gap: spacing.md },
  photo: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
  },

  emptyText: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  cancelCard: {
    backgroundColor: colors.vital.critical.bg,
  },
  cancelLabel: {
    ...typography.small,
    color: colors.error,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cancelText: {
    ...typography.body,
    color: colors.error,
  },
});
