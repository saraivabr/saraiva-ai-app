import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography, shadows } from '../design-system/tokens';
import { conversasApi, OpcaoArquetipo } from '../services/api';

interface SugestaoParam {
  opcoes: OpcaoArquetipo[];
  analise?: string;
  confianca?: number;
}

interface Props {
  route: any;
  navigation: any;
}

// Inline SuggestionCard component
interface SuggestionCardProps {
  opcao: OpcaoArquetipo;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

function SuggestionCard({ opcao, isSelected, onPress, index }: SuggestionCardProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Staggered entrance animation
  useEffect(() => {
    const delay = index * 50;
    const timeout = setTimeout(() => {
      Animated.spring(animatedValue, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  // Pulsing glow for selected card
  useEffect(() => {
    if (isSelected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [isSelected]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.8],
  });

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.suggestionCard,
          isSelected && styles.suggestionCardSelected,
          {
            opacity: animatedValue,
            transform: [{ translateY }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Glow effect for selected card */}
        {isSelected && (
          <Animated.View
            style={[
              styles.cardGlow,
              { opacity: glowOpacity },
            ]}
          />
        )}

        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{opcao.icone}</Text>
          <View style={styles.cardTitleContainer}>
            <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
              {opcao.nome}
            </Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {opcao.descricao}
            </Text>
          </View>
          {isSelected && (
            <View style={styles.checkBadge}>
              <Text style={styles.checkBadgeText}>OK</Text>
            </View>
          )}
        </View>

        {/* Message preview when selected */}
        {isSelected && opcao.mensagens && opcao.mensagens.length > 0 && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>
              {opcao.mensagens.length} {opcao.mensagens.length === 1 ? 'mensagem' : 'mensagens'}:
            </Text>
            {opcao.mensagens.map((msg, msgIndex) => (
              <View key={msgIndex} style={styles.previewBubble}>
                <Text style={styles.previewText}>{msg}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function SuggestionsScreen({ route, navigation }: Props) {
  const { jid, nome, sugestao } = route.params;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [sending, setSending] = useState(false);
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;

  // Initialize edited message with selected option
  useEffect(() => {
    if (sugestao.opcoes && sugestao.opcoes[selectedIndex]) {
      const messages = sugestao.opcoes[selectedIndex].mensagens || [];
      setEditedMessage(messages.join('\n\n'));
    }
  }, [selectedIndex, sugestao.opcoes]);

  const handleSelectOption = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIndex(index);
    setIsEditing(false);
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset to original
    if (sugestao.opcoes && sugestao.opcoes[selectedIndex]) {
      const messages = sugestao.opcoes[selectedIndex].mensagens || [];
      setEditedMessage(messages.join('\n\n'));
    }
  };

  const handleSend = async () => {
    const selectedOption = sugestao.opcoes?.[selectedIndex];
    const messagesToSend = isEditing
      ? editedMessage.split('\n\n').filter((m) => m.trim())
      : selectedOption?.mensagens || [];

    if (messagesToSend.length === 0) {
      Alert.alert('Sem mensagem', 'Nenhuma mensagem para enviar.');
      return;
    }

    // Button squish animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSending(true);
    try {
      // Send each message in sequence
      for (const msg of messagesToSend) {
        await conversasApi.enviar(jid, msg);
        // Small delay between messages
        if (messagesToSend.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // Success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate back
      navigation.goBack();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Erro ao enviar',
        'Nao foi possivel enviar a mensagem. Verifique sua conexao e tente novamente.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Tentar novamente', onPress: handleSend },
        ]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with blur */}
      <BlurView intensity={80} tint="dark" style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sugestoes</Text>
      </BlurView>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Analysis text */}
          {sugestao.analise && (
            <View style={styles.analysisContainer}>
              <Text style={styles.analysisIcon}>Analise</Text>
              <Text style={styles.analysisText}>{sugestao.analise}</Text>
            </View>
          )}

          {/* Suggestion Cards */}
          <View style={styles.cardsContainer}>
            {sugestao.opcoes?.map((opcao: OpcaoArquetipo, index: number) => (
              <SuggestionCard
                key={opcao.tipo || index}
                opcao={opcao}
                isSelected={selectedIndex === index}
                onPress={() => handleSelectOption(index)}
                index={index}
              />
            ))}
          </View>

          {/* Edit TextInput (when editing) */}
          {isEditing && (
            <View style={styles.editContainer}>
              <Text style={styles.editLabel}>Editar mensagem:</Text>
              <TextInput
                style={styles.editInput}
                value={editedMessage}
                onChangeText={setEditedMessage}
                multiline
                placeholder="Digite sua mensagem..."
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              <TouchableOpacity
                style={styles.cancelEditButton}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelEditText}>Cancelar edicao</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Fixed Footer */}
        <View style={styles.footer}>
          {!isEditing && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleEdit}
              disabled={sending}
            >
              <Text style={styles.secondaryButtonText}>Editar</Text>
            </TouchableOpacity>
          )}

          <Animated.View
            style={[
              styles.primaryButtonContainer,
              isEditing && styles.primaryButtonFull,
              { transform: [{ scale: buttonScaleAnim }] },
            ]}
          >
            <TouchableOpacity
              style={[styles.primaryButton, sending && styles.primaryButtonDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textLight} />
              ) : (
                <Text style={styles.primaryButtonText}>Enviar</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: colors.textLight,
  },
  headerTitle: {
    ...typography.headingMD,
    color: colors.textLight,
    flex: 1,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  analysisContainer: {
    backgroundColor: colors.surfaceMagic,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: colors.aiPrimary,
  },
  analysisIcon: {
    ...typography.label,
    color: colors.aiPrimary,
    marginBottom: spacing.sm,
  },
  analysisText: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  cardsContainer: {
    gap: spacing.md,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.sm,
  },
  suggestionCardSelected: {
    borderColor: colors.aiPrimary,
    borderWidth: 2,
    backgroundColor: colors.surfaceMagic,
    ...shadows.magic,
  },
  cardGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: radius.lg,
    backgroundColor: colors.aiGlow,
    zIndex: -1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headingSM,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  cardTitleSelected: {
    color: colors.aiPrimary,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  checkBadge: {
    backgroundColor: colors.aiPrimary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkBadgeText: {
    ...typography.captionSmall,
    color: colors.textLight,
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  previewBubble: {
    backgroundColor: colors.bubbleSent,
    borderRadius: radius.bubble,
    borderTopRightRadius: radius.bubbleCorner,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignSelf: 'flex-end',
    maxWidth: '90%',
  },
  previewText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  editContainer: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderMagic,
  },
  editLabel: {
    ...typography.label,
    color: colors.aiPrimary,
    marginBottom: spacing.sm,
  },
  editInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  cancelEditButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-end',
  },
  cancelEditText: {
    ...typography.buttonSmall,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl + 10 : spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  primaryButtonContainer: {
    flex: 1,
  },
  primaryButtonFull: {
    flex: 2,
  },
  primaryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.magic,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
});
