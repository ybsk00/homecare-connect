import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTodayVisits } from '@/hooks/useTodayVisits';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { VisitStatusBadge } from '@/components/visit/VisitStatusBadge';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { formatDuration, formatCareGrade } from '@homecare/shared-utils';

export default function RouteScreen() {
  const { visits, isLoading, totalEstimatedMin } = useTodayVisits();

  const pendingVisits = useMemo(
    () =>
      visits.filter(
        (v) =>
          v.status !== 'completed' &&
          v.status !== 'checked_out' &&
          v.status !== 'cancelled',
      ),
    [visits],
  );

  const completedVisits = useMemo(
    () =>
      visits.filter(
        (v) => v.status === 'completed' || v.status === 'checked_out',
      ),
    [visits],
  );

  const openKakaoNavi = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const kakaoNaviUrl = `kakaomap://search?q=${encodedAddress}`;
    const webUrl = `https://map.kakao.com/link/search/${encodedAddress}`;

    Linking.canOpenURL(kakaoNaviUrl)
      .then((canOpen) => {
        if (canOpen) {
          Linking.openURL(kakaoNaviUrl);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  };

  if (isLoading) {
    return <Loading message={'\uB3D9\uC120 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911...'} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Map area with teal route accent */}
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapIcon}>{'\uD83D\uDDFA\uFE0F'}</Text>
          <Text style={styles.mapTitle}>{'\uC624\uB298\uC758 \uB3D9\uC120'}</Text>
          <Text style={styles.mapSubtitle}>
            {visits.length}{'\uACF3 \uBC29\uBB38 / \uC608\uC0C1 \uCD1D'} {formatDuration(totalEstimatedMin)}
          </Text>
          <View style={styles.mapAccent} />
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{pendingVisits.length}</Text>
            <Text style={styles.summaryLabel}>{'\uB0A8\uC740 \uBC29\uBB38'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: Colors.secondary }]}>
              {completedVisits.length}
            </Text>
            <Text style={styles.summaryLabel}>{'\uC644\uB8CC'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{visits.length}</Text>
            <Text style={styles.summaryLabel}>{'\uC804\uCCB4'}</Text>
          </View>
        </View>

        {/* Route list */}
        <Text style={styles.sectionTitle}>
          {'\uCD5C\uC801\uD654 \uB3D9\uC120 \uC21C\uC11C'}
        </Text>

        {visits.map((visit, index) => {
          const patient = visit.patient;
          const isCompleted =
            visit.status === 'completed' || visit.status === 'checked_out';

          return (
            <Card
              key={visit.id}
              style={[styles.routeCard, isCompleted && styles.completedCard]}
              onPress={() => router.push(`/visit/${visit.id}`)}
            >
              <View style={styles.routeHeader}>
                {/* Navy numbered markers */}
                <View style={styles.orderContainer}>
                  <View
                    style={[
                      styles.orderCircle,
                      isCompleted && styles.orderCircleCompleted,
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderNumber,
                        isCompleted && styles.orderNumberCompleted,
                      ]}
                    >
                      {isCompleted
                        ? '\u2713'
                        : (visit.visit_order ?? index + 1)}
                    </Text>
                  </View>
                  {/* Teal route line */}
                  {index < visits.length - 1 && (
                    <View style={styles.routeLine} />
                  )}
                </View>

                <View style={styles.routeContent}>
                  <View style={styles.routeNameRow}>
                    <Text style={styles.routePatientName}>
                      {patient?.full_name ?? '\uD658\uC790'}
                    </Text>
                    <VisitStatusBadge status={visit.status} />
                  </View>

                  <Text style={styles.routeAddress} numberOfLines={1}>
                    {patient?.address ?? '\uC8FC\uC18C \uC5C6\uC74C'}
                  </Text>

                  {visit.scheduled_time && (
                    <Text style={styles.routeTime}>
                      {visit.scheduled_time} ({formatDuration(visit.estimated_duration_min)})
                    </Text>
                  )}

                  {!isCompleted && patient?.address && (
                    <TouchableOpacity
                      style={styles.naviButton}
                      onPress={() => openKakaoNavi(patient.address)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.naviIcon}>{'\uD83E\uDDED'}</Text>
                      <Text style={styles.naviText}>
                        {'\uB124\uBE44\uAC8C\uC774\uC158'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          );
        })}

        {visits.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {'\uC624\uB298 \uBC29\uBB38 \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  mapPlaceholder: {
    backgroundColor: 'rgba(0, 32, 69, 0.04)',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  mapTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  mapSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  mapAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.secondary,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.onSurface,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  routeCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: 0,
    borderRadius: 0,
    backgroundColor: Colors.surface,
  },
  completedCard: {
    opacity: 0.5,
  },
  routeHeader: {
    flexDirection: 'row',
  },
  orderContainer: {
    alignItems: 'center',
    marginRight: Spacing.lg,
    width: 40,
  },
  orderCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 32, 69, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCircleCompleted: {
    backgroundColor: Colors.primary,
  },
  orderNumber: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
  },
  orderNumberCompleted: {
    color: '#FFFFFF',
  },
  routeLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.secondary,
    marginTop: Spacing.xs,
    minHeight: 20,
    opacity: 0.4,
  },
  routeContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  routeNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  routePatientName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  routeAddress: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
  },
  routeTime: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  naviButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
    borderRadius: BorderRadius.full,
  },
  naviIcon: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  naviText: {
    fontSize: FontSize.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
  },
});
