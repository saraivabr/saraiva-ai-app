/**
 * Design System Saraiva.AI - Button Component
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors, typography, spacing, radius, shadows } from '../../tokens';

// === Types ===
export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Button text */
  children: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Optional left icon */
  leftIcon?: React.ReactNode;
  /** Optional right icon */
  rightIcon?: React.ReactNode;
  /** Press handler */
  onPress?: () => void;
  /** Custom container style */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

// === Size configurations ===
const sizeConfig = {
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    typography: typography.buttonSmall,
    iconSize: 16,
    spinnerSize: 'small' as const,
  },
  md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    typography: typography.button,
    iconSize: 20,
    spinnerSize: 'small' as const,
  },
  lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 56,
    typography: typography.button,
    iconSize: 24,
    spinnerSize: 'small' as const,
  },
};

// === Spring configuration for press animation ===
const springConfig = {
  damping: 15,
  stiffness: 300,
  mass: 0.8,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onPress,
  style,
  testID,
}) => {
  const scale = useSharedValue(1);
  const config = sizeConfig[size];
  const isDisabled = disabled || loading;

  // Animated style for press effect
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Handle press in
  const handlePressIn = useCallback(() => {
    if (!isDisabled) {
      scale.value = withSpring(0.97, springConfig);
    }
  }, [isDisabled, scale]);

  // Handle press out
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig);
  }, [scale]);

  // Handle press with haptic feedback
  const handlePress = useCallback(() => {
    if (!isDisabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [isDisabled, onPress]);

  // Get text color based on variant
  const getTextColor = (): string => {
    if (variant === 'primary') {
      return colors.textLight;
    }
    if (variant === 'secondary') {
      return colors.aiPrimary;
    }
    return colors.aiPrimary;
  };

  // Get spinner color based on variant
  const getSpinnerColor = (): string => {
    if (variant === 'primary') {
      return colors.textLight;
    }
    return colors.aiPrimary;
  };

  // Render button content
  const renderContent = () => (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          size={config.spinnerSize}
          color={getSpinnerColor()}
        />
      ) : (
        <>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            style={[
              config.typography,
              styles.text,
              { color: getTextColor() },
            ]}
          >
            {children}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </View>
  );

  // Base button styles
  const buttonStyles: ViewStyle[] = [
    styles.base,
    {
      paddingVertical: config.paddingVertical,
      paddingHorizontal: config.paddingHorizontal,
      minHeight: config.minHeight,
    },
    fullWidth ? styles.fullWidth : {},
  ];

  // Render primary button with gradient
  if (variant === 'primary') {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={isDisabled}
        style={[animatedStyle, style, fullWidth && styles.fullWidth]}
        testID={testID}
      >
        <LinearGradient
          colors={[colors.aiPrimary, colors.aiSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            buttonStyles,
            shadows.magic,
            isDisabled && styles.disabled,
          ]}
        >
          {renderContent()}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  // Render secondary button with border
  if (variant === 'secondary') {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          animatedStyle,
          buttonStyles,
          styles.secondary,
          isDisabled && styles.disabled,
          style,
        ]}
        testID={testID}
      >
        {renderContent()}
      </AnimatedPressable>
    );
  }

  // Render ghost button (transparent)
  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        animatedStyle,
        buttonStyles,
        styles.ghost,
        isDisabled && styles.disabled,
        style,
      ]}
      testID={testID}
    >
      {renderContent()}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.aiPrimary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});

export default Button;
