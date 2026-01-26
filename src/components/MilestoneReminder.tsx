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
import { agendaApi, LembreteItem } from '../services/api';

interface MilestoneReminderProps {
  onPressContato: (jid: string, nome: string) => void;
  visible: boolean;
}

// Cores por urgencia
const CORES_URGENCIA = {
  hoje: { bg: '#FFEBEE', border: '#F44336', text: '#C62828', icon: '🔴' },
  amanha: { bg: '#FFF3E0', border: '#FF9800', text: '#E65100', icon: '🟠' },
  semana: { bg: '#E3F2FD', border: '#2196F3', text: '#1565C0', icon: '🔵' },
};

export default function MilestoneReminder({
  onPressContato,
  visible,
}: MilestoneReminderProps) {
  const [loading, setLoading] = useState(false);
  const [lembretes, setLembretes] = useState<LembreteItem[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [resumo, setResumo] = useState({ hoje: 0, amanha: 0, semana: 0 });

  const carregarLembretes = useCallback(async () => {
    if (!visible) return;

    setLoading(true);

    try {
      const data = await agendaApi.listarLembretes(7);
      setLembretes(data.lembretes.slice(0, 5));
      setResumo(data.resumo);
    } catch (err) {
      console.error('Erro ao carregar lembretes:', err);
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      carregarLembretes();
    }
  }, [visible, carregarLembretes]);

  const handleDismiss = async (lembrete: LembreteItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await agendaApi.marcarNotificado(lembrete.id);
      setLembretes(prev => prev.filter(l => l.id !== lembrete.id));
    } catch (err) {
      console.error('Erro ao marcar lembrete:', err);
    }
  };

  if (!visible || lembretes.length === 0) {
    return null;
  }

  const totalLembretes = resumo.hoje + resumo.amanha + resumo.semana;

  const getUrgencia = (diasAte: number): 'hoje' | 'amanha' | 'semana' => {
    if (diasAte === 0) return 'hoje';
    if (diasAte === 1) return 'amanha';
    return 'semana';
  };

  const renderItem = ({ item }: { item: LembreteItem }) => {
    const urgencia = getUrgencia(item.dias_ate);
    const cor = CORES_URGENCIA[urgencia];

    // Icone baseado no tipo
    const getIcone = () => {
      const icones: Record<string, string> = {
        aniversario: '🎂',
        data_especial: '⭐',
        recorrente: '🔄',
        lembrete: '📌',
        default: '📅',
      };
      return icones[item.tipo] || icones.default;
    };

    return (
      <TouchableOpacity
        style={[styles.itemContainer, { backgroundColor: cor.bg, borderLeftColor: cor.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPressContato(item.contato_jid, item.contato_nome);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          {/* Avatar/Icone */}
          <View style={styles.iconContainer}>
            {item.foto_url ? (
              <Image source={{ uri: item.foto_url }} style={styles.avatar} />
            ) : (
              <Text style={styles.itemIcone}>{getIcone()}</Text>
            )}
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={[styles.titulo, { color: cor.text }]} numberOfLines={1}>
              {item.titulo}
            </Text>
            <Text style={styles.sugestao} numberOfLines={2}>
              {item.sugestao}
            </Text>
            <Text style={styles.contato}>{item.contato_nome}</Text>
          </View>

          {/* Dias */}
          <View style={styles.diasContainer}>
            <Text style={styles.diasIcone}>{cor.icon}</Text>
            <Text style={[styles.diasTexto, { color: cor.text }]}>
              {item.dias_ate === 0 ? 'Hoje' : item.dias_ate === 1 ? 'Amanha' : `${item.dias_ate}d`}
            </Text>
          </View>
        </View>

        {/* Botao de dismiss */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => handleDismiss(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.dismissText}>✓</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcone}>🔔</Text>
          <View>
            <Text style={styles.headerTitulo}>Lembretes</Text>
            <Text style={styles.headerSubtitulo}>
              {totalLembretes} lembrete{totalLembretes !== 1 ? 's' : ''} proximos
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <View style={styles.badgeCounts}>
                {resumo.hoje > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: CORES_URGENCIA.hoje.border }]}>
                    <Text style={styles.countText}>{resumo.hoje}</Text>
                  </View>
                )}
                {resumo.amanha > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: CORES_URGENCIA.amanha.border }]}>
                    <Text style={styles.countText}>{resumo.amanha}</Text>
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
          data={lembretes}
          keyExtractor={(item) => String(item.id)}
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
    backgroundColor: '#F3E5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#CE93D8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#E1BEE7',
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
    color: '#7B1FA2',
  },
  headerSubtitulo: {
    fontSize: fontSize.xs,
    color: '#9C27B0',
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
    color: '#7B1FA2',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderLeftWidth: 4,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  itemIcone: {
    fontSize: 28,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  infoContainer: {
    flex: 1,
  },
  titulo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  sugestao: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contato: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  diasContainer: {
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  diasIcone: {
    fontSize: 12,
  },
  diasTexto: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  dismissText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: '#CE93D8',
    marginLeft: spacing.md + 40 + spacing.sm,
  },
});
