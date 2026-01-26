import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, QuickRepliesResponse } from '../services/api';

interface QuickReplyChipsProps {
  jid: string;
  onSelectReply: (reply: string) => void;
  visible: boolean;
}

export default function QuickReplyChips({
  jid,
  onSelectReply,
  visible,
}: QuickReplyChipsProps) {
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<string[]>([]);
  const [contexto, setContexto] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const carregarReplies = useCallback(async () => {
    if (!jid || !visible) return;

    setLoading(true);
    setError(null);

    try {
      const data = await conversasApi.quickReplies(jid, 4);
      setReplies(data.replies);
      setContexto(data.contexto);
    } catch (err) {
      console.error('Erro ao carregar quick replies:', err);
      setError('Erro ao carregar sugestoes');
      // Fallback para respostas padrao
      setReplies(['Entendi', 'Ok!', 'Vou verificar', 'Pode falar']);
    } finally {
      setLoading(false);
    }
  }, [jid, visible]);

  useEffect(() => {
    if (visible) {
      carregarReplies();
    }
  }, [visible, carregarReplies]);

  const handleSelectReply = (reply: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectReply(reply);
  };

  if (!visible) {
    return null;
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Gerando sugestoes...</Text>
        </View>
      </View>
    );
  }

  if (replies.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {contexto ? (
        <Text style={styles.contextoText}>{contexto}</Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
        keyboardShouldPersistTaps="handled"
      >
        {replies.map((reply, index) => (
          <TouchableOpacity
            key={index}
            style={styles.chip}
            onPress={() => handleSelectReply(reply)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{reply}</Text>
          </TouchableOpacity>
        ))}
        {/* Botao para recarregar */}
        <TouchableOpacity
          style={styles.reloadChip}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            carregarReplies();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.reloadText}>🔄</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingVertical: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contextoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    fontStyle: 'italic',
  },
  chipsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '500',
  },
  reloadChip: {
    backgroundColor: colors.inputBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reloadText: {
    fontSize: 16,
  },
});
