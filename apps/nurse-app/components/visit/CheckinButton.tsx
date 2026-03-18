import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, BorderRadius, TouchTarget } from '@/constants/theme';

interface CheckinButtonProps {
  distance: number | null;
  isWithinRange: boolean;
  isLoading: boolean;
  onCheckin: (reason?: string) => void;
  onRefreshLocation: () => void;
}

export function CheckinButton({
  distance,
  isWithinRange,
  isLoading,
  onCheckin,
  onRefreshLocation,
}: CheckinButtonProps) {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState('');

  // Teal glow pulse for in-range
  const glowOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    if (isWithinRange && distance !== null) {
      glowOpacity.value = withRepeat(
        withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [isWithinRange, distance]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleCheckin = () => {
    if (isWithinRange) {
      onCheckin();
    } else {
      setShowReasonInput(true);
    }
  };

  const handleCheckinWithReason = () => {
    if (!reason.trim()) {
      Alert.alert('\uC54C\uB9BC', '\uCCB4\uD06C\uC778 \uC0AC\uC720\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.');
      return;
    }
    onCheckin(reason.trim());
  };

  return (
    <View style={styles.container}>
      {distance !== null && (
        <View style={styles.distanceBannerWrap}>
          {isWithinRange && (
            <Animated.View style={[styles.glowRing, glowStyle]} />
          )}
          <View
            style={[
              styles.distanceBanner,
              isWithinRange ? styles.distanceGood : styles.distanceFar,
            ]}
          >
            <Text style={styles.distanceLabel}>
              {'\uD658\uC790 \uC704\uCE58\uAE4C\uC9C0'}
            </Text>
            <Text style={styles.distanceValue}>
              {distance < 1000
                ? `${distance}m`
                : `${(distance / 1000).toFixed(1)}km`}
            </Text>
            {isWithinRange ? (
              <Text style={styles.distanceHintGood}>
                {'\uCCB4\uD06C\uC778 \uAC00\uB2A5'}
              </Text>
            ) : (
              <Text style={styles.distanceHintFar}>
                100m \uC774\uB0B4\uC5D0\uC11C \uCCB4\uD06C\uC778\uD558\uC138\uC694
              </Text>
            )}
          </View>
        </View>
      )}

      {!showReasonInput ? (
        <View style={styles.actions}>
          <Button
            title={'\uC704\uCE58 \uC0C8\uB85C\uACE0\uCE68'}
            onPress={onRefreshLocation}
            variant="tonal"
            size="lg"
            loading={isLoading}
            fullWidth
          />
          <View style={styles.spacer} />
          <Button
            title={isWithinRange ? '\uCCB4\uD06C\uC778' : '\uBC94\uC704 \uBC16 \uCCB4\uD06C\uC778'}
            onPress={handleCheckin}
            variant={isWithinRange ? 'primary' : 'tonal'}
            size="xl"
            fullWidth
            disabled={isLoading || distance === null}
          />
        </View>
      ) : (
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>
            {'\uCCB4\uD06C\uC778 \uC0AC\uC720\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694'}
          </Text>
          <Text style={styles.reasonHint}>
            {'\uD658\uC790 \uC704\uCE58\uB85C\uBD80\uD130 100m \uC774\uC0C1 \uB5A8\uC5B4\uC838 \uC788\uC2B5\uB2C8\uB2E4.'}
          </Text>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder={'\uC608: \uD658\uC790\uAC00 \uADFC\uCC98 \uBCD1\uC6D0\uC5D0\uC11C \uB300\uAE30 \uC911'}
            placeholderTextColor={Colors.outline}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.reasonActions}>
            <Button
              title={'\uCDE8\uC18C'}
              onPress={() => {
                setShowReasonInput(false);
                setReason('');
              }}
              variant="ghost"
              size="lg"
              style={{ flex: 1 }}
            />
            <View style={{ width: Spacing.sm }} />
            <Button
              title={'\uCCB4\uD06C\uC778'}
              onPress={handleCheckinWithReason}
              variant="primary"
              size="lg"
              style={{ flex: 2 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
  },
  distanceBannerWrap: {
    position: 'relative',
    marginBottom: Spacing.xl,
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: BorderRadius.lg + 4,
    backgroundColor: Colors.secondary,
  },
  distanceBanner: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  distanceGood: {
    backgroundColor: 'rgba(0, 106, 99, 0.08)',
  },
  distanceFar: {
    backgroundColor: Colors.warningContainer,
  },
  distanceLabel: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
  },
  distanceValue: {
    fontSize: FontSize.display,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  distanceHintGood: {
    fontSize: FontSize.md,
    color: Colors.secondary,
    marginTop: Spacing.sm,
    fontWeight: '700',
  },
  distanceHintFar: {
    fontSize: FontSize.sm,
    color: Colors.tertiary,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  actions: {
    gap: Spacing.md,
  },
  spacer: {
    height: Spacing.sm,
  },
  reasonContainer: {
    backgroundColor: Colors.warningContainer,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  reasonLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  reasonHint: {
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.lg,
  },
  reasonInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    minHeight: 80,
    marginBottom: Spacing.lg,
  },
  reasonActions: {
    flexDirection: 'row',
  },
});
