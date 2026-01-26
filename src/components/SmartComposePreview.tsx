import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { painelApi, ComposicaoMensagem } from '../services/api';

interface SmartComposePreviewProps {
  jid: string;
  visible: boolean;
  onClose: () => void;
  onSelectMessage: (texto: string) => void;
}

const TONS_DISPONIVEIS = [
  { id: 'natural', label: 'Natural', emoji: '💬' },
  { id: 'formal', label: 'Formal', emoji: '👔' },
  { id: 'casual', label: 'Casual', emoji: '😊' },
  { id: 'direto', label: 'Direto', emoji: '🎯' },
  { id: 'carinhoso', label: 'Carinhoso', emoji: '💕' },
];

const OBJETIVOS_SUGERIDOS = [
  { id: 'reconectar', label: 'Reconectar', emoji: '🤝' },
  { id: 'marcar_encontro', label: 'Marcar Encontro', emoji: '📅' },
  { id: 'cobrar_resposta', label: 'Cobrar Resposta', emoji: '⏰' },
  { id: 'parabenizar', label: 'Parabenizar', emoji: '🎉' },
  { id: 'agradecer', label: 'Agradecer', emoji: '🙏' },
];

export default function SmartComposePreview({
  jid,
  visible,
  onClose,
  onSelectMessage,
}: SmartComposePreviewProps) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ComposicaoMensagem | null>(null);
  const [objetivo, setObjetivo] = useState('');
  const [tom, setTom] = useState('natural');
  const [contextoExtra, setContextoExtra] = useState('');
  const [etapa, setEtapa] = useState<'objetivo' | 'resultado'>('objetivo');

  const handleCompor = useCallback(async () => {
    if (!objetivo.trim()) return;

    setLoading(true);
    setEtapa('resultado');

    try {
      const data = await painelApi.compor(jid, objetivo, tom, contextoExtra || undefined);
      setResultado(data);
    } catch (err) {
      console.error('Erro ao compor mensagem:', err);
      setResultado(null);
    } finally {
      setLoading(false);
    }
  }, [jid, objetivo, tom, contextoExtra]);

  const handleSelectMessage = (texto: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelectMessage(texto);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setResultado(null);
    setObjetivo('');
    setTom('natural');
    setContextoExtra('');
    setEtapa('objetivo');
  };

  const handleClose = () => {
    handleReset();
    onClose();
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
            <Text style={styles.headerTitle}>✨ Composicao Inteligente</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {etapa === 'objetivo' ? (
            <ScrollView style={styles.content}>
              {/* Objetivo */}
              <Text style={styles.sectionTitle}>Qual seu objetivo?</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: marcar almoco, cobrar resposta, reconectar..."
                placeholderTextColor={colors.textSecondary}
                value={objetivo}
                onChangeText={setObjetivo}
                multiline
              />

              {/* Objetivos sugeridos */}
              <View style={styles.chipRow}>
                {OBJETIVOS_SUGERIDOS.map((obj) => (
                  <TouchableOpacity
                    key={obj.id}
                    style={[
                      styles.chip,
                      objetivo === obj.label && styles.chipSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setObjetivo(obj.label);
                    }}
                  >
                    <Text style={styles.chipEmoji}>{obj.emoji}</Text>
                    <Text style={[
                      styles.chipLabel,
                      objetivo === obj.label && styles.chipLabelSelected,
                    ]}>
                      {obj.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tom */}
              <Text style={styles.sectionTitle}>Tom da mensagem</Text>
              <View style={styles.chipRow}>
                {TONS_DISPONIVEIS.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.chip,
                      tom === t.id && styles.chipSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTom(t.id);
                    }}
                  >
                    <Text style={styles.chipEmoji}>{t.emoji}</Text>
                    <Text style={[
                      styles.chipLabel,
                      tom === t.id && styles.chipLabelSelected,
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Contexto extra */}
              <Text style={styles.sectionTitle}>Contexto adicional (opcional)</Text>
              <TextInput
                style={[styles.input, styles.inputSmall]}
                placeholder="Ex: ele vai viajar semana que vem..."
                placeholderTextColor={colors.textSecondary}
                value={contextoExtra}
                onChangeText={setContextoExtra}
                multiline
              />

              {/* Botao */}
              <TouchableOpacity
                style={[styles.btnCompor, !objetivo.trim() && styles.btnDisabled]}
                onPress={handleCompor}
                disabled={!objetivo.trim()}
              >
                <Text style={styles.btnComporText}>Compor Mensagem</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={styles.content}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Compondo mensagem perfeita...</Text>
                </View>
              ) : resultado ? (
                <>
                  {/* Estrategia */}
                  {resultado.estrategia && (
                    <View style={styles.estrategiaBox}>
                      <Text style={styles.estrategiaTitle}>💡 Estrategia</Text>
                      <Text style={styles.estrategiaText}>{resultado.estrategia}</Text>
                    </View>
                  )}

                  {/* Mensagem principal */}
                  <Text style={styles.sectionTitle}>Mensagem sugerida</Text>
                  <TouchableOpacity
                    style={styles.mensagemCard}
                    onPress={() => handleSelectMessage(resultado.mensagem)}
                  >
                    <Text style={styles.mensagemText}>{resultado.mensagem}</Text>
                    <Text style={styles.usarText}>Toque para usar</Text>
                  </TouchableOpacity>

                  {/* Alternativas */}
                  {resultado.alternativas && resultado.alternativas.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Alternativas</Text>
                      {resultado.alternativas.map((alt, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.alternativaCard}
                          onPress={() => handleSelectMessage(alt.texto)}
                        >
                          <Text style={styles.alternativaTexto}>{alt.texto}</Text>
                          <Text style={styles.alternativaTom}>Tom: {alt.tom}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                  {/* Dica */}
                  {resultado.dica && (
                    <View style={styles.dicaBox}>
                      <Text style={styles.dicaTitle}>📝 Dica</Text>
                      <Text style={styles.dicaText}>{resultado.dica}</Text>
                    </View>
                  )}

                  {/* Voltar */}
                  <TouchableOpacity style={styles.btnVoltar} onPress={handleReset}>
                    <Text style={styles.btnVoltarText}>← Compor outra</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Nao foi possivel compor a mensagem</Text>
                  <TouchableOpacity style={styles.btnVoltar} onPress={handleReset}>
                    <Text style={styles.btnVoltarText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
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
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputSmall: {
    minHeight: 40,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  chipLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  btnCompor: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  btnDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
  btnComporText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  estrategiaBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  estrategiaTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: spacing.xs,
  },
  estrategiaText: {
    fontSize: fontSize.sm,
    color: '#1976D2',
  },
  mensagemCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  mensagemText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  usarText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  alternativaCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  alternativaTexto: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  alternativaTom: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dicaBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  dicaTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: spacing.xs,
  },
  dicaText: {
    fontSize: fontSize.sm,
    color: '#F57C00',
  },
  btnVoltar: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  btnVoltarText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
