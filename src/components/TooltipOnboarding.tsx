import React, { useEffect, useState, useRef } from 'react';
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
  maxExibicoes?: number; // Quantas vezes mostrar (default: 1)
  delayMs?: number; // Delay antes de aparecer
}

export default function TooltipOnboarding({
  id,
  mensagem,
  icone = '💡',
  posicao = 'bottom',
  maxExibicoes = 1,
  delayMs = 500,
}: Props) {
  const [visivel, setVisivel] = useState(false);
  const [exibicoesRestantes, setExibicoesRestantes] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkShown = async () => {
      const key = `@tooltip_count_${id}`;
      const countStr = await AsyncStorage.getItem(key);
      const count = countStr ? parseInt(countStr, 10) : 0;

      if (count < maxExibicoes) {
        setExibicoesRestantes(maxExibicoes - count);
        // Delay para nao aparecer imediatamente
        setTimeout(() => {
          setVisivel(true);
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, delayMs);
      }
    };
    checkShown();
  }, [id, opacity, maxExibicoes, delayMs]);

  const dismiss = async () => {
    const key = `@tooltip_count_${id}`;
    const countStr = await AsyncStorage.getItem(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    await AsyncStorage.setItem(key, String(count + 1));

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
        <View style={styles.textoContainer}>
          <Text style={styles.mensagem}>{mensagem}</Text>
          {exibicoesRestantes > 1 && (
            <Text style={styles.contador}>
              (mostrando {maxExibicoes - exibicoesRestantes + 1}/{maxExibicoes})
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.dismissBtn} onPress={dismiss}>
          <Text style={styles.dismissTexto}>OK</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.arrow, posicao === 'top' && styles.arrowBottom]} />
    </Animated.View>
  );
}

// Componente separado para animacao pulsante em botoes
export function PulsingHighlight({ children, ativo = true }: { children: React.ReactNode; ativo?: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!ativo) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [ativo, pulseAnim]);

  if (!ativo) return <>{children}</>;

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      {children}
    </Animated.View>
  );
}

// Hook para verificar se uma feature foi usada
export function useFeatureUsada(featureId: string) {
  const [usada, setUsada] = useState(true); // Assume usada ate verificar
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const key = `@feature_used_${featureId}`;
      const used = await AsyncStorage.getItem(key);
      setUsada(!!used);
      setLoading(false);
    };
    check();
  }, [featureId]);

  const marcarUsada = async () => {
    const key = `@feature_used_${featureId}`;
    await AsyncStorage.setItem(key, 'true');
    setUsada(true);
  };

  return { usada, loading, marcarUsada };
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
  textoContainer: {
    flex: 1,
  },
  mensagem: {
    color: colors.textLight,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  contador: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.xs,
    marginTop: 2,
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
