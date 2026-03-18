import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius, TouchTarget } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  leftIcon,
  rightIcon,
  required,
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
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          error ? styles.inputError : undefined,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
          ]}
          placeholderTextColor={Colors.outline}
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
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: Spacing.sm,
  },
  required: {
    color: Colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceContainerHighest,
  },
  inputFocused: {
    backgroundColor: Colors.surfaceContainerHigh,
    // Ghost border via shadow to avoid 1px border
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    backgroundColor: Colors.errorContainer,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minHeight: TouchTarget.minimum,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.sm,
  },
  iconLeft: {
    paddingLeft: Spacing.lg,
  },
  iconRight: {
    paddingRight: Spacing.lg,
  },
  error: {
    fontSize: FontSize.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
});
