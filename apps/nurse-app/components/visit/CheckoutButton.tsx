import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '@/constants/theme';

interface CheckoutButtonProps {
  distance: number | null;
  isWithinRange: boolean;
  isLoading: boolean;
  onCheckout: () => void;
  onRefreshLocation: () => void;
}

export function CheckoutButton({
  distance,
  isWithinRange,
  isLoading,
  onCheckout,
  onRefreshLocation,
}: CheckoutButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleCheckout = () => {
    setShowModal(true);
  };

  const handleConfirm = () => {
    setShowModal(false);
    onCheckout();
  };

  return (
    <View style={styles.container}>
      {distance !== null && (
        <View
          style={[
            styles.distanceInfo,
            isWithinRange ? styles.distanceGood : styles.distanceFar,
          ]}
        >
          <Text style={styles.distanceLabel}>
            {'\uD658\uC790 \uC704\uCE58\uAE4C\uC9C0'}{' '}
            <Text style={styles.distanceValue}>
              {distance < 1000
                ? `${distance}m`
                : `${(distance / 1000).toFixed(1)}km`}
            </Text>
          </Text>
        </View>
      )}

      <Button
        title={'\uC704\uCE58 \uC0C8\uB85C\uACE0\uCE68'}
        onPress={onRefreshLocation}
        variant="ghost"
        size="md"
        loading={isLoading}
        fullWidth
      />

      <View style={styles.spacer} />

      <Button
        title={'\uCCB4\uD06C\uC544\uC6C3 \uBC0F \uC81C\uCD9C'}
        onPress={handleCheckout}
        variant="primary"
        size="xl"
        fullWidth
        disabled={isLoading || distance === null}
      />

      {/* Glassmorphism confirmation modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {'\uCCB4\uD06C\uC544\uC6C3 \uD655\uC778'}
            </Text>
            <Text style={styles.modalMessage}>
              {'\uBC29\uBB38 \uAE30\uB85D\uC744 \uC81C\uCD9C\uD558\uACE0 \uCCB4\uD06C\uC544\uC6C3\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?\n\n\uC81C\uCD9C \uD6C4\uC5D0\uB294 \uC218\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>{'\uCDE8\uC18C'}</Text>
              </TouchableOpacity>
              <Button
                title={'\uC81C\uCD9C'}
                onPress={handleConfirm}
                variant="primary"
                size="lg"
                style={{ flex: 2 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xl,
  },
  distanceInfo: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
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
  },
  distanceValue: {
    fontWeight: '700',
    color: Colors.onSurface,
    fontSize: FontSize.md,
  },
  spacer: {
    height: Spacing.sm,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 28, 30, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  modalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    width: '100%',
    maxWidth: 400,
    ...Shadow.elevated,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  modalMessage: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  modalCancelText: {
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
});
