import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const sizeStyle = SIZE_STYLES[size];
  const textSizeStyle = TEXT_SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  const spinnerColor =
    variant === 'ghost' || variant === 'outline'
      ? colors.primary
      : variant === 'secondary'
        ? colors.onSecondaryContainer
        : colors.onPrimary;

  const content = loading ? (
    <ActivityIndicator size="small" color={spinnerColor} />
  ) : (
    <Text
      style={[
        styles.text,
        textSizeStyle,
        VARIANT_TEXT_STYLES[variant],
        isDisabled && styles.textDisabled,
        textStyle,
      ]}
    >
      {title}
    </Text>
  );

  // Primary uses gradient
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={
            isDisabled
              ? [colors.surfaceContainerHigh, colors.surfaceContainerHigh]
              : [colors.primary, colors.primaryContainer]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            sizeStyle,
            fullWidth && styles.fullWidth,
            isDisabled && styles.disabled,
          ]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyle,
        VARIANT_STYLES[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

const SIZE_STYLES: Record<ButtonSize, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, minHeight: 36 },
  md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, minHeight: 48 },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl, minHeight: 56 },
};

const TEXT_SIZE_STYLES: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 18 },
};

const VARIANT_STYLES: Record<Exclude<ButtonVariant, 'primary'>, ViewStyle> = {
  secondary: {
    backgroundColor: colors.secondaryContainer,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    // Ghost border at primary 40% opacity - simulated with a lighter shade
    // NO 1px borders - using 1.5px+ with very subtle coloring
  },
  danger: {
    backgroundColor: colors.error,
  },
};

const VARIANT_TEXT_STYLES: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.onPrimary },
  secondary: { color: colors.onSecondaryContainer },
  ghost: { color: colors.primary },
  outline: { color: colors.primary },
  danger: { color: colors.onPrimary },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textDisabled: {
    color: colors.onSurfaceVariant,
  },
});
