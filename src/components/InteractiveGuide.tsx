import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Passo do guia interativo
interface GuidePasso {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  acao: string; // Texto do botao de acao
  dica?: string;
}

// Guias disponiveis
export const GUIAS: Record<string, GuidePasso> = {
  primeira_varinha: {
    id: 'primeira_varinha',
    titulo: 'Experimente a Varinha!',
    descricao: 'Toque na varinha para a IA sugerir respostas. Voce escolhe o tom: carinhoso, direto, perguntador ou diplomatico.',
    icone: '🪄',
    acao: 'Entendi, vou experimentar!',
    dica: 'A varinha analisa a conversa e sugere respostas personalizadas',
  },
  primeiro_agente: {
    id: 'primeiro_agente',
    titulo: 'Ative um Agente!',
    descricao: 'Agentes sao IAs que ajudam voce a conduzir conversas com objetivos especificos: vender, networking, fortalecer amizades ou criar conexoes.',
    icone: '🎯',
    acao: 'Vou ativar um agente!',
    dica: 'Toque no botao 🎯 ao lado de qualquer conversa',
  },
  agente_ativado: {
    id: 'agente_ativado',
    titulo: 'Agente Ativado!',
    descricao: 'Seu agente vai analisar as mensagens e sugerir respostas. Voce SEMPRE aprova antes de enviar - nunca envia sozinho.',
    icone: '✅',
    acao: 'Otimo!',
    dica: 'Voce pode pausar ou desativar o agente a qualquer momento',
  },
  primeira_sugestao_enviada: {
    id: 'primeira_sugestao_enviada',
    titulo: 'Parabens!',
    descricao: 'Voce enviou sua primeira mensagem com ajuda da IA! Continue usando para melhorar suas conversas.',
    icone: '🎉',
    acao: 'Vamos la!',
  },
};

interface Props {
  guideId: string;
  visible: boolean;
  onDismiss: () => void;
  onAction?: () => void;
}

export default function InteractiveGuide({ guideId, visible, onDismiss, onAction }: Props) {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const guia = GUIAS[guideId];

  useEffect(() => {
    if (visible && guia) {
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, guia]);

  const handleDismiss = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Marca como visto
    await AsyncStorage.setItem(`@guide_seen_${guideId}`, 'true');

    // Anima saida
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
    ]).start(() => {
      onDismiss();
      if (onAction) onAction();
    });
  };

  if (!visible || !guia) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {/* Icone grande */}
          <View style={styles.iconeContainer}>
            <Text style={styles.icone}>{guia.icone}</Text>
          </View>

          {/* Conteudo */}
          <Text style={styles.titulo}>{guia.titulo}</Text>
          <Text style={styles.descricao}>{guia.descricao}</Text>

          {/* Dica */}
          {guia.dica && (
            <View style={styles.dicaContainer}>
              <Text style={styles.dicaIcone}>💡</Text>
              <Text style={styles.dicaTexto}>{guia.dica}</Text>
            </View>
          )}

          {/* Botao de acao */}
          <TouchableOpacity style={styles.botaoAcao} onPress={handleDismiss}>
            <Text style={styles.botaoAcaoTexto}>{guia.acao}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Hook para verificar se deve mostrar guia
export function useGuide(guideId: string) {
  const [shouldShow, setShouldShow] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkGuide = async () => {
      const seen = await AsyncStorage.getItem(`@guide_seen_${guideId}`);
      setShouldShow(!seen);
      setHasChecked(true);
    };
    checkGuide();
  }, [guideId]);

  const markSeen = async () => {
    await AsyncStorage.setItem(`@guide_seen_${guideId}`, 'true');
    setShouldShow(false);
  };

  return { shouldShow: hasChecked && shouldShow, markSeen };
}

// Hook para mostrar celebracao
export function useCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationId, setCelebrationId] = useState<string | null>(null);

  const celebrate = async (id: string) => {
    const celebrated = await AsyncStorage.getItem(`@celebrated_${id}`);
    if (!celebrated) {
      setCelebrationId(id);
      setShowCelebration(true);
      await AsyncStorage.setItem(`@celebrated_${id}`, 'true');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const dismiss = () => {
    setShowCelebration(false);
    setCelebrationId(null);
  };

  return { showCelebration, celebrationId, celebrate, dismiss };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  iconeContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.iaAccentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  icone: {
    fontSize: 40,
  },
  titulo: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  descricao: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  dicaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF9E6',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA500',
  },
  dicaIcone: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  dicaTexto: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  botaoAcao: {
    backgroundColor: colors.iaAccent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  botaoAcaoTexto: {
    color: colors.textLight,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
