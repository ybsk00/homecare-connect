import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, Radius, FontSize, Shadows, TouchTarget } from '@/constants/theme';

const typeConfig: Record<string, { icon: string; color: string }> = {
  visit: { icon: '🏠', color: Colors.secondary },
  alert: { icon: '🔔', color: Colors.error },
  red_flag: { icon: '🚨', color: Colors.error },
  schedule: { icon: '📅', color: Colors.primary },
  message: { icon: '💬', color: Colors.secondary },
  system: { icon: '⚙️', color: Colors.onSurfaceVariant },
  reminder: { icon: '⏰', color: Colors.warning },
};

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const {
    data: notifications,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['nurse-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, is_read, created_at, data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // -- Mark as read --
  const readMutation = useMutation({
    mutationFn: async (notifId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notifId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-notifications'] });
    },
  });

  // -- Mark all as read --
  const readAllMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurse-notifications'] });
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const unreadCount = (notifications ?? []).filter((n: any) => !n.is_read).length;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.secondary} />}
    >
      {/* -- Header -- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'<'} 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => readAllMutation.mutate()} activeOpacity={0.7}>
            <Text style={styles.readAllText}>전체 읽음</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 60 }} />}
      </View>

      {/* -- Unread Badge -- */}
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>읽지 않은 알림 {unreadCount}개</Text>
        </View>
      )}

      {/* -- Notification List -- */}
      {notifications && notifications.length > 0 ? (
        notifications.map((notif: any) => {
          const config = typeConfig[notif.type] ?? typeConfig.system;
          return (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notifCard, !notif.is_read && styles.notifCardUnread]}
              onPress={() => {
                if (!notif.is_read) readMutation.mutate(notif.id);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.notifIcon, { backgroundColor: `${config.color}15` }]}>
                <Text style={styles.notifIconText}>{config.icon}</Text>
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifTitleRow}>
                  <Text style={[styles.notifTitle, !notif.is_read && styles.notifTitleUnread]} numberOfLines={1}>
                    {notif.title}
                  </Text>
                  {!notif.is_read && <View style={styles.unreadDot} />}
                </View>
                {notif.body && (
                  <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                )}
                <Text style={styles.notifTime}>{timeAgo(notif.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyText}>알림이 없습니다</Text>
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

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.lg,
  },
  backButton: { paddingVertical: Spacing.sm },
  backText: { fontSize: FontSize.body, color: Colors.secondary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.bodyLarge, fontWeight: '700', color: Colors.onSurface },
  readAllText: { fontSize: FontSize.caption, color: Colors.secondary, fontWeight: '700' },

  // Unread Banner
  unreadBanner: {
    backgroundColor: Colors.vital.warning.bg, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg,
  },
  unreadText: { fontSize: FontSize.caption, fontWeight: '700', color: Colors.vital.warning.text },

  // Notification Card
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    padding: Spacing.lg, marginBottom: Spacing.sm, ...Shadows.ambient,
  },
  notifCardUnread: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderLeftWidth: 3, borderLeftColor: Colors.secondary,
  },
  notifIcon: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md,
  },
  notifIconText: { fontSize: 18 },
  notifContent: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  notifTitle: { fontSize: FontSize.caption, fontWeight: '600', color: Colors.onSurface, flex: 1 },
  notifTitleUnread: { fontWeight: '700' },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.secondary,
  },
  notifBody: {
    fontSize: FontSize.label, color: Colors.onSurfaceVariant, marginTop: 4, lineHeight: 18,
  },
  notifTime: {
    fontSize: FontSize.overline, color: Colors.outlineVariant, marginTop: Spacing.xs,
  },

  // Empty
  emptyCard: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.xl,
    padding: Spacing.xxxl, alignItems: 'center', marginTop: Spacing.xl,
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.md },
  emptyText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.onSurfaceVariant },
});
