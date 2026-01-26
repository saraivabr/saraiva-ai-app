/**
 * Design System Saraiva.AI - ConfidenceBar
 *
 * Horizontal progress bar showing confidence level
 * with animated fill and color-coded states
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing, radius } from '../../tokens';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceBarProps {
  /** Confidence value from 0 to 100 */
  value: number;
  /** Whether to show the "Recomendado" badge for high confidence (default: true) */
  showBadge?: boolean;
  /** Whether to animate the bar fill (default: true) */
  animated?: boolean;
  /** Height of the progress bar (default: 8) */
  barHeight?: number;
  /** Custom container style */
  style?: ViewStyle;
  /** Show percentage label (default: false) */
  showPercentage?: boolean;
}

const ANIMATION_DURATION = 500;

const getConfidenceLevel = (value: number): ConfidenceLevel => {
  if (value >= 80) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
};

const getConfidenceColor = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'high':
      return colors.confidenceHigh;
    case 'medium':
      return colors.confidenceMedium;
    case 'low':
      return colors.confidenceLow;
  }
};

const getBadgeBackgroundColor = (level: ConfidenceLevel): string => {
  switch (level) {
    case 'high':
      return `${colors.confidenceHigh}20`; // 20% opacity
    case 'medium':
      return `${colors.confidenceMedium}20`;
    case 'low':
      return `${colors.confidenceLow}20`;
  }
};

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  value,
  showBadge = true,
  animated = true,
  barHeight = 8,
  style,
  showPercentage = false,
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  const confidenceLevel = getConfidenceLevel(clampedValue);
  const barColor = getConfidenceColor(confidenceLevel);

  // Animated value for progress
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Reset and animate to new value
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: clampedValue,
        duration: ANIMATION_DURATION,
        useNativeDriver: false, // We need layout animation
      }).start();
    } else {
      progressAnim.setValue(clampedValue);
    }
  }, [clampedValue, animated, progressAnim]);

  // Interpolate width percentage
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const shouldShowBadge = showBadge && confidenceLevel === 'high';

  return (
    <View style={[styles.container, style]}>
      {/* Header with label and badge */}
      <View style={styles.header}>
        {showPercentage && (
          <Text style={[styles.percentageText, { color: barColor }]}>
            {Math.round(clampedValue)}%
          </Text>
        )}

        {shouldShowBadge && (
          <View
            style={[
              styles.badge,
              { backgroundColor: getBadgeBackgroundColor(confidenceLevel) },
            ]}
          >
            <Text style={[styles.badgeText, { color: barColor }]}>
              Recomendado
            </Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View
        style={[
          styles.barContainer,
          { height: barHeight, borderRadius: barHeight / 2 },
        ]}
      >
        <Animated.View
          style={[
            styles.barFill,
            {
              width: progressWidth,
              height: barHeight,
              borderRadius: barHeight / 2,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  barContainer: {
    width: '100%',
    backgroundColor: colors.borderLight,
    overflow: 'hidden',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default ConfidenceBar;
