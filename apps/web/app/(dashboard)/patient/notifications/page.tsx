'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { getNotifications, markAsRead, markAllAsRead } from '@homecare/supabase-client';
import {
  Bell,
  Calendar,
  Brain,
  AlertTriangle,
  Settings,
  CheckCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

type FilterTab = '전체' | '방문' | '매칭' | '레드플래그' | '시스템';

const filterTabs: { label: FilterTab; typePrefix: string | null }[] = [
  { label: '전체', typePrefix: null },
  { label: '방문', typePrefix: 'visit' },
  { label: '매칭', typePrefix: 'matching' },
  { label: '레드플래그', typePrefix: 'red_flag' },
  { label: '시스템', typePrefix: 'system' },
];

function getNotificationIcon(type: string) {
  if (type.startsWith('visit')) return Calendar;
  if (type.startsWith('matching')) return Brain;
  if (type.startsWith('red_flag')) return AlertTriangle;
  if (type.startsWith('system')) return Settings;
  return Bell;
}

function getNotificationIconColor(type: string) {
  if (type.startsWith('visit')) return 'bg-secondary/10 text-secondary';
  if (type.startsWith('matching')) return 'bg-primary/10 text-primary';
  if (type.startsWith('red_flag')) return 'bg-error-container text-error';
  if (type.startsWith('system')) return 'bg-primary/5 text-on-surface-variant';
  return 'bg-primary/5 text-on-surface-variant';
}

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}주 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}

export default function PatientNotificationsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('전체');

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getNotifications(supabase, userId!, 100, 0),
    enabled: !!userId,
  });

  const notifications = notificationsData?.data ?? [];

  const filteredNotifications = useMemo(() => {
    const tab = filterTabs.find((t) => t.label === activeFilter);
    if (!tab?.typePrefix) return notifications;
    return notifications.filter((n) => n.type.startsWith(tab.typePrefix!));
  }, [notifications, activeFilter]);

  const markOneMutation = useMutation({
    mutationFn: (notificationId: string) => markAsRead(supabase, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications', userId] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllAsRead(supabase, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications', userId] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary">Notifications</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-primary">알림</h1>
          <p className="mt-2 text-on-surface-variant">
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}건` : '모든 알림을 확인했습니다'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            className="flex items-center gap-2 rounded-2xl bg-secondary/10 px-5 py-3 text-sm font-semibold text-secondary transition-all hover:bg-secondary/15 active:scale-95 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            모두 읽음
          </button>
        )}
      </div>

      {/* Unread Counter Badge */}
      {unreadCount > 0 && (
        <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
              <Bell className="h-7 w-7 text-secondary" />
            </div>
            <div>
              <p className="text-4xl font-extrabold tracking-tight text-primary">{unreadCount}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant/60">읽지 않은 알림</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveFilter(tab.label)}
            className={clsx(
              'shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all',
              activeFilter === tab.label
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-primary/5 hover:text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-primary/5" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-lowest p-16 text-center shadow-[0_10px_40px_rgba(46,71,110,0.06)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/8">
            <Bell className="h-10 w-10 text-primary/25" />
          </div>
          <p className="mt-6 text-base font-semibold text-primary">알림이 없습니다</p>
          <p className="mt-2 text-sm text-on-surface-variant/60">새로운 알림이 도착하면 여기에 표시됩니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const iconColor = getNotificationIconColor(notification.type);

            return (
              <button
                key={notification.id}
                onClick={() => {
                  if (!notification.read) {
                    markOneMutation.mutate(notification.id);
                  }
                }}
                className={clsx(
                  'group flex w-full items-start gap-4 rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-0.5',
                  notification.read
                    ? 'bg-surface-container-lowest shadow-[0_10px_40px_rgba(46,71,110,0.06)] hover:shadow-[0_20px_60px_rgba(46,71,110,0.1)]'
                    : 'bg-secondary/5 shadow-[0_10px_40px_rgba(46,71,110,0.06)] hover:shadow-[0_20px_60px_rgba(46,71,110,0.1)]'
                )}
              >
                {/* Icon - 원형 배경 */}
                <div
                  className={clsx(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105',
                    iconColor
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className={clsx(
                        'text-sm leading-snug',
                        notification.read
                          ? 'font-medium text-on-surface-variant'
                          : 'font-bold text-primary'
                      )}
                    >
                      {notification.title}
                    </p>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-widest text-on-surface-variant/40">
                      {relativeTime(notification.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-on-surface-variant/60">
                    {notification.body}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                  <div className="mt-2 h-3 w-3 shrink-0 rounded-full bg-secondary shadow-md shadow-secondary/30" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
