import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  useNotificationsList,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { colors, spacing, radius, typography } from '@/constants/theme';
import { formatRelativeTime } from '@homecare/shared-utils';
import type { Tables } from '@homecare/shared-types';

type Notification = Tables<'notifications'>;

function getNotifIcon(type: string): string {
  if (type.includes('visit')) return '📋';
  if (type.includes('matching') || type.includes('request')) return '🔍';
  if (type.includes('alert') || type.includes('red_flag')) return '🚨';
  if (type.includes('report')) return '📊';
  if (type.includes('message')) return '💬';
  return '🔔';
}

// Severity indicator using warm palette (NOT pure red)
function getSeverityColor(type: string) {
  if (type.includes('alert') || type.includes('red_flag')) {
    return colors.redFlag.orange;
  }
  if (type.includes('urgent')) {
    return colors.redFlag.yellow;
  }
  return null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const notifQuery = useNotificationsList();
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();

  const notifications = notifQuery.data?.data ?? [];
  const hasUnread = notifications.some((n: Notification) => !n.read);

  const handlePress = (notif: Notification) => {
    if (!notif.read) {
      markRead.mutate(notif.id);
    }

    const data = (notif.data ?? {}) as Record<string, unknown>;
    if (data.visit_id) {
      router.push(`/visit/${data.visit_id}`);
    } else if (data.patient_id) {
      router.push(`/patient/${data.patient_id}`);
    } else if (data.request_id) {
      router.push('/(tabs)/matching');
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = getNotifIcon(item.type);
    const severity = getSeverityColor(item.type);

    return (
      <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.7}>
        <Card
          style={[
            styles.notifCard,
            !item.read && styles.unread,
            severity && { backgroundColor: severity.bg },
          ] as any}
        >
          <View style={styles.notifRow}>
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.notifContent}>
              <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
                {item.title}
              </Text>
              <Text style={styles.notifBody} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.notifTime}>
                {formatRelativeTime(item.created_at)}
              </Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (notifQuery.isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <View style={styles.container}>
      {hasUnread && (
        <View style={styles.markAllRow}>
          <Button
            title="모두 읽음 처리"
            onPress={() => markAllRead.mutate()}
            variant="ghost"
            size="sm"
            loading={markAllRead.isPending}
          />
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item: Notification) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={notifQuery.isRefetching}
            onRefresh={() => notifQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title="알림이 없습니다"
            description="새로운 알림이 오면 여기에 표시됩니다"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  markAllRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  notifCard: {
    marginBottom: spacing.sm,
  },
  unread: {
    // Tonal background shift for unread - no borders
    backgroundColor: colors.surfaceContainerLow,
  },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { fontSize: 24, marginRight: spacing.md, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: {
    ...typography.captionMedium,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  notifTitleUnread: {
    fontWeight: '700',
  },
  notifBody: {
    ...typography.small,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  notifTime: {
    ...typography.small,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
});
