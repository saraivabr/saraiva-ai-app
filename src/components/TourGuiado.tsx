import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PassoTour {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  destaque?: 'varinha' | 'agente' | 'ia' | 'missoes';
}

const PASSOS_TOUR: PassoTour[] = [
  {
    id: 'bemvindo',
    titulo: 'Bem-vindo ao Saraiva.AI!',
    descricao: 'Seu assistente pessoal de WhatsApp com inteligencia artificial.\n\nVou te mostrar as principais funcoes em 4 passos rapidos.',
    icone: '👋',
  },
  {
    id: 'varinha',
    titulo: 'Varinha Magica',
    descricao: 'Em qualquer conversa, toque na varinha para a IA sugerir respostas.\n\nEla analisa o contexto e oferece 4 tons diferentes: Carinhoso, Direto, Perguntador e Diplomatico.',
    icone: '🪄',
    destaque: 'varinha',
  },
  {
    id: 'agentes',
    titulo: 'Agentes de IA',
    descricao: 'Segure uma conversa para ativar um agente.\n\nAgentes respondem automaticamente por voce com objetivos especificos: vender, agendar, cobrar, etc.',
    icone: '🎯',
    destaque: 'agente',
  },
  {
    id: 'assistente',
    titulo: 'Assistente IA',
    descricao: 'Na aba IA, converse naturalmente:\n\n"Manda oi pro Joao"\n"O que o Pedro disse?"\n"Resumo do dia"',
    icone: '✨',
    destaque: 'ia',
  },
];

const STORAGE_KEY = '@tour_completado_v1';

interface Props {
  onComplete?: () => void;
}

export default function TourGuiado({ onComplete }: Props) {
  const [visivel, setVisivel] = useState(false);
  const [passoAtual, setPassoAtual] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const checkTour = async () => {
      const completado = await AsyncStorage.getItem(STORAGE_KEY);
      if (!completado) {
        // Delay inicial para o app carregar
        setTimeout(() => {
          setVisivel(true);
          animateIn();
        }, 1000);
      }
    };
    checkTour();
  }, []);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const proximoPasso = () => {
    if (passoAtual < PASSOS_TOUR.length - 1) {
      animateOut(() => {
        setPassoAtual(passoAtual + 1);
        slideAnim.setValue(50);
        animateIn();
      });
    } else {
      finalizarTour();
    }
  };

  const pularTour = () => {
    finalizarTour();
  };

  const finalizarTour = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    animateOut(() => {
      setVisivel(false);
      onComplete?.();
    });
  };

  if (!visivel) return null;

  const passo = PASSOS_TOUR[passoAtual];
  const isUltimo = passoAtual === PASSOS_TOUR.length - 1;
  const isPrimeiro = passoAtual === 0;

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Icone principal */}
          <View style={styles.iconeContainer}>
            <Text style={styles.icone}>{passo.icone}</Text>
          </View>

          {/* Conteudo */}
          <Text style={styles.titulo}>{passo.titulo}</Text>
          <Text style={styles.descricao}>{passo.descricao}</Text>

          {/* Indicadores de progresso */}
          <View style={styles.progressoContainer}>
            {PASSOS_TOUR.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressoDot,
                  index === passoAtual && styles.progressoDotAtivo,
                  index < passoAtual && styles.progressoDotCompleto,
                ]}
              />
            ))}
          </View>

          {/* Botoes */}
          <View style={styles.botoesContainer}>
            {!isPrimeiro && (
              <TouchableOpacity
                style={styles.botaoPular}
                onPress={pularTour}
              >
                <Text style={styles.botaoPularTexto}>Pular</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.botaoProximo, isUltimo && styles.botaoComecar]}
              onPress={proximoPasso}
            >
              <Text style={styles.botaoProximoTexto}>
                {isPrimeiro ? 'Comecar tour' : isUltimo ? 'Comecar a usar!' : 'Proximo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contador de passos */}
          <Text style={styles.contador}>
            {passoAtual + 1} de {PASSOS_TOUR.length}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Hook para resetar o tour (util para desenvolvimento)
export async function resetarTour() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
  progressoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  progressoDotAtivo: {
    backgroundColor: colors.iaAccent,
    width: 24,
  },
  progressoDotCompleto: {
    backgroundColor: colors.secondary,
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    width: '100%',
  },
  botaoPular: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  botaoPularTexto: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  botaoProximo: {
    backgroundColor: colors.iaAccent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    flex: 1,
    alignItems: 'center',
  },
  botaoComecar: {
    backgroundColor: colors.secondary,
  },
  botaoProximoTexto: {
    color: colors.textLight,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  contador: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
