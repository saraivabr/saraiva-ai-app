/**
 * Design System Saraiva.AI - ThinkingIndicator
 *
 * Animated dots with wave animation and pulsing glow
 * Shows AI processing state with optional typing text effect
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, radius } from '../../tokens';

export interface ThinkingIndicatorProps {
  /** Optional text with typing effect */
  text?: string;
  /** Size of the dots (default: 8) */
  dotSize?: number;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Whether to show the glow effect (default: true) */
  showGlow?: boolean;
}

const DOT_ANIMATION_DELAY = 100; // ms delay between each dot
const DOT_ANIMATION_DURATION = 600;
const GLOW_ANIMATION_DURATION = 1500;
const TYPING_SPEED = 50; // ms per character

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  text,
  dotSize = 8,
  style,
  textStyle,
  showGlow = true,
}) => {
  // Animated values for the 3 dots
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Animated value for the glow effect
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Typing effect state
  const [displayedText, setDisplayedText] = useState('');
  const typingIndex = useRef(0);

  // Wave animation for dots
  useEffect(() => {
    const createDotAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: DOT_ANIMATION_DURATION / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: DOT_ANIMATION_DURATION / 2,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [
      createDotAnimation(dot1Anim, 0),
      createDotAnimation(dot2Anim, DOT_ANIMATION_DELAY),
      createDotAnimation(dot3Anim, DOT_ANIMATION_DELAY * 2),
    ];

    Animated.parallel(animations).start();

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [dot1Anim, dot2Anim, dot3Anim]);

  // Glow pulsing animation
  useEffect(() => {
    if (!showGlow) return;

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: GLOW_ANIMATION_DURATION / 2,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: GLOW_ANIMATION_DURATION / 2,
          useNativeDriver: true,
        }),
      ])
    );

    glowAnimation.start();

    return () => glowAnimation.stop();
  }, [glowAnim, showGlow]);

  // Typing effect for text
  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      typingIndex.current = 0;
      return;
    }

    setDisplayedText('');
    typingIndex.current = 0;

    const typeInterval = setInterval(() => {
      if (typingIndex.current < text.length) {
        setDisplayedText(text.slice(0, typingIndex.current + 1));
        typingIndex.current += 1;
      } else {
        // Reset and loop the typing animation
        typingIndex.current = 0;
        setDisplayedText('');
      }
    }, TYPING_SPEED);

    return () => clearInterval(typeInterval);
  }, [text]);

  // Interpolate dot animations for wave effect (translateY)
  const dot1TranslateY = dot1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -dotSize],
  });

  const dot2TranslateY = dot2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -dotSize],
  });

  const dot3TranslateY = dot3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -dotSize],
  });

  const renderDot = (
    animValue: Animated.AnimatedInterpolation<number>,
    index: number
  ) => {
    // Interpolate gradient effect through opacity
    const gradientProgress = index / 2; // 0, 0.5, 1
    const dotColor = index === 0
      ? colors.aiPrimary
      : index === 1
        ? '#9F75F8' // Midpoint between aiPrimary and aiSecondary
        : colors.aiSecondary;

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: dotColor,
            transform: [{ translateY: animValue }],
          },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Pulsing glow background */}
      {showGlow && (
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowAnim,
              width: dotSize * 6,
              height: dotSize * 3,
              borderRadius: dotSize * 1.5,
            },
          ]}
        />
      )}

      {/* Animated dots container */}
      <View style={styles.dotsContainer}>
        {renderDot(dot1TranslateY, 0)}
        {renderDot(dot2TranslateY, 1)}
        {renderDot(dot3TranslateY, 2)}
      </View>

      {/* Optional typing text */}
      {text && (
        <Text style={[styles.text, textStyle]}>
          {displayedText}
          <Text style={styles.cursor}>|</Text>
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 1,
  },
  dot: {
    // Size and color set dynamically
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.aiGlow,
  },
  text: {
    marginLeft: spacing.md,
    fontSize: 14,
    color: colors.aiPrimary,
    fontWeight: '500',
  },
  cursor: {
    color: colors.aiSecondary,
    fontWeight: '300',
  },
});

export default ThinkingIndicator;
