import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BorderRadius, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  noPadding?: boolean;
  variant?: 'elevated' | 'filled' | 'tonal';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Card({
  children,
  onPress,
  style,
  noPadding,
  variant = 'elevated',
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const cardStyle = [
    styles.card,
    variantStyles[variant],
    noPadding ? undefined : styles.padding,
    style,
  ];

  if (onPress) {
    return (
      <AnimatedTouchable
        style={[cardStyle, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  padding: {
    padding: Spacing.xl,
  },
});

const variantStyles: Record<string, ViewStyle> = {
  elevated: {
    backgroundColor: '#FFFFFF',
  },
  filled: {
    backgroundColor: '#F1F4F6',
  },
  tonal: {
    backgroundColor: '#E5E9EB',
  },
};
