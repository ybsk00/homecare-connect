import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, radius, typography } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  hint,
  required = false,
  containerStyle,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
          props.multiline && styles.multiline,
        ]}
        placeholderTextColor={colors.outlineVariant}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.onSurface,
    lineHeight: 24,
    // NO border by default - tonal background defines the field
  },
  inputFocused: {
    // Ghost border at primary 40% opacity on focus
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    backgroundColor: colors.errorContainer,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hint: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
});
