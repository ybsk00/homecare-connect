import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows } from '@/constants/theme';
import {
  Bell,
  Calendar,
  Search,
  AlertTriangle,
  Settings,
  CheckCircle,
} from '@/components/icons/TabIcons';

const FILTER_TABS = [
  { key: 'all', label: '전체' },
  { key: 'visit', label: '방문' },
  { key: 'matching', label: '매칭' },
  { key: 'red_flag', label: '레드플래그' },
  { key: 'system', label: '시스템' },
];

const NOTIFICATION_ICONS: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  visit: Calendar,
  matching: Search,
  red_flag: AlertTriangle,
  system: Settings,
};

export default function NotificationsScreen() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: notifications,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['notifications', userId, activeTab],
    queryFn: async () => {
      if (!userId) return [];
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeTab !== 'all') {
        query = query.eq('type', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const getNotificationIcon = (type: string) => {
    return NOTIFICATION_ICONS[type] ?? Bell;
  };

  const getTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  const getIconColor = (type: string) => {
    const map: Record<string, string> = {
      visit: Colors.secondary,
      matching: Colors.primary,
      red_flag: Colors.error,
      system: Colors.onSurfaceVariant,
    };
    return map[type] ?? Colors.primary;
  };

  return (
    <>
      <Stack.Screen options={{ title: '알림' }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 필터 탭 */}
        <View style={styles.tabRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {FILTER_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 알림 리스트 */}
        <View style={styles.section}>
          {isLoading ? (
            <ActivityIndicator
              color={Colors.secondary}
              style={{ paddingVertical: Spacing.xxxl }}
            />
          ) : notifications && notifications.length > 0 ? (
            <View style={styles.notificationList}>
              {notifications.map((notif: any) => {
                const Icon = getNotificationIcon(notif.type);
                const iconColor = getIconColor(notif.type);
                const isRead = notif.is_read;

                return (
                  <TouchableOpacity
                    key={notif.id}
                    style={[
                      styles.notifCard,
                      !isRead && styles.notifCardUnread,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => markAsRead(notif.id)}
                  >
                    <View
                      style={[
                        styles.notifIconWrap,
                        { backgroundColor: `${iconColor}15` },
                      ]}
                    >
                      <Icon color={iconColor} size={20} />
                    </View>
                    <View style={styles.notifContent}>
                      <View style={styles.notifHeader}>
                        <Text
                          style={[
                            styles.notifTitle,
                            !isRead && styles.notifTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {notif.title}
                        </Text>
                        {!isRead && <View style={styles.unreadDot} />}
                      </View>
                      {notif.body && (
                        <Text style={styles.notifBody} numberOfLines={2}>
                          {notif.body}
                        </Text>
                      )}
                      <Text style={styles.notifTime}>
                        {getTimeAgo(notif.created_at)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Bell color={Colors.onSurfaceVariant} size={32} />
              <Text style={styles.emptyText}>알림이 없습니다</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // Tabs
  tabRow: {
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  tabScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: Colors.onPrimary,
  },

  section: {
    paddingHorizontal: Spacing.xl,
  },

  notificationList: {
    gap: Spacing.sm,
  },
  notifCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...Shadows.ambient,
  },
  notifCardUnread: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    color: Colors.onSurface,
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '800',
    color: Colors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
    marginLeft: Spacing.sm,
  },
  notifBody: {
    fontSize: FontSize.label,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginTop: 2,
  },
  notifTime: {
    fontSize: FontSize.overline,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },

  emptyCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.ambient,
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.onSurfaceVariant,
  },
});
