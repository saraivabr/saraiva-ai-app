import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { painelApi, VoiceActionResult } from '../services/api';

interface VoiceCommandProps {
  visible: boolean;
  onClose: () => void;
  onAction: (result: VoiceActionResult) => void;
}

// Comandos de exemplo para ajudar o usuario
const EXEMPLOS_COMANDOS = [
  { texto: 'Manda um oi pro Joao', icone: '📤' },
  { texto: 'O que a Maria disse?', icone: '💬' },
  { texto: 'Me lembra de responder o Pedro amanha', icone: '⏰' },
  { texto: 'Quando falei com minha mae?', icone: '📅' },
  { texto: 'Resume minhas conversas de hoje', icone: '📋' },
];

export default function VoiceCommand({
  visible,
  onClose,
  onAction,
}: VoiceCommandProps) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcricao, setTranscricao] = useState('');
  const [resultado, setResultado] = useState<VoiceActionResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animacao de pulso quando escutando
  useEffect(() => {
    if (listening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [listening, pulseAnim]);

  const processarComando = useCallback(async (texto: string) => {
    if (!texto.trim()) return;

    setProcessing(true);
    setErro(null);

    try {
      const result = await painelApi.processarVoz(texto);
      setResultado(result);

      // Se acao foi executada com sucesso
      if (result.status === 'ok' || result.status === 'pronto') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.status === 'nao_entendi') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (err) {
      console.error('Erro ao processar comando:', err);
      setErro('Nao foi possivel processar o comando');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleExemploPress = async (texto: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTranscricao(texto);
    await processarComando(texto);
  };

  const handleConfirmarAcao = () => {
    if (resultado) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onAction(resultado);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setListening(false);
    setProcessing(false);
    setTranscricao('');
    setResultado(null);
    setErro(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Simulacao de escuta de voz (placeholder - integrar com expo-speech)
  const handleMicPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setListening(!listening);

    if (!listening) {
      // Simula transcricao apos 2 segundos
      setTimeout(() => {
        setListening(false);
        // Em producao, aqui viria a transcricao real do audio
      }, 2000);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✅';
      case 'pronto': return '👍';
      case 'incompleto': return '❓';
      case 'nao_entendi': return '🤔';
      case 'contato_nao_encontrado': return '🔍';
      default: return '📋';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🎤 Comando de Voz</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Microfone */}
            <TouchableOpacity
              style={styles.micContainer}
              onPress={handleMicPress}
              disabled={processing}
            >
              <Animated.View
                style={[
                  styles.micButton,
                  listening && styles.micButtonActive,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.micIcon}>{listening ? '🔴' : '🎤'}</Text>
              </Animated.View>
              <Text style={styles.micLabel}>
                {listening ? 'Escutando...' : 'Toque para falar'}
              </Text>
            </TouchableOpacity>

            {/* Transcricao */}
            {transcricao && (
              <View style={styles.transcricaoBox}>
                <Text style={styles.transcricaoLabel}>Voce disse:</Text>
                <Text style={styles.transcricaoText}>"{transcricao}"</Text>
              </View>
            )}

            {/* Loading */}
            {processing && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Processando...</Text>
              </View>
            )}

            {/* Resultado */}
            {resultado && !processing && (
              <View style={styles.resultadoBox}>
                <View style={styles.resultadoHeader}>
                  <Text style={styles.resultadoIcon}>{getStatusIcon(resultado.status)}</Text>
                  <Text style={styles.resultadoTitulo}>
                    {resultado.acao || 'Resultado'}
                  </Text>
                </View>

                <Text style={styles.resultadoMensagem}>
                  {resultado.mensagem || resultado.confirmacao || resultado.resumo}
                </Text>

                {/* Acao de confirmacao */}
                {resultado.status === 'pronto' && (
                  <View style={styles.acaoButtons}>
                    <TouchableOpacity
                      style={styles.btnConfirmar}
                      onPress={handleConfirmarAcao}
                    >
                      <Text style={styles.btnConfirmarText}>Confirmar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnCancelar}
                      onPress={handleReset}
                    >
                      <Text style={styles.btnCancelarText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Outro comando */}
                {resultado.status !== 'pronto' && (
                  <TouchableOpacity style={styles.btnOutro} onPress={handleReset}>
                    <Text style={styles.btnOutroText}>Tentar outro comando</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Erro */}
            {erro && (
              <View style={styles.erroBox}>
                <Text style={styles.erroText}>{erro}</Text>
              </View>
            )}

            {/* Exemplos */}
            {!resultado && !processing && !listening && (
              <View style={styles.exemplosSection}>
                <Text style={styles.exemplosTitulo}>Experimente dizer:</Text>
                {EXEMPLOS_COMANDOS.map((exemplo, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.exemploItem}
                    onPress={() => handleExemploPress(exemplo.texto)}
                  >
                    <Text style={styles.exemploIcon}>{exemplo.icone}</Text>
                    <Text style={styles.exemploText}>"{exemplo.texto}"</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  micContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.border,
  },
  micButtonActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  micIcon: {
    fontSize: 40,
  },
  micLabel: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  transcricaoBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  transcricaoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  transcricaoText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontStyle: 'italic',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  resultadoBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  resultadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultadoIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  resultadoTitulo: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  resultadoMensagem: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  acaoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btnConfirmar: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  btnConfirmarText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  btnCancelar: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnCancelarText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  btnOutro: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  btnOutroText: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  erroBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  erroText: {
    color: '#C62828',
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  exemplosSection: {
    marginTop: spacing.lg,
  },
  exemplosTitulo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  exemploItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  exemploIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  exemploText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
});
