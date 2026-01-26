import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { AgenteMissao } from '../services/api';

interface Props {
  visible: boolean;
  loading: boolean;
  agente: AgenteMissao | null;
  mensagens: string[];
  analise?: string;
  estrategia?: string;
  onConfirm: () => void;
  onReject: () => void;
  onEdit: () => void;
}

export default function AgentPreviewConfirm({
  visible,
  loading,
  agente,
  mensagens,
  analise,
  estrategia,
  onConfirm,
  onReject,
  onEdit,
}: Props) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  };

  const handleReject = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReject();
  };

  if (!visible) return null;

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
      {/* Header com info do agente */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcone}>
            {agente?.tipo_info?.icone || '🎯'}
          </Text>
          <View>
            <Text style={styles.headerTitulo}>
              {agente?.tipo_info?.nome || 'Agente'} quer enviar
            </Text>
            <Text style={styles.headerSubtitulo}>
              {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
            </Text>
          </View>
        </View>
        <View style={styles.modoIndicator}>
          <Text style={styles.modoText}>
            {agente?.modo === 'automatico' ? 'Auto' : agente?.modo === 'hibrido' ? 'Hibrido' : 'Manual'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.iaAccent} />
          <Text style={styles.loadingText}>Preparando resposta...</Text>
        </View>
      ) : (
        <>
          {/* Estrategia */}
          {estrategia && (
            <View style={styles.estrategiaContainer}>
              <Text style={styles.estrategiaLabel}>Estrategia:</Text>
              <Text style={styles.estrategiaText}>{estrategia}</Text>
            </View>
          )}

          {/* Preview das mensagens */}
          <ScrollView
            style={styles.previewScroll}
            showsVerticalScrollIndicator={false}
          >
            {mensagens.map((msg, idx) => (
              <View key={idx} style={styles.previewBubble}>
                <Text style={styles.previewText}>{msg}</Text>
                <View style={styles.bubbleIndicator}>
                  <Text style={styles.bubbleIndicatorText}>
                    {agente?.tipo_info?.icone || '🎯'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Acoes */}
          <View style={styles.acoesContainer}>
            <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
              <Text style={styles.rejectBtnText}>Nao enviar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
              <Text style={styles.editBtnText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Enviar</Text>
            </TouchableOpacity>
          </View>

          {/* Dica */}
          <Text style={styles.dica}>
            Toque em "Nao enviar" para rejeitar esta sugestao
          </Text>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.iaAccentLight,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcone: {
    fontSize: 28,
  },
  headerTitulo: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.iaAccent,
  },
  headerSubtitulo: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  modoIndicator: {
    backgroundColor: colors.iaAccent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  modoText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.iaAccent,
  },
  estrategiaContainer: {
    backgroundColor: '#FFF9E6',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA500',
  },
  estrategiaLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#FFA500',
    marginBottom: spacing.xs,
  },
  estrategiaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  previewScroll: {
    maxHeight: 180,
    padding: spacing.md,
  },
  previewBubble: {
    backgroundColor: colors.bubbleSent,
    padding: spacing.md,
    borderRadius: borderRadius.bubble,
    borderTopRightRadius: 0,
    marginBottom: spacing.sm,
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderLeftWidth: 3,
    borderLeftColor: colors.iaAccent,
    position: 'relative',
  },
  previewText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  bubbleIndicator: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: colors.iaAccentLight,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  bubbleIndicatorText: {
    fontSize: 10,
  },
  acoesContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rejectBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFE8E8',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  rejectBtnText: {
    fontSize: fontSize.md,
    color: '#FF4444',
    fontWeight: '500',
  },
  editBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editBtnText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontWeight: '600',
  },
  dica: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingBottom: spacing.md,
  },
});
