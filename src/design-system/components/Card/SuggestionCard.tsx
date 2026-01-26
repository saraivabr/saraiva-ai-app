/**
 * SuggestionCard Component
 * Design System Saraiva.AI
 *
 * Card for displaying AI suggestions with confidence indicator
 * Features press animations, haptic feedback, and glow effect when selected
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  durations,
} from '../../tokens';

interface SuggestionCardProps {
  icon: string;
  title: string;
  description: string;
  preview: string;
  confidence: number;
  isSelected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  icon,
  title,
  description,
  preview,
  confidence,
  isSelected,
  onPress,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Clamp confidence between 0 and 100
  const clampedConfidence = Math.max(0, Math.min(100, confidence));

  // Determine confidence color based on level
  const getConfidenceColor = (level: number): string => {
    if (level >= 70) return colors.confidenceHigh;
    if (level >= 40) return colors.confidenceMedium;
    return colors.confidenceLow;
  };

  const confidenceColor = getConfidenceColor(clampedConfidence);

  // Handle selected state glow animation
  useEffect(() => {
    if (isSelected) {
      // Start pulsing glow animation
      glowAnimationRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimationRef.current.start();
    } else {
      // Stop and reset glow
      if (glowAnimationRef.current) {
        glowAnimationRef.current.stop();
      }
      glowOpacity.setValue(0);
    }

    return () => {
      if (glowAnimationRef.current) {
        glowAnimationRef.current.stop();
      }
    };
  }, [isSelected, glowOpacity]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = async () => {
    // Trigger haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {/* Glow layer for selected state */}
      {isSelected && (
        <Animated.View
          style={[
            styles.glowLayer,
            {
              opacity: glowOpacity,
            },
          ]}
        />
      )}

      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
        ]}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>
            {preview}
          </Text>
        </View>

        {/* Confidence bar at bottom */}
        <View style={styles.confidenceContainer}>
          <View style={styles.confidenceBarBackground}>
            <Animated.View
              style={[
                styles.confidenceBarFill,
                {
                  width: `${clampedConfidence}%`,
                  backgroundColor: confidenceColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>
            {clampedConfidence}%
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: radius.lg + 4,
    backgroundColor: colors.aiPrimary,
    ...shadows.magicGlow,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  cardSelected: {
    borderColor: colors.aiPrimary,
    ...shadows.magic,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMagic,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    minWidth: 200,
  },
  title: {
    ...typography.headingSM,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  preview: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  confidenceContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  confidenceBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  confidenceText: {
    ...typography.captionSmall,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
});

export default SuggestionCard;
