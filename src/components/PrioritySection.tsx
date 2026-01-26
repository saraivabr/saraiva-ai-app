import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, ConversaPriorizada } from '../services/api';

interface PrioritySectionProps {
  onPressConversa: (jid: string, nome: string) => void;
  visible: boolean;
}

// Cores por nivel de prioridade
const CORES_NIVEL = {
  critico: { bg: '#FFEBEE', border: '#F44336', text: '#C62828' },
  alto: { bg: '#FFF3E0', border: '#FF9800', text: '#E65100' },
  medio: { bg: '#FFF8E1', border: '#FFC107', text: '#F57F17' },
  baixo: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32' },
};

// Icones por nivel
const ICONES_NIVEL = {
  critico: '🔴',
  alto: '🟠',
  medio: '🟡',
  baixo: '🟢',
};

export default function PrioritySection({
  onPressConversa,
  visible,
}: PrioritySectionProps) {
  const [loading, setLoading] = useState(false);
  const [conversas, setConversas] = useState<ConversaPriorizada[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [resumo, setResumo] = useState({ critico: 0, alto: 0, medio: 0, baixo: 0 });

  const carregarPriorizadas = useCallback(async () => {
    if (!visible) return;

    setLoading(true);

    try {
      const data = await conversasApi.listarPriorizadas(5);
      // Filtra apenas os de prioridade alta ou critica para a secao principal
      const urgentes = data.fila.filter(
        c => c.prioridade.nivel === 'critico' || c.prioridade.nivel === 'alto'
      );
      setConversas(urgentes.slice(0, 5));
      setResumo(data.resumo);
    } catch (err) {
      console.error('Erro ao carregar priorizadas:', err);
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      carregarPriorizadas();
    }
  }, [visible, carregarPriorizadas]);

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  if (!visible || conversas.length === 0) {
    return null;
  }

  const totalUrgentes = resumo.critico + resumo.alto;

  const formatarTempo = (horas: number): string => {
    if (horas < 1) {
      const minutos = Math.round(horas * 60);
      return `${minutos}min`;
    } else if (horas < 24) {
      return `${Math.round(horas)}h`;
    } else {
      const dias = Math.round(horas / 24);
      return `${dias}d`;
    }
  };

  const renderItem = ({ item }: { item: ConversaPriorizada }) => {
    const nivel = item.prioridade.nivel;
    const cor = CORES_NIVEL[nivel];
    const icone = ICONES_NIVEL[nivel];
    const tempo = formatarTempo(item.prioridade.fatores.tempo_esperando_horas);

    return (
      <TouchableOpacity
        style={[styles.itemContainer, { backgroundColor: cor.bg, borderLeftColor: cor.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPressConversa(item.jid, item.nome);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.foto_url ? (
              <Image source={{ uri: item.foto_url }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: cor.border }]}>
                <Text style={styles.avatarText}>
                  {item.nome?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={[styles.nivelBadge, { backgroundColor: cor.border }]}>
              <Text style={styles.nivelIcone}>{icone}</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <View style={styles.headerRow}>
              <Text style={[styles.nome, { color: cor.text }]} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={[styles.tempo, { color: cor.text }]}>
                ha {tempo}
              </Text>
            </View>
            <Text style={styles.motivo} numberOfLines={1}>
              {item.prioridade.motivo}
            </Text>
            {item.ultima_mensagem?.texto && (
              <Text style={styles.preview} numberOfLines={1}>
                {item.ultima_mensagem.texto}
              </Text>
            )}
          </View>

          {/* Score */}
          <View style={[styles.scoreContainer, { backgroundColor: cor.border }]}>
            <Text style={styles.scoreText}>{item.prioridade.score}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcone}>🔥</Text>
          <View>
            <Text style={styles.headerTitulo}>Responda Agora</Text>
            <Text style={styles.headerSubtitulo}>
              {totalUrgentes} conversa{totalUrgentes !== 1 ? 's' : ''} precisando de atencao
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <View style={styles.badgeCounts}>
                {resumo.critico > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: CORES_NIVEL.critico.border }]}>
                    <Text style={styles.countText}>{resumo.critico}</Text>
                  </View>
                )}
                {resumo.alto > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: CORES_NIVEL.alto.border }]}>
                    <Text style={styles.countText}>{resumo.alto}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Lista */}
      {expanded && !loading && (
        <FlatList
          data={conversas}
          keyExtractor={(item) => item.jid}
          renderItem={renderItem}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFE082',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcone: {
    fontSize: 24,
  },
  headerTitulo: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#E65100',
  },
  headerSubtitulo: {
    fontSize: fontSize.xs,
    color: '#F57C00',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeCounts: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chevron: {
    fontSize: fontSize.sm,
    color: '#E65100',
  },
  itemContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderLeftWidth: 4,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0E0E0',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  nivelBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF8E1',
  },
  nivelIcone: {
    fontSize: 8,
  },
  infoContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nome: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  tempo: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  motivo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  preview: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  scoreContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  scoreText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  separator: {
    height: 1,
    backgroundColor: '#FFE082',
    marginLeft: spacing.md + 44 + spacing.sm,
  },
});
