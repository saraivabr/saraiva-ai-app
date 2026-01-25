import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useFeatureUsada } from './TooltipOnboarding';
import { colors, fontSize, borderRadius, spacing } from '../theme/whatsapp';

interface Props {
  featureId: string;
  posicao?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
  tamanho?: 'pequeno' | 'normal';
}

export default function BadgeNovo({ featureId, posicao = 'topRight', tamanho = 'normal' }: Props) {
  const { usada, loading } = useFeatureUsada(featureId);

  // Nao mostra enquanto carrega ou se ja foi usada
  if (loading || usada) return null;

  const posicaoStyle = {
    topRight: { top: -4, right: -4 },
    topLeft: { top: -4, left: -4 },
    bottomRight: { bottom: -4, right: -4 },
    bottomLeft: { bottom: -4, left: -4 },
  }[posicao];

  const tamanhoStyle = tamanho === 'pequeno' ? styles.badgePequeno : styles.badge;
  const textoStyle = tamanho === 'pequeno' ? styles.textoPequeno : styles.texto;

  return (
    <View style={[tamanhoStyle, posicaoStyle]}>
      <Text style={textoStyle}>NOVO</Text>
    </View>
  );
}

// Wrapper que adiciona badge automaticamente
export function ComBadgeNovo({
  children,
  featureId,
  posicao = 'topRight',
  tamanho = 'normal',
}: Props & { children: React.ReactNode }) {
  return (
    <View style={styles.wrapper}>
      {children}
      <BadgeNovo featureId={featureId} posicao={posicao} tamanho={tamanho} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#FF4444',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    zIndex: 10,
  },
  badgePequeno: {
    position: 'absolute',
    backgroundColor: '#FF4444',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    zIndex: 10,
  },
  texto: {
    color: '#FFFFFF',
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  textoPequeno: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
});
