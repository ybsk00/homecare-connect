import { useEffect, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '@/stores/offline-store';
import { getPendingSyncCount } from '@/lib/offline-storage';
import { syncPendingRecords } from '@/lib/sync-service';

export function useOfflineSync() {
  const {
    isOnline,
    pendingSyncCount,
    isSyncing,
    syncProgress,
    setOnline,
    setPendingSyncCount,
    setSyncing,
    setSyncProgress,
    setLastSyncAt,
  } = useOfflineStore();

  const isSyncingRef = useRef(false);

  const refreshPendingCount = useCallback(() => {
    const count = getPendingSyncCount();
    setPendingSyncCount(count);
  }, [setPendingSyncCount]);

  const performSync = useCallback(async () => {
    if (isSyncingRef.current) return;
    const count = getPendingSyncCount();
    if (count === 0) return;

    isSyncingRef.current = true;
    setSyncing(true);

    try {
      const result = await syncPendingRecords((synced, total) => {
        setSyncProgress({ synced, total });
      });

      if (result.synced > 0) {
        setLastSyncAt(new Date().toISOString());
      }

      refreshPendingCount();
    } catch (error) {
      console.error('동기화 실행 실패:', error);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
      isSyncingRef.current = false;
    }
  }, [setSyncing, setSyncProgress, setLastSyncAt, refreshPendingCount]);

  // 네트워크 상태 모니터링
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      const wasOffline = !useOfflineStore.getState().isOnline;

      setOnline(online);

      // 오프라인에서 온라인으로 복귀 시 자동 동기화
      if (online && wasOffline) {
        performSync();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setOnline, performSync]);

  // 초기 대기 건수 확인
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return {
    isOnline,
    pendingSyncCount,
    isSyncing,
    syncProgress,
    manualSync: performSync,
    refreshPendingCount,
  };
}
