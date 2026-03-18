import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useVisitFlow } from '@/hooks/useVisitFlow';
import { useLocation } from '@/hooks/useLocation';
import { useVisitStore } from '@/stores/visit-store';
import { PatientBrief } from '@/components/patient/PatientBrief';
import { CheckinButton } from '@/components/visit/CheckinButton';
import { Loading } from '@/components/ui/Loading';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function CheckinScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { visit, checkin } = useVisitFlow(visitId!);
  const todayVisits = useVisitStore((s) => s.todayVisits);

  const patientLocationWkt = useMemo(() => {
    if (!visit?.patient_id) return undefined;
    return undefined;
  }, [visit]);

  const {
    currentLocation,
    targetCoords,
    distance,
    isWithinRange,
    isLoading: locationLoading,
    getCurrentLocation,
  } = useLocation(patientLocationWkt);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const patient = visit?.patient;

  const handleCheckin = async (reason?: string) => {
    if (!currentLocation) return;

    const success = await checkin(
      currentLocation.latitude,
      currentLocation.longitude,
      reason,
    );

    if (success) {
      router.replace(`/visit/${visitId}/vitals`);
    }
  };

  if (!visit) {
    return <Loading message={'\uBC29\uBB38 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911...'} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Patient info */}
      {patient && (
        <PatientBrief
          name={patient.full_name}
          careGrade={patient.care_grade}
          mobility={patient.mobility}
          diagnosis={patient.primary_diagnosis}
          specialNotes={patient.special_notes}
        />
      )}

      {/* Address display */}
      <View style={styles.addressCard}>
        <Text style={styles.addressLabel}>{'\uBC29\uBB38 \uC8FC\uC18C'}</Text>
        <Text style={styles.addressText}>
          {patient?.address ?? '\uC8FC\uC18C \uC815\uBCF4 \uC5C6\uC74C'}
        </Text>
        {patient?.address_detail && (
          <Text style={styles.addressDetail}>{patient.address_detail}</Text>
        )}
      </View>

      {/* Map area (placeholder) */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>{'\uD83D\uDDFA\uFE0F'}</Text>
        <Text style={styles.mapSubtext}>
          {currentLocation
            ? `\uD604\uC7AC \uC704\uCE58: ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
            : '\uC704\uCE58\uB97C \uBD88\uB7EC\uC624\uB294 \uC911...'}
        </Text>
      </View>

      {/* Large gradient checkin button */}
      <CheckinButton
        distance={distance}
        isWithinRange={distance !== null ? isWithinRange : true}
        isLoading={locationLoading}
        onCheckin={handleCheckin}
        onRefreshLocation={getCurrentLocation}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  addressLabel: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: FontSize.md,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  addressDetail: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  mapPlaceholder: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: BorderRadius.lg,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  mapIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  mapSubtext: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
