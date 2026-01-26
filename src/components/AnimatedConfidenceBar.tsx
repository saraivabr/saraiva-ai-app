import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';

interface AnimatedConfidenceBarProps {
  confidence: number; // 0-1
  showLabel?: boolean;
}

export default function AnimatedConfidenceBar({
  confidence,
  showLabel = true
}: AnimatedConfidenceBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate bar fill with spring effect
    Animated.spring(widthAnim, {
      toValue: confidence,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();

    // Pulsing glow effect
    if (confidence >= 0.7) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [confidence]);

  const getColor = () => {
    if (confidence >= 0.7) return '#4CAF50'; // Verde
    if (confidence >= 0.4) return '#FFC107'; // Amarelo
    return '#FF5722'; // Vermelho
  };

  const getGradientColors = () => {
    if (confidence >= 0.7) return ['#4CAF50', '#66BB6A'];
    if (confidence >= 0.4) return ['#FF9800', '#FFC107'];
    return ['#F44336', '#FF5722'];
  };

  const getLabel = () => {
    if (confidence >= 0.8) return 'Alta confiança';
    if (confidence >= 0.5) return 'Média confiança';
    return 'Baixa confiança';
  };

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.bar,
            {
              width: barWidth,
              backgroundColor: getColor(),
            },
          ]}
        >
          {/* Shimmer effect */}
          <Animated.View
            style={[
              styles.shimmer,
              {
                opacity: glowOpacity,
              },
            ]}
          />
        </Animated.View>
      </View>
      {showLabel && (
        <Text style={styles.label}>{getLabel()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    minWidth: 90,
  },
});
