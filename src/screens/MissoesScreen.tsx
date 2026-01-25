import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { agentesApi, AgenteMissao } from '../services/api';
import { useFeatureUsada } from '../components/TooltipOnboarding';

interface Props {
  navigation: any;
}

export default function MissoesScreen({ navigation }: Props) {
  const [agentes, setAgentes] = useState<AgenteMissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { usada: abaUsada, marcarUsada: marcarAbaUsada } = useFeatureUsada('aba_missoes');

  // Marca a aba como usada na primeira visita
  useEffect(() => {
    if (!abaUsada) {
      marcarAbaUsada();
    }
  }, [abaUsada, marcarAbaUsada]);

  const carregarAgentes = useCallback(async () => {
    try {
      const data = await agentesApi.listarAtivos();
      setAgentes(data.agentes);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarAgentes();
  }, [carregarAgentes]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      carregarAgentes();
    });
    return unsubscribe;
  }, [navigation, carregarAgentes]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarAgentes();
  }, [carregarAgentes]);

  const pausarRetomar = async (agente: AgenteMissao) => {
    try {
      if (agente.status === 'ativo') {
        await agentesApi.pausar(agente.jid);
      } else {
        await agentesApi.retomar(agente.jid);
      }
      carregarAgentes();
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel alterar o status');
    }
  };

  const concluirMissao = (agente: AgenteMissao) => {
    Alert.alert(
      'Concluir Missao',
      'Como deseja encerrar esta missao?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Meta Atingida',
          onPress: async () => {
            await agentesApi.concluir(agente.jid, true);
            carregarAgentes();
          },
        },
        {
          text: 'Encerrar sem Sucesso',
          style: 'destructive',
          onPress: async () => {
            await agentesApi.concluir(agente.jid, false);
            carregarAgentes();
          },
        },
      ]
    );
  };

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

  const formatarData = (data: string | undefined): string => {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const renderAgente = ({ item }: { item: AgenteMissao }) => (
    <TouchableOpacity
      style={[styles.agenteCard, { borderLeftColor: statusColors[item.status] }]}
      onPress={() => navigation.navigate('Chat', { jid: item.jid, nome: item.nome_contato })}
      activeOpacity={0.7}
    >
      {/* Header com foto e info */}
      <View style={styles.cardHeader}>
        <View style={styles.contatoInfo}>
          {item.foto_url ? (
            <Image source={{ uri: item.foto_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarTexto}>
                {item.nome_contato?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.nomeContainer}>
            <Text style={styles.nomeContato}>{item.nome_contato}</Text>
            <Text style={styles.jid}>{item.jid.split('@')[0]}</Text>
          </View>
        </View>

        {/* Status e Tipo */}
        <View style={styles.tipoStatus}>
          <Text style={styles.tipoIcone}>{item.tipo_info?.icone || '🎯'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] }]}>
            <Text style={styles.statusTexto}>{item.status}</Text>
          </View>
        </View>
      </View>

      {/* Foco e Meta */}
      <View style={styles.missaoInfo}>
        <View style={styles.focoRow}>
          <Text style={styles.focoLabel}>Foco:</Text>
          <Text style={styles.focoTexto} numberOfLines={2}>{item.foco}</Text>
        </View>
        {item.meta && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Meta:</Text>
            <Text style={styles.metaTexto} numberOfLines={1}>{item.meta}</Text>
          </View>
        )}
      </View>

      {/* Estatisticas */}
      <View style={styles.estatisticas}>
        <View style={styles.estatItem}>
          <Text style={styles.estatValor}>{item.mensagens_enviadas || 0}</Text>
          <Text style={styles.estatLabel}>Enviadas</Text>
        </View>
        <View style={styles.estatItem}>
          <Text style={styles.estatValor}>{modoIcones[item.modo]}</Text>
          <Text style={styles.estatLabel}>{item.modo}</Text>
        </View>
        <View style={styles.estatItem}>
          <Text style={styles.estatValor}>{formatarData(item.criado_em)}</Text>
          <Text style={styles.estatLabel}>Iniciado</Text>
        </View>
      </View>

      {/* Acoes */}
      <View style={styles.acoes}>
        <TouchableOpacity
          style={[styles.acaoBotao, styles.acaoPausar]}
          onPress={() => pausarRetomar(item)}
        >
          <Text style={styles.acaoBotaoTexto}>
            {item.status === 'ativo' ? '⏸ Pausar' : '▶ Retomar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acaoBotao, styles.acaoConcluir]}
          onPress={() => concluirMissao(item)}
        >
          <Text style={styles.acaoBotaoTexto}>✓ Concluir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acaoBotao, styles.acaoChat]}
          onPress={() => navigation.navigate('Chat', { jid: item.jid, nome: item.nome_contato })}
        >
          <Text style={styles.acaoBotaoTexto}>💬 Chat</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.iaAccent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValor}>{agentes.filter(a => a.status === 'ativo').length}</Text>
          <Text style={styles.statLabel}>Ativos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValor}>{agentes.filter(a => a.status === 'pausado').length}</Text>
          <Text style={styles.statLabel}>Pausados</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValor}>
            {agentes.reduce((sum, a) => sum + (a.mensagens_enviadas || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Msgs Total</Text>
        </View>
      </View>

      <FlatList
        data={agentes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderAgente}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.iaAccent]}
            tintColor={colors.iaAccent}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcone}>🎯</Text>
            <Text style={styles.emptyTitulo}>Nenhuma missao ativa</Text>
            <Text style={styles.emptyTexto}>
              Ative um agente pressionando longamente uma conversa
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  statsHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.iaAccentLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValor: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.iaAccent,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  agenteCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contatoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.divider,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.iaAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTexto: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textLight,
  },
  nomeContainer: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  nomeContato: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  jid: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tipoStatus: {
    alignItems: 'flex-end',
  },
  tipoIcone: {
    fontSize: 24,
    marginBottom: spacing.xs,
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
  missaoInfo: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  focoRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  focoLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.iaAccent,
    marginRight: spacing.xs,
  },
  focoTexto: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
  },
  metaLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  metaTexto: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  estatisticas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.sm,
  },
  estatItem: {
    alignItems: 'center',
  },
  estatValor: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  estatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  acoes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acaoBotao: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  acaoPausar: {
    backgroundColor: '#FFF3E0',
  },
  acaoConcluir: {
    backgroundColor: '#E8F5E9',
  },
  acaoChat: {
    backgroundColor: colors.iaAccentLight,
  },
  acaoBotaoTexto: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyIcone: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitulo: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyTexto: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
