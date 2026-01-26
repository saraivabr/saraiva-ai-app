/**
 * AuroraGlow Component
 * Design System Saraiva.AI
 *
 * Wrapper component that adds an animated rotating gradient border
 * Creates a magical aurora effect around children
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { colors, radius } from '../../tokens';

interface AuroraGlowProps {
  children: React.ReactNode;
  active: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export const AuroraGlow: React.FC<AuroraGlowProps> = ({
  children,
  active,
  size = 2,
  style,
  borderRadius = radius.lg,
}) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      // Start continuous rotation animation
      animationRef.current = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );
      animationRef.current.start();
    } else {
      // Stop animation and reset
      if (animationRef.current) {
        animationRef.current.stop();
      }
      rotateAnim.setValue(0);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [active, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!active) {
    // Inactive state: subtle static border
    return (
      <View
        style={[
          styles.container,
          {
            borderRadius,
            borderWidth: size,
            borderColor: colors.borderLight,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Active state: animated gradient border using layered views
  return (
    <View style={[styles.outerContainer, { borderRadius }, style]}>
      {/* Gradient background layer - simulated with animated overlapping colors */}
      <Animated.View
        style={[
          styles.gradientLayer,
          {
            borderRadius: borderRadius + size,
            transform: [{ rotate: rotation }],
          },
        ]}
      >
        {/* Primary color segment */}
        <View
          style={[
            styles.colorSegment,
            styles.segmentTop,
            { backgroundColor: colors.aiPrimary },
          ]}
        />
        {/* Cyan color segment */}
        <View
          style={[
            styles.colorSegment,
            styles.segmentRight,
            { backgroundColor: colors.aiCyan },
          ]}
        />
        {/* Secondary color segment */}
        <View
          style={[
            styles.colorSegment,
            styles.segmentBottom,
            { backgroundColor: colors.aiSecondary },
          ]}
        />
        {/* Back to primary for smooth loop */}
        <View
          style={[
            styles.colorSegment,
            styles.segmentLeft,
            { backgroundColor: colors.aiPrimary },
          ]}
        />
      </Animated.View>

      {/* Inner content container */}
      <View
        style={[
          styles.innerContainer,
          {
            borderRadius,
            margin: size,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  outerContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  gradientLayer: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    overflow: 'hidden',
  },
  colorSegment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  segmentTop: {
    top: 0,
    left: 0,
    transform: [{ translateY: -50 }],
    opacity: 0.8,
  },
  segmentRight: {
    top: 0,
    right: 0,
    transform: [{ translateX: 50 }],
    opacity: 0.8,
  },
  segmentBottom: {
    bottom: 0,
    left: 0,
    transform: [{ translateY: 50 }],
    opacity: 0.8,
  },
  segmentLeft: {
    top: 0,
    left: 0,
    transform: [{ translateX: -50 }],
    opacity: 0.8,
  },
  innerContainer: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});

export default AuroraGlow;
