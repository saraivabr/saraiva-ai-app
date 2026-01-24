import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { AgenteMissao } from '../services/api';

interface Props {
  agente: AgenteMissao;
  onPress?: () => void;
  compact?: boolean;
}

export default function AgenteBadge({ agente, onPress, compact = false }: Props) {
  const statusColors: Record<string, string> = {
    ativo: colors.secondary,
    pausado: '#FFA500',
    concluido: colors.checkBlue,
    falhou: '#FF3B30',
  };

  const modoIcones: Record<string, string> = {
    automatico: '🤖',
    aprovacao: '✋',
    hibrido: '⚡',
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderColor: statusColors[agente.status] }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={styles.compactIcone}>{agente.tipo_info?.icone || '🎯'}</Text>
        <View style={[styles.statusDot, { backgroundColor: statusColors[agente.status] }]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: statusColors[agente.status] }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.tipoInfo}>
          <Text style={styles.tipoIcone}>{agente.tipo_info?.icone || '🎯'}</Text>
          <Text style={styles.tipoNome}>{agente.tipo_info?.nome || agente.tipo}</Text>
        </View>
        <View style={styles.modoStatus}>
          <Text style={styles.modoIcone}>{modoIcones[agente.modo]}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[agente.status] }]}>
            <Text style={styles.statusTexto}>{agente.status}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.foco} numberOfLines={1}>
        {agente.foco}
      </Text>

      {agente.meta && (
        <Text style={styles.meta} numberOfLines={1}>
          Meta: {agente.meta}
        </Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.estatistica}>
          {agente.mensagens_enviadas || 0} msgs enviadas
        </Text>
        {agente.modo === 'aprovacao' && (
          <Text style={styles.estatistica}>
            {agente.mensagens_aprovadas || 0}✓ {agente.mensagens_rejeitadas || 0}✕
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.iaAccentLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tipoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipoIcone: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  tipoNome: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.iaAccent,
  },
  modoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modoIcone: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusTexto: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  foco: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  estatistica: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  // Compact style
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.iaAccentLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 2,
    marginLeft: spacing.sm,
  },
  compactIcone: {
    fontSize: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.xs,
  },
});
