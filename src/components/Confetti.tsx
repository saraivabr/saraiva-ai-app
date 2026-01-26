import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ConfettiProps {
  count?: number;
  colors?: string[];
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  color: string;
  size: number;
}

export default function Confetti({
  count = 15,
  colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'],
}: ConfettiProps) {
  const [particles, setParticles] = React.useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const x = new Animated.Value(Math.random() * width);
      const y = new Animated.Value(-20);
      const rotate = new Animated.Value(0);

      newParticles.push({
        x,
        y,
        rotate,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
      });

      // Animate each particle
      Animated.parallel([
        Animated.timing(y, {
          toValue: height + 50,
          duration: Math.random() * 2000 + 2000,
          useNativeDriver: true,
        }),
        Animated.timing(x, {
          toValue: Math.random() * width,
          duration: Math.random() * 2000 + 2000,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: Math.random() * 10 - 5,
          duration: Math.random() * 1000 + 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }

    setParticles(newParticles);
  }, [count]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              backgroundColor: particle.color,
              width: particle.size,
              height: particle.size,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                {
                  rotate: particle.rotate.interpolate({
                    inputRange: [-5, 5],
                    outputRange: ['-180deg', '180deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    borderRadius: 2,
  },
});
