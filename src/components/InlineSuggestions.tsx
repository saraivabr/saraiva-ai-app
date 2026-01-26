import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { OpcaoArquetipo } from '../services/api';

interface Props {
  visible: boolean;
  loading: boolean;
  opcoes: OpcaoArquetipo[];
  analise?: string;
  confianca?: number;
  onSend: (mensagens: string[]) => void;
  onCancel: () => void;
}

// Visual confidence indicator with dots
const ConfidenceDots = ({ confianca }: { confianca?: number }) => {
  if (confianca === undefined) return null;

  const nivel = confianca >= 0.7 ? 3 : confianca >= 0.5 ? 2 : 1;
  const label = nivel === 3 ? 'Parece bom' : nivel === 2 ? 'Pode ajustar' : 'Revisar';

  return (
    <View style={styles.confidenceContainer}>
      <View style={styles.dotsContainer}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i <= nivel ? styles.dotActive : styles.dotInactive,
              nivel === 3 && styles.dotGreen,
              nivel === 2 && styles.dotYellow,
              nivel === 1 && styles.dotRed,
            ]}
          />
        ))}
      </View>
      <Text style={[
        styles.confidenceLabel,
        nivel === 3 && styles.labelGreen,
        nivel === 2 && styles.labelYellow,
        nivel === 1 && styles.labelRed,
      ]}>
        {label}
      </Text>
    </View>
  );
};

export default function InlineSuggestions({
  visible,
  loading,
  opcoes,
  analise,
  confianca,
  onSend,
  onCancel,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const expandAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get the first option's messages (simplified - no archetype selection)
  const mensagens = opcoes[0]?.mensagens || [];
  const previewText = mensagens[0]?.substring(0, 50) + (mensagens[0]?.length > 50 ? '...' : '') || '';

  useEffect(() => {
    if (visible) {
      setIsExpanded(false);
      setIsEditing(false);
      Animated.parallel([
        Animated.spring(expandAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(expandAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (mensagens.length > 0) {
      setEditedText(mensagens.join('\n\n'));
    }
  }, [mensagens]);

  const handleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(true);
  };

  const handleCollapse = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(false);
    setIsEditing(false);
  };

  const handleSend = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const mensagensParaEnviar = isEditing
      ? editedText.split('\n\n').filter((m) => m.trim())
      : mensagens;
    onSend(mensagensParaEnviar);
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(false);
    setIsExpanded(false);
    onCancel();
  };

  const toggleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isEditing) {
      setEditedText(mensagens.join('\n\n'));
    }
    setIsEditing(!isEditing);
  };

  if (!visible) return null;

  const maxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isExpanded ? 320 : 56],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          maxHeight: isExpanded ? 320 : 56,
          opacity: fadeAnim,
        },
      ]}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.iaAccent} />
          <Text style={styles.loadingText}>Gerando sugestao...</Text>
        </View>
      ) : !isExpanded ? (
        // Collapsed state - single line preview
        <TouchableOpacity
          style={styles.collapsedContainer}
          onPress={handleExpand}
          activeOpacity={0.7}
        >
          <Text style={styles.wandIcon}>🪄</Text>
          <Text style={styles.previewTextCollapsed} numberOfLines={1}>
            {previewText || 'Toque para ver sugestao'}
          </Text>
          <Text style={styles.expandIcon}>▼</Text>
        </TouchableOpacity>
      ) : (
        // Expanded state
        <View style={styles.expandedContainer}>
          {/* Header with confidence */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleCollapse} style={styles.collapseBtn}>
              <Text style={styles.collapseIcon}>▲</Text>
            </TouchableOpacity>
            <ConfidenceDots confianca={confianca} />
          </View>

          {/* Preview or Editor */}
          <View style={styles.contentContainer}>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editedText}
                onChangeText={setEditedText}
                multiline
                autoFocus
                placeholder="Edite sua mensagem..."
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <ScrollView
                style={styles.previewScroll}
                showsVerticalScrollIndicator={false}
              >
                {mensagens.map((msg, idx) => (
                  <View key={idx} style={styles.previewBubble}>
                    <Text style={styles.previewText}>{msg}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            {mensagens.length > 0 && (
              <TouchableOpacity style={styles.editBtn} onPress={toggleEdit}>
                <Text style={styles.editBtnText}>
                  {isEditing ? 'Preview' : 'Editar'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.sendBtn,
                mensagens.length === 0 && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={mensagens.length === 0}
            >
              <Text style={styles.sendBtnText}>Enviar</Text>
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.iaAccent,
  },
  // Collapsed state
  collapsedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.iaAccentLight,
    gap: spacing.sm,
  },
  wandIcon: {
    fontSize: 16,
  },
  previewTextCollapsed: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expandIcon: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Expanded state
  expandedContainer: {
    flex: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  collapseBtn: {
    padding: spacing.xs,
  },
  collapseIcon: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Confidence dots
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {},
  dotInactive: {
    backgroundColor: colors.border,
  },
  dotGreen: {
    backgroundColor: colors.secondary,
  },
  dotYellow: {
    backgroundColor: '#FFA500',
  },
  dotRed: {
    backgroundColor: '#FF4444',
  },
  confidenceLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  labelGreen: {
    color: colors.secondary,
  },
  labelYellow: {
    color: '#FFA500',
  },
  labelRed: {
    color: '#FF4444',
  },
  // Content
  contentContainer: {
    maxHeight: 160,
    marginBottom: spacing.sm,
  },
  previewScroll: {
    maxHeight: 160,
  },
  previewBubble: {
    backgroundColor: colors.bubbleSent,
    padding: spacing.md,
    borderRadius: borderRadius.bubble,
    borderTopRightRadius: 0,
    marginBottom: spacing.xs,
    alignSelf: 'flex-end',
    maxWidth: '90%',
  },
  previewText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  editInput: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.iaAccent,
    maxHeight: 140,
    textAlignVertical: 'top',
  },
  // Actions
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  editBtn: {
    paddingVertical: spacing.sm,
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
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  sendBtnDisabled: {
    backgroundColor: colors.textSecondary,
  },
  sendBtnText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontWeight: '600',
  },
  sendIcon: {
    fontSize: 14,
    color: colors.textLight,
  },
});
