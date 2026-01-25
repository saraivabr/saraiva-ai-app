import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  SafeAreaView,
  AppState,
  AppStateStatus,
  Image,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, syncApi, agentesApi, acoesApi, Conversa, AgenteMissao, AcaoPrioritaria } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadCachedConversations, saveCachedConversations } from '../services/cache';
import { useConnectivity } from '../hooks/useConnectivity';
import AtivarAgenteModal from '../components/AtivarAgenteModal';
import CardAcaoPrioritaria from '../components/CardAcaoPrioritaria';
import TooltipOnboarding from '../components/TooltipOnboarding';

interface Props {
  navigation: any;
}

type Filtro = 'todos' | 'trabalho' | 'pessoal' | 'familia' | 'negocios' | 'vip';

const FILTROS: { id: Filtro; label: string; icone: string }[] = [
  { id: 'todos', label: 'Todos', icone: '' },
  { id: 'vip', label: 'VIP', icone: '⭐' },
  { id: 'trabalho', label: 'Trabalho', icone: '💼' },
  { id: 'pessoal', label: 'Pessoal', icone: '👤' },
  { id: 'familia', label: 'Família', icone: '👨‍👩‍👧' },
  { id: 'negocios', label: 'Negócios', icone: '💰' },
];

export default function ConversasScreen({ navigation }: Props) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<Filtro>('todos');
  const { isOnline } = useConnectivity();
  const [syncing, setSyncing] = useState(false);

  // Estado do modal de agentes
  const [modalAgenteVisivel, setModalAgenteVisivel] = useState(false);
  const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
  const [agenteAtivo, setAgenteAtivo] = useState<AgenteMissao | null>(null);
  const [agentesAtivos, setAgentesAtivos] = useState<Map<string, AgenteMissao>>(new Map());

  // Estado das ações prioritárias
  const [acaoPrioritaria, setAcaoPrioritaria] = useState<AcaoPrioritaria | null>(null);
  const [acaoDismissed, setAcaoDismissed] = useState(false);

  const carregarConversas = useCallback(async (filtro?: Filtro) => {
    try {
      const filtroKey = filtro ?? 'todos';
      let params: { categoria?: string; prioridade?: number } = {};

      if (filtroKey !== 'todos') {
        if (filtroKey === 'vip') {
          params.prioridade = 2;
        } else {
          params.categoria = filtroKey;
        }
      }

      const data = await conversasApi.listar(params);
      setConversas(data);
      await saveCachedConversations(filtroKey, data);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Carrega agentes ativos para mostrar indicador nas conversas
  const carregarAgentesAtivos = useCallback(async () => {
    try {
      const data = await agentesApi.listarAtivos();
      const mapaAgentes = new Map<string, AgenteMissao>();
      data.agentes.forEach((agente) => {
        mapaAgentes.set(agente.jid, agente);
      });
      setAgentesAtivos(mapaAgentes);
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
    }
  }, []);

  // Carrega ação prioritária
  const carregarAcaoPrioritaria = useCallback(async () => {
    if (acaoDismissed) return;
    try {
      const data = await acoesApi.listarPrioritarias(1);
      if (data.acoes.length > 0) {
        setAcaoPrioritaria(data.acoes[0]);
      } else {
        setAcaoPrioritaria(null);
      }
    } catch (error) {
      console.error('Erro ao carregar ações:', error);
    }
  }, [acaoDismissed]);

  // Abre modal para ativar/editar agente
  const abrirModalAgente = async (conversa: Conversa) => {
    setConversaSelecionada(conversa);
    // Verifica se ja tem agente ativo
    const agente = agentesAtivos.get(conversa.jid) || null;
    setAgenteAtivo(agente);
    setModalAgenteVisivel(true);
  };

  // Callback quando agente é ativado/desativado
  const handleAgenteAtivado = (agente: AgenteMissao | null) => {
    if (conversaSelecionada) {
      const novoMapa = new Map(agentesAtivos);
      if (agente) {
        novoMapa.set(conversaSelecionada.jid, agente);
      } else {
        novoMapa.delete(conversaSelecionada.jid);
      }
      setAgentesAtivos(novoMapa);
    }
  };

  // WebSocket para atualizações em tempo real
  const { isConnected } = useWebSocket({
    onNewMessage: useCallback((jid: string, mensagem: any) => {
      // Atualiza a conversa com a nova mensagem
      setConversas(prev => {
        const index = prev.findIndex(c => c.jid === jid);
        if (index === -1) {
          // Nova conversa - recarrega lista completa
          carregarConversas(filtroAtivo);
          return prev;
        }

        // Atualiza a conversa existente e move para o topo
        const updated = [...prev];
        const conversa = { ...updated[index] };
        conversa.ultima_mensagem = {
          texto: mensagem.conteudo,
          tipo: mensagem.tipo,
          data_hora: mensagem.data_hora,
          direcao: mensagem.direcao,
        };
        conversa.ultima_interacao = mensagem.data_hora;

        // Remove da posição atual e adiciona no topo
        updated.splice(index, 1);
        updated.unshift(conversa);

        return updated;
      });
    }, [carregarConversas, filtroAtivo]),
    onConnected: useCallback(() => {
      console.log('WebSocket conectado - tempo real ativo');
    }, []),
    onDisconnected: useCallback(() => {
      console.log('WebSocket desconectado - usando fallback polling');
    }, []),
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    carregarConversas(filtroAtivo);
    carregarAgentesAtivos();
    carregarAcaoPrioritaria();

    // Polling somente como fallback quando WebSocket está offline
    if (!isConnected) {
      pollingRef.current = setInterval(() => {
        carregarConversas(filtroAtivo);
        carregarAcaoPrioritaria();
      }, 10000);
    }

    // Listener para quando o app volta ao foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        carregarConversas(filtroAtivo);
        carregarAgentesAtivos();
        carregarAcaoPrioritaria();
        setAcaoDismissed(false); // Reseta dismiss quando volta
      }
      appState.current = nextAppState;
    });

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      subscription.remove();
    };
  }, [carregarConversas, carregarAgentesAtivos, carregarAcaoPrioritaria, filtroAtivo, isConnected]);

  useEffect(() => {
    let isMounted = true;
    loadCachedConversations(filtroAtivo).then((cached) => {
      if (!isMounted || !cached) return;
      setConversas(cached.data);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [filtroAtivo]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarConversas(filtroAtivo);
  }, [carregarConversas, filtroAtivo]);

  const sincronizarTudo = useCallback(async () => {
    Alert.alert(
      'Sincronizar',
      'Isso vai puxar todo o histórico do WhatsApp e atualizar fotos. Pode demorar alguns minutos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sincronizar',
          onPress: async () => {
            setSyncing(true);
            try {
              // Sincroniza histórico de mensagens
              const histResult = await syncApi.sincronizarHistorico();

              // Sincroniza fotos de perfil
              const fotoResult = await syncApi.sincronizarContatos();

              // Recarrega lista
              await carregarConversas(filtroAtivo);

              Alert.alert(
                'Sincronização Completa',
                `📨 ${histResult.stats?.chats_processados || 0} conversas\n` +
                `💬 ${histResult.stats?.mensagens_novas || 0} mensagens novas\n` +
                `📷 ${fotoResult.atualizados || 0} fotos atualizadas`
              );
            } catch (error) {
              console.error('Erro na sincronização:', error);
              Alert.alert('Erro', 'Não foi possível sincronizar. Tente novamente.');
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  }, [carregarConversas, filtroAtivo]);

  const selecionarFiltro = (filtro: Filtro) => {
    setFiltroAtivo(filtro);
    setLoading(true);
  };

  const formatarHora = (dataHora: string | null): string => {
    if (!dataHora) return '';
    const data = new Date(dataHora);
    const hoje = new Date();

    if (data.toDateString() === hoje.toDateString()) {
      return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    if (data.toDateString() === ontem.toDateString()) {
      return 'Ontem';
    }

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getUltimaMensagemTexto = (conversa: Conversa): string => {
    if (!conversa.ultima_mensagem) return '';

    const { tipo, texto, direcao } = conversa.ultima_mensagem;
    const prefixo = direcao === 'enviada' ? 'Você: ' : '';

    if (tipo === 'audio') return `${prefixo}🎤 Áudio`;
    if (tipo === 'imagem') return `${prefixo}📷 Foto`;
    if (tipo === 'video') return `${prefixo}🎥 Vídeo`;
    if (tipo === 'documento') return `${prefixo}📄 Documento`;
    if (tipo === 'sticker') return `${prefixo}Sticker`;

    return `${prefixo}${texto || ''}`;
  };

  const renderFiltros = () => (
    <View style={styles.filtrosWrapper}>
      <View style={styles.filtrosRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosContainer}
          style={styles.filtrosScroll}
        >
          {FILTROS.map((filtro) => (
            <TouchableOpacity
              key={filtro.id}
              style={[
                styles.filtroChip,
                filtroAtivo === filtro.id && styles.filtroChipAtivo,
              ]}
              onPress={() => selecionarFiltro(filtro.id)}
            >
              {filtro.icone ? (
                <Text style={styles.filtroIcone}>{filtro.icone}</Text>
              ) : null}
              <Text
                style={[
                  styles.filtroLabel,
                  filtroAtivo === filtro.id && styles.filtroLabelAtivo,
                ]}
              >
                {filtro.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={sincronizarTudo}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.syncIcon}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConversa = ({ item }: { item: Conversa }) => {
    const agenteConversa = agentesAtivos.get(item.jid);
    // Verifica se está aguardando resposta (última msg foi recebida)
    const aguardandoResposta = item.ultima_mensagem?.direcao === 'recebida';
    // Calcula tempo sem resposta
    const tempoSemResposta = item.ultima_mensagem?.data_hora
      ? Math.floor((Date.now() - new Date(item.ultima_mensagem.data_hora).getTime()) / (1000 * 60 * 60))
      : 0;
    const urgente = aguardandoResposta && tempoSemResposta > 4;

    return (
      <TouchableOpacity
        style={[
          styles.conversaItem,
          agenteConversa && styles.conversaComAgente,
          urgente && styles.conversaUrgente,
        ]}
        onPress={() => navigation.navigate('Chat', { jid: item.jid, nome: item.nome })}
        onLongPress={() => abrirModalAgente(item)}
        activeOpacity={0.7}
      >
        {/* Avatar - estilo WhatsApp com foto */}
        <View style={styles.avatarContainer}>
          {item.foto_url ? (
            <Image
              source={{ uri: item.foto_url }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.nome?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {/* Indicador de agente ativo no avatar */}
          {agenteConversa && (
            <View style={styles.agenteBadge}>
              <Text style={styles.agenteBadgeIcone}>
                {agenteConversa.tipo_info?.icone || '🎯'}
              </Text>
            </View>
          )}
          {/* Indicador de aguardando resposta */}
          {!agenteConversa && aguardandoResposta && (
            <View style={[styles.aguardandoBadge, urgente && styles.aguardandoUrgente]}>
              <Text style={styles.aguardandoTexto}>{urgente ? '!' : '•'}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.conversaInfo}>
          <View style={styles.conversaHeader}>
            <Text style={[styles.nome, urgente && styles.nomeUrgente]} numberOfLines={1}>
              {item.nome || item.jid.split('@')[0]}
            </Text>
            <Text style={[styles.hora, urgente && styles.horaUrgente]}>
              {formatarHora(item.ultima_mensagem?.data_hora || item.ultima_interacao)}
            </Text>
          </View>
          <View style={styles.mensagemRow}>
            <Text style={[styles.ultimaMensagem, aguardandoResposta && styles.msgRecebida]} numberOfLines={1}>
              {getUltimaMensagemTexto(item)}
            </Text>
            {/* Indicadores sutis à direita */}
            {agenteConversa && (
              <View style={[
                styles.indicadorAgente,
                { backgroundColor: agenteConversa.status === 'ativo' ? colors.secondary : '#FFA500' }
              ]}>
                <Text style={styles.indicadorAgenteTexto}>
                  {agenteConversa.status === 'ativo' ? 'Ativo' : 'Pausado'}
                </Text>
              </View>
            )}
            {!agenteConversa && item.ia_automatica && <Text style={styles.indicadorIA}>✨</Text>}
            {item.prioridade === 2 && <Text style={styles.indicadorVIP}>⭐</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && conversas.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {!isOnline && (
          <View style={styles.statusBannerOffline}>
            <Text style={styles.statusBannerText}>Sem conexão • mostrando cache</Text>
          </View>
        )}
        {isOnline && !isConnected && (
          <View style={styles.statusBannerWarning}>
            <Text style={styles.statusBannerText}>Tempo real pausado • atualizando em segundo plano</Text>
          </View>
        )}
        {renderFiltros()}
        <FlatList
          data={conversas}
          keyExtractor={(item) => item.jid}
          renderItem={renderConversa}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          ListHeaderComponent={
            acaoPrioritaria && !acaoDismissed ? (
              <CardAcaoPrioritaria
                acao={acaoPrioritaria}
                onPress={() => {
                  navigation.navigate('Chat', {
                    jid: acaoPrioritaria.jid,
                    nome: acaoPrioritaria.nome
                  });
                  setAcaoDismissed(true);
                }}
                onDismiss={() => setAcaoDismissed(true)}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhuma conversa {filtroAtivo !== 'todos' ? `em ${filtroAtivo}` : ''}
              </Text>
            </View>
          }
        />

        {/* Modal de ativar agente */}
        <AtivarAgenteModal
          visible={modalAgenteVisivel}
          onClose={() => {
            setModalAgenteVisivel(false);
            setConversaSelecionada(null);
          }}
          jid={conversaSelecionada?.jid || ''}
          nomeContato={conversaSelecionada?.nome || ''}
          agenteAtivo={agenteAtivo}
          onAgenteAtivado={handleAgenteAtivado}
        />

        {/* Tooltips de onboarding */}
        <TooltipOnboarding
          id="conversas_acoes"
          mensagem="O card acima mostra quem precisa da sua atenção. Toque para responder!"
          icone="💡"
          posicao="bottom"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flatList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  // Filtros
  filtrosWrapper: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filtrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtrosScroll: {
    flex: 1,
  },
  filtrosContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  syncButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncIcon: {
    fontSize: 20,
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: '#F0F0F0',
    marginRight: spacing.sm,
  },
  filtroChipAtivo: {
    backgroundColor: colors.primary,
  },
  filtroIcone: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  filtroLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filtroLabelAtivo: {
    color: colors.textLight,
  },
  // Lista
  listContent: {
    paddingVertical: 0,
  },
  conversaItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0E0E0',
  },
  avatarText: {
    color: colors.textLight,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  conversaInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  conversaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  nome: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  hora: {
    fontSize: fontSize.xs,
    color: colors.textTime,
  },
  mensagemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ultimaMensagem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  indicadorIA: {
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  indicadorVIP: {
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.divider,
    marginLeft: 84,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  statusBannerOffline: {
    backgroundColor: '#FFE8E8',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5C2C2',
  },
  statusBannerWarning: {
    backgroundColor: '#FFF3D6',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F2D199',
  },
  statusBannerText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  // Estilos para agentes
  conversaComAgente: {
    borderLeftWidth: 3,
    borderLeftColor: colors.iaAccent,
  },
  agenteBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.iaAccentLight,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  agenteBadgeIcone: {
    fontSize: 10,
  },
  indicadorAgente: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  indicadorAgenteTexto: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontWeight: '600',
  },
  // Estilos para indicadores de urgência
  conversaUrgente: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
  },
  aguardandoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#4CAF50',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  aguardandoUrgente: {
    backgroundColor: '#FF4444',
  },
  aguardandoTexto: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  nomeUrgente: {
    color: '#D32F2F',
  },
  horaUrgente: {
    color: '#FF4444',
    fontWeight: '600',
  },
  msgRecebida: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
});
