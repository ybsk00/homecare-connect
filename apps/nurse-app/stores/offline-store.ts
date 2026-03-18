import { create } from 'zustand';

interface OfflineState {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  syncProgress: { synced: number; total: number } | null;
  lastSyncAt: string | null;

  setOnline: (online: boolean) => void;
  setPendingSyncCount: (count: number) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncProgress: (progress: { synced: number; total: number } | null) => void;
  setLastSyncAt: (time: string | null) => void;
}

export const useOfflineStore = create<OfflineState>((set) => ({
  isOnline: true,
  pendingSyncCount: 0,
  isSyncing: false,
  syncProgress: null,
  lastSyncAt: null,

  setOnline: (isOnline) => set({ isOnline }),
  setPendingSyncCount: (pendingSyncCount) => set({ pendingSyncCount }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setSyncProgress: (syncProgress) => set({ syncProgress }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
}));
