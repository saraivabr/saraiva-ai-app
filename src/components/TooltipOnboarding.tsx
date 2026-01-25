import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';

interface Props {
  id: string;
  mensagem: string;
  icone?: string;
  posicao?: 'top' | 'bottom';
}

export default function TooltipOnboarding({ id, mensagem, icone = '💡', posicao = 'bottom' }: Props) {
  const [visivel, setVisivel] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const checkShown = async () => {
      const key = `@tooltip_shown_${id}`;
      const shown = await AsyncStorage.getItem(key);
      if (!shown) {
        setVisivel(true);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    };
    checkShown();
  }, [id, opacity]);

  const dismiss = async () => {
    const key = `@tooltip_shown_${id}`;
    await AsyncStorage.setItem(key, 'true');
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisivel(false));
  };

  if (!visivel) return null;

  return (
    <Animated.View style={[styles.container, { opacity }, posicao === 'top' && styles.containerTop]}>
      <View style={styles.content}>
        <Text style={styles.icone}>{icone}</Text>
        <Text style={styles.mensagem}>{mensagem}</Text>
        <TouchableOpacity style={styles.dismissBtn} onPress={dismiss}>
          <Text style={styles.dismissTexto}>OK</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.arrow, posicao === 'top' && styles.arrowBottom]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  containerTop: {
    top: 80,
    bottom: undefined,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  icone: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  mensagem: {
    flex: 1,
    color: colors.textLight,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  dismissBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  dismissTexto: {
    color: colors.textLight,
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
  arrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
  },
  arrowBottom: {
    bottom: undefined,
    top: -8,
    borderTopWidth: 0,
    borderBottomWidth: 8,
    borderBottomColor: colors.primary,
    borderTopColor: 'transparent',
  },
});
