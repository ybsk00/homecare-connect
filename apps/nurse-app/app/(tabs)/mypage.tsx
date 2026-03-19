import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { getNurseMonthlyVisits } from '@homecare/supabase-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';
// getMonthRange returns strings, but getNurseMonthlyVisits expects year/month numbers

interface VisitStat {
  id: string;
  status: string;
  actual_duration_min: number | null;
  scheduled_date: string;
}

export default function MyPageScreen() {
  const { profile, staffInfo, signOut } = useAuth();
  const { pendingSyncCount, manualSync, isSyncing, isOnline } = useOfflineSync();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const statsQuery = useQuery({
    queryKey: ['nurseMonthlyStats', staffInfo?.id, currentYear, currentMonth],
    queryFn: async () => {
      if (!staffInfo?.id) return null;

      const visits = await getNurseMonthlyVisits(supabase, staffInfo.id, currentYear, currentMonth);

      const total = visits?.length ?? 0;
      const completed =
        visits?.filter((v: VisitStat) => v.status === 'completed').length ?? 0;
      const totalMinutes =
        visits?.reduce(
          (sum: number, v: VisitStat) => sum + (v.actual_duration_min ?? 0),
          0,
        ) ?? 0;
      const avgMinutes =
        completed > 0 ? Math.round(totalMinutes / completed) : 0;

      return { total, completed, totalMinutes, avgMinutes };
    },
    enabled: !!staffInfo?.id,
  });

  const stats = statsQuery.data;

  const handleSignOut = () => {
    if (pendingSyncCount > 0) {
      Alert.alert(
        '\uB3D9\uAE30\uD654 \uB300\uAE30 \uC911',
        `\uB3D9\uAE30\uD654\uB418\uC9C0 \uC54A\uC740 \uAE30\uB85D\uC774 ${pendingSyncCount}\uAC74 \uC788\uC2B5\uB2C8\uB2E4. \uB85C\uADF8\uC544\uC6C3\uD558\uBA74 \uB370\uC774\uD130\uAC00 \uC190\uC2E4\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`,
        [
          { text: '\uCDE8\uC18C', style: 'cancel' },
          {
            text: '\uB3D9\uAE30\uD654 \uD6C4 \uB85C\uADF8\uC544\uC6C3',
            onPress: async () => {
              await manualSync();
              signOut();
            },
          },
          {
            text: '\uADF8\uB0E5 \uB85C\uADF8\uC544\uC6C3',
            style: 'destructive',
            onPress: signOut,
          },
        ],
      );
    } else {
      Alert.alert('\uB85C\uADF8\uC544\uC6C3', '\uB85C\uADF8\uC544\uC6C3\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?', [
        { text: '\uCDE8\uC18C', style: 'cancel' },
        { text: '\uB85C\uADF8\uC544\uC6C3', style: 'destructive', onPress: signOut },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navy gradient profile header */}
        <LinearGradient
          colors={[Colors.gradient.primaryStart, Colors.gradient.primaryEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.full_name ?? '\uAC04\uD638\uC0AC'}
            </Text>
            <Text style={styles.profileRole}>{'\uAC04\uD638\uC0AC'}</Text>
            {staffInfo?.licenseNumber && (
              <Text style={styles.licenseText}>
                {'\uBA74\uD5C8\uBC88\uD638: '}{staffInfo.licenseNumber}
              </Text>
            )}
          </View>
        </LinearGradient>

        {/* Profile meta */}
        <View style={styles.profileMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>
              {staffInfo?.currentPatientCount ?? 0}
            </Text>
            <Text style={styles.metaLabel}>{'\uB2F4\uB2F9 \uD658\uC790'}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaValue}>
              {staffInfo?.specialties?.length ?? 0}
            </Text>
            <Text style={styles.metaLabel}>{'\uC804\uBB38 \uBD84\uC57C'}</Text>
          </View>
        </View>

        {/* Monthly stats */}
        <Text style={styles.sectionTitle}>{'\uC774\uBC88 \uB2EC \uD1B5\uACC4'}</Text>
        <Card style={styles.statsCard}>
          {stats ? (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>{'\uCD1D \uBC29\uBB38'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.secondary }]}>
                  {stats.completed}
                </Text>
                <Text style={styles.statLabel}>{'\uC644\uB8CC'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round(stats.totalMinutes / 60)}h
                </Text>
                <Text style={styles.statLabel}>{'\uCD1D \uADFC\uBB34'}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.avgMinutes}{'\uBD84'}</Text>
                <Text style={styles.statLabel}>{'\uD3C9\uADE0 \uBC29\uBB38'}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noData}>
              {'\uD1B5\uACC4 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uB294 \uC911...'}
            </Text>
          )}
        </Card>

        {/* Sync status */}
        <Text style={styles.sectionTitle}>{'\uB3D9\uAE30\uD654'}</Text>
        <Card style={styles.syncCard}>
          <View style={styles.syncRow}>
            <View>
              <Text style={styles.syncLabel}>{'\uB124\uD2B8\uC6CC\uD06C \uC0C1\uD0DC'}</Text>
              <Text
                style={[
                  styles.syncStatus,
                  { color: isOnline ? Colors.secondary : Colors.tertiary },
                ]}
              >
                {isOnline ? '\uC628\uB77C\uC778' : '\uC624\uD504\uB77C\uC778'}
              </Text>
            </View>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOnline
                    ? Colors.secondary
                    : Colors.tertiary,
                },
              ]}
            />
          </View>

          {pendingSyncCount > 0 && (
            <View style={styles.syncPendingRow}>
              <Text style={styles.syncPendingText}>
                {'\uB3D9\uAE30\uD654 \uB300\uAE30: '}{pendingSyncCount}{'\uAC74'}
              </Text>
              <Button
                title={'\uC218\uB3D9 \uB3D9\uAE30\uD654'}
                onPress={manualSync}
                loading={isSyncing}
                variant="tonal"
                size="sm"
              />
            </View>
          )}
        </Card>

        {/* 업무 관리 */}
        <Text style={styles.sectionTitle}>{'\uC5C5\uBB34 \uAD00\uB9AC'}</Text>
        <Card noPadding>
          <MenuItem
            label={'\uC11C\uBE44\uC2A4 \uACC4\uD68D'}
            icon={'\uD83D\uDCCB'}
            onPress={() => router.push('/service-plan')}
          />
          <MenuItem
            label={'AI \uB9AC\uD3EC\uD2B8'}
            icon={'\uD83E\uDD16'}
            onPress={() => router.push('/ai-report')}
            last
          />
        </Card>

        {/* Settings — tonal list */}
        <Text style={styles.sectionTitle}>{'\uC124\uC815'}</Text>
        <Card noPadding>
          <MenuItem label={'\uC54C\uB9BC \uC124\uC815'} icon={'\uD83D\uDD14'} onPress={() => {}} />
          <MenuItem label={'\uACC4\uC815 \uC815\uBCF4'} icon={'\uD83D\uDC64'} onPress={() => {}} />
          <MenuItem label={'\uC571 \uC815\uBCF4'} icon={'\u2139\uFE0F'} onPress={() => {}} />
          <MenuItem
            label={'\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68'}
            icon={'\uD83D\uDD12'}
            onPress={() => {}}
            last
          />
        </Card>

        <View style={styles.logoutSection}>
          <Button
            title={'\uB85C\uADF8\uC544\uC6C3'}
            onPress={handleSignOut}
            variant="danger"
            size="lg"
            fullWidth
          />
        </View>

        <Text style={styles.versionText}>
          {'\uD648\uCF00\uC5B4\uCEE4\uB125\uD2B8 \uAC04\uD638\uC0AC'} v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  label,
  icon,
  onPress,
  last,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !last && styles.menuItemSeparator,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>{'\u203A'}</Text>
    </TouchableOpacity>
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
  // Profile header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xl,
  },
  avatarText: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileRole: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    marginTop: 2,
  },
  licenseText: {
    fontSize: FontSize.xs,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  profileMeta: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.xl,
    marginTop: -Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.ambient,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  metaLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    marginVertical: Spacing.xs,
  },
  // Section
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  // Stats
  statsCard: {
    marginHorizontal: Spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  statValue: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.onSurface,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  noData: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    padding: Spacing.xl,
  },
  // Sync
  syncCard: {
    marginHorizontal: Spacing.xl,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncLabel: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  syncStatus: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  syncPendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  syncPendingText: {
    fontSize: FontSize.sm,
    color: Colors.tertiary,
    fontWeight: '600',
  },
  // Menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minHeight: 56,
    marginHorizontal: Spacing.xl,
  },
  menuItemSeparator: {
    // Tonal transition instead of border
  },
  menuIcon: {
    fontSize: 18,
    marginRight: Spacing.lg,
    width: 24,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    fontWeight: '500',
  },
  menuArrow: {
    fontSize: FontSize.xl,
    color: Colors.onSurfaceVariant,
  },
  logoutSection: {
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  versionText: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
});
