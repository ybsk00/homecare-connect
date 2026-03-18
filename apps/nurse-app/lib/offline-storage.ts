import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'nurse-offline-storage' });

const OFFLINE_RECORDS_KEY = 'offline_visit_records';
const OFFLINE_PHOTOS_KEY = 'offline_photos';

export interface OfflineVisitRecord {
  id: string;
  visitId: string;
  nurseId: string;
  patientId: string;
  data: {
    vitals: Record<string, number | undefined>;
    performedItems: { item: string; done: boolean; note?: string }[];
    generalCondition: string | null;
    consciousness: string | null;
    skinCondition: string | null;
    nutritionIntake: string | null;
    painScore: number | null;
    nurseNote: string | null;
    messageToGuardian: string | null;
    photos: string[];
    voiceMemoUri: string | null;
  };
  checkinAt: string | null;
  checkinLocation: string | null;
  checkoutAt: string | null;
  checkoutLocation: string | null;
  createdAt: string;
  synced: boolean;
}

/**
 * 오프라인 방문 기록을 로컬에 저장합니다.
 */
export function saveOfflineRecord(record: OfflineVisitRecord): void {
  const existing = getOfflineRecords();
  const index = existing.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    existing[index] = record;
  } else {
    existing.push(record);
  }
  storage.set(OFFLINE_RECORDS_KEY, JSON.stringify(existing));
}

/**
 * 저장된 모든 오프라인 기록을 조회합니다.
 */
export function getOfflineRecords(): OfflineVisitRecord[] {
  const raw = storage.getString(OFFLINE_RECORDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineVisitRecord[];
  } catch {
    return [];
  }
}

/**
 * 동기화 완료된 오프라인 기록을 제거합니다.
 */
export function removeOfflineRecord(recordId: string): void {
  const existing = getOfflineRecords();
  const filtered = existing.filter((r) => r.id !== recordId);
  storage.set(OFFLINE_RECORDS_KEY, JSON.stringify(filtered));
}

/**
 * 동기화 대기 중인 기록 수를 반환합니다.
 */
export function getPendingSyncCount(): number {
  const records = getOfflineRecords();
  return records.filter((r) => !r.synced).length;
}

/**
 * 특정 방문의 오프라인 기록을 조회합니다.
 */
export function getOfflineRecordByVisit(visitId: string): OfflineVisitRecord | undefined {
  const records = getOfflineRecords();
  return records.find((r) => r.visitId === visitId);
}

/**
 * 오프라인 사진 URI를 저장합니다.
 */
export function saveOfflinePhoto(visitId: string, uri: string): void {
  const raw = storage.getString(OFFLINE_PHOTOS_KEY);
  const photos: Record<string, string[]> = raw ? JSON.parse(raw) : {};
  if (!photos[visitId]) {
    photos[visitId] = [];
  }
  photos[visitId].push(uri);
  storage.set(OFFLINE_PHOTOS_KEY, JSON.stringify(photos));
}

/**
 * 특정 방문의 오프라인 사진들을 조회합니다.
 */
export function getOfflinePhotos(visitId: string): string[] {
  const raw = storage.getString(OFFLINE_PHOTOS_KEY);
  if (!raw) return [];
  const photos: Record<string, string[]> = JSON.parse(raw);
  return photos[visitId] ?? [];
}

/**
 * 특정 방문의 오프라인 사진들을 삭제합니다.
 */
export function clearOfflinePhotos(visitId: string): void {
  const raw = storage.getString(OFFLINE_PHOTOS_KEY);
  if (!raw) return;
  const photos: Record<string, string[]> = JSON.parse(raw);
  delete photos[visitId];
  storage.set(OFFLINE_PHOTOS_KEY, JSON.stringify(photos));
}

/**
 * 임시 방문 폼 데이터를 저장합니다 (앱 종료 시에도 유지).
 */
export function saveDraftFormData(visitId: string, data: Record<string, unknown>): void {
  storage.set(`draft_${visitId}`, JSON.stringify(data));
}

/**
 * 임시 방문 폼 데이터를 조회합니다.
 */
export function getDraftFormData(visitId: string): Record<string, unknown> | null {
  const raw = storage.getString(`draft_${visitId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * 임시 방문 폼 데이터를 삭제합니다.
 */
export function clearDraftFormData(visitId: string): void {
  storage.delete(`draft_${visitId}`);
}
