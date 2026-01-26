import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';

interface TypingMessageProps {
  message: string;
  delay?: number;
  speed?: number;
}

export default function TypingMessage({
  message,
  delay = 0,
  speed = 30,
}: TypingMessageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [isTyping, setIsTyping] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    // Entrada animada do balão
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    // Typing effect
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex < message.length) {
        setDisplayedText(message.substring(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setShowCursor(false);
        setIsTyping(false);
      }
    }, speed);

    // Cursor piscando
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => {
      clearInterval(typingInterval);
      clearInterval(cursorInterval);
    };
  }, [message, delay, speed]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.balao}>
        <Text style={styles.texto}>
          {displayedText}
          {showCursor && isTyping && (
            <Text style={styles.cursor}>|</Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  balao: {
    backgroundColor: colors.bubbleSent,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.bubble,
    borderTopRightRadius: 0,
  },
  texto: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  cursor: {
    color: colors.iaAccent,
    fontWeight: 'bold',
  },
});
