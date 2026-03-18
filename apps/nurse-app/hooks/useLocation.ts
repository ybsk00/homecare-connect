import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

interface LocationResult {
  latitude: number;
  longitude: number;
}

const CHECKIN_RADIUS_METERS = 100;

/**
 * 두 좌표 사이의 거리를 미터 단위로 계산합니다. (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * WKT POINT 문자열에서 위도/경도를 추출합니다.
 * "POINT(lng lat)" 형식
 */
function parseWktPoint(wkt: string): { latitude: number; longitude: number } | null {
  const match = wkt.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (!match) return null;
  return {
    longitude: parseFloat(match[1]),
    latitude: parseFloat(match[2]),
  };
}

export function useLocation(targetLocationWkt?: string) {
  const [currentLocation, setCurrentLocation] = useState<LocationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isWithinRange, setIsWithinRange] = useState(false);

  const targetCoords = targetLocationWkt
    ? parseWktPoint(targetLocationWkt)
    : null;

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          '위치 권한 필요',
          'GPS 체크인/체크아웃을 위해 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            { text: '설정 열기', onPress: () => Linking.openSettings() },
          ],
        );
      }

      return granted;
    } catch (error) {
      console.error('위치 권한 요청 실패:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationResult | null> => {
    setIsLoading(true);
    try {
      const permitted = hasPermission ?? (await requestPermission());
      if (!permitted) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const result: LocationResult = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(result);

      // 거리 계산
      if (targetCoords) {
        const dist = calculateDistance(
          result.latitude,
          result.longitude,
          targetCoords.latitude,
          targetCoords.longitude,
        );
        setDistance(Math.round(dist));
        setIsWithinRange(dist <= CHECKIN_RADIUS_METERS);
      }

      return result;
    } catch (error) {
      console.error('위치 조회 실패:', error);
      Alert.alert('오류', 'GPS 위치를 가져올 수 없습니다. 다시 시도해주세요.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [hasPermission, requestPermission, targetCoords]);

  // 초기 권한 확인
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  return {
    currentLocation,
    targetCoords,
    distance,
    isWithinRange,
    isLoading,
    hasPermission,
    getCurrentLocation,
    requestPermission,
    checkinRadius: CHECKIN_RADIUS_METERS,
  };
}
