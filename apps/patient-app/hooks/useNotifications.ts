import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '@homecare/supabase-client';

export function useNotificationsList(limit = 30, offset = 0) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['notifications', user?.id, limit, offset],
    queryFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      return getNotifications(supabase, user.id, limit, offset);
    },
    enabled: !!user,
  });
}

export function useUnreadCount() {
  const user = useAuthStore((s) => s.user);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  const query = useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      return getUnreadCount(supabase, user.id);
    },
    enabled: !!user,
    refetchInterval: 30000, // 30초마다 갱신
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setUnreadCount(query.data);
    }
  }, [query.data, setUnreadCount]);

  // 실시간 구독
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          query.refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, query]);

  return query;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const decrementUnread = useNotificationStore((s) => s.decrementUnread);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      return markAsRead(supabase, notificationId);
    },
    onSuccess: () => {
      decrementUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const clearUnread = useNotificationStore((s) => s.clearUnread);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('로그인이 필요합니다');
      return markAllAsRead(supabase, user.id);
    },
    onSuccess: () => {
      clearUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
