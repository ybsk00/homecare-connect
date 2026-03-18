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
import { Colors, Spacing, FontSize, BorderRadius, TouchTarget } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'tonal' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const renderContent = () => (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'ghost' || variant === 'tonal'
              ? Colors.primary
              : Colors.onPrimary
          }
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              sizeTextStyles[size],
              variantTextStyles[variant],
              icon ? styles.textWithIcon : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </View>
  );

  // Gradient variants (primary and secondary)
  if (variant === 'primary' || variant === 'secondary') {
    const gradientColors =
      variant === 'primary'
        ? [Colors.gradient.primaryStart, Colors.gradient.primaryEnd]
        : [Colors.gradient.tealStart, Colors.gradient.tealEnd];

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            sizeStyles[size],
            fullWidth && styles.fullWidth,
            isDisabled && styles.disabled,
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    fontWeight: '700',
  },
  textWithIcon: {
    marginLeft: Spacing.sm,
  },
});

const sizeStyles: Record<string, ViewStyle> = {
  sm: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    minHeight: 40,
  },
  md: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight: TouchTarget.minimum,
  },
  lg: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minHeight: TouchTarget.comfortable,
  },
  xl: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing['2xl'],
    minHeight: TouchTarget.large,
  },
};

const sizeTextStyles: Record<string, TextStyle> = {
  sm: { fontSize: FontSize.sm },
  md: { fontSize: FontSize.md },
  lg: { fontSize: FontSize.lg },
  xl: { fontSize: FontSize.lg },
};

const variantStyles: Record<string, ViewStyle> = {
  ghost: { backgroundColor: 'transparent' },
  tonal: { backgroundColor: 'rgba(0, 32, 69, 0.08)' },
  danger: { backgroundColor: Colors.errorContainer },
};

const variantTextStyles: Record<string, TextStyle> = {
  primary: { color: Colors.onPrimary },
  secondary: { color: Colors.onPrimary },
  ghost: { color: Colors.primary },
  tonal: { color: Colors.primary },
  danger: { color: Colors.error },
};
