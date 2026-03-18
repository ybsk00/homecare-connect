import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  pushEnabled: boolean;

  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
  setPushEnabled: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  pushEnabled: true,

  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementUnread: () => set({ unreadCount: Math.max(0, get().unreadCount - 1) }),
  clearUnread: () => set({ unreadCount: 0 }),
  setPushEnabled: (enabled) => set({ pushEnabled: enabled }),
}));
