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
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, syncApi, agentesApi, Conversa, AgenteMissao } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadCachedConversations, saveCachedConversations } from '../services/cache';
import { useConnectivity } from '../hooks/useConnectivity';
import AtivarAgenteModal from '../components/AtivarAgenteModal';
import PrioritySection from '../components/PrioritySection';
import MoodAlertBanner from '../components/MoodAlert';

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

// Status inteligentes para agrupamento
type StatusConversa = 'precisa_responder' | 'aguardando' | 'em_dia';

interface GrupoStatus {
  id: StatusConversa;
  titulo: string;
  icone: string;
  cor: string;
  descricao: string;
}

const GRUPOS_STATUS: GrupoStatus[] = [
  {
    id: 'precisa_responder',
    titulo: 'Precisa responder',
    icone: '🔴',
    cor: '#FFE8E8',
    descricao: 'Conversas aguardando sua resposta',
  },
  {
    id: 'aguardando',
    titulo: 'Aguardando resposta',
    icone: '🟡',
    cor: '#FFF9E6',
    descricao: 'Voce ja respondeu, aguardando retorno',
  },
  {
    id: 'em_dia',
    titulo: 'Em dia',
    icone: '🟢',
    cor: '#E8F5E9',
    descricao: 'Conversas em dia',
  },
];

// Funcao para classificar conversa por status
const classificarStatus = (conversa: Conversa): StatusConversa => {
  if (!conversa.ultima_mensagem) return 'em_dia';

  const ultimaDirecao = conversa.ultima_mensagem.direcao;
  const ultimaData = conversa.ultima_mensagem.data_hora
    ? new Date(conversa.ultima_mensagem.data_hora)
    : null;
  const agora = new Date();
  const horasSemResposta = ultimaData
    ? (agora.getTime() - ultimaData.getTime()) / (1000 * 60 * 60)
    : 0;

  // Se ultima foi recebida, precisa responder
  if (ultimaDirecao === 'recebida') {
    return 'precisa_responder';
  }

  // Se ultima foi enviada ha mais de 24h, considera em dia
  if (horasSemResposta > 24) {
    return 'em_dia';
  }

  // Se ultima foi enviada recentemente, aguardando
  return 'aguardando';
};

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

  // Filtros visiveis (escondido por padrao estilo WhatsApp)
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Agrupamento por status
  const [mostrarGrupos, setMostrarGrupos] = useState(true);
  const [gruposColapsados, setGruposColapsados] = useState<Set<StatusConversa>>(new Set(['em_dia']));

  // Agrupa conversas por status
  const conversasAgrupadas = React.useMemo(() => {
    const grupos: Record<StatusConversa, Conversa[]> = {
      precisa_responder: [],
      aguardando: [],
      em_dia: [],
    };

    conversas.forEach(conversa => {
      const status = classificarStatus(conversa);
      grupos[status].push(conversa);
    });

    return grupos;
  }, [conversas]);

  // Toggle colapso de grupo
  const toggleGrupo = (status: StatusConversa) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGruposColapsados(prev => {
      const novo = new Set(prev);
      if (novo.has(status)) {
        novo.delete(status);
      } else {
        novo.add(status);
      }
      return novo;
    });
  };

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

  // Abre modal para ativar/editar agente
  const abrirModalAgente = async (conversa: Conversa) => {
    setConversaSelecionada(conversa);
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
  const { isConnected, lastError, reconnectAttempts, reconnect } = useWebSocket({
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
    onContactUpdated: useCallback((data: { jid: string; nome?: string; foto_url?: string }) => {
      // Atualiza os dados do contato (nome, foto) na lista local
      setConversas(prev => {
        const index = prev.findIndex(c => c.jid === data.jid);
        if (index === -1) {
          // Contato não está na lista atual
          return prev;
        }

        // Atualiza o contato com os novos dados
        const updated = [...prev];
        const conversa = { ...updated[index] };

        if (data.nome !== undefined) {
          conversa.nome = data.nome;
        }
        if (data.foto_url !== undefined) {
          conversa.foto_url = data.foto_url;
        }

        updated[index] = conversa;
        return updated;
      });
    }, []),
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

    // Polling somente como fallback quando WebSocket está offline
    if (!isConnected) {
      pollingRef.current = setInterval(() => {
        carregarConversas(filtroAtivo);
      }, 10000);
    }

    // Listener para quando o app volta ao foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        carregarConversas(filtroAtivo);
        carregarAgentesAtivos();
      }
      appState.current = nextAppState;
    });

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      subscription.remove();
    };
  }, [carregarConversas, carregarAgentesAtivos, filtroAtivo, isConnected]);

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
                `👤 ${fotoResult.nomes_atualizados || 0} nomes atualizados\n` +
                `📷 ${fotoResult.fotos_atualizadas || 0} fotos atualizadas`
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

    if (tipo === 'audio') {
      return texto ? `${prefixo}🎤 ${texto}` : `${prefixo}🎤 Áudio`;
    }
    if (tipo === 'imagem') return `${prefixo}📷 Foto`;
    if (tipo === 'video') return `${prefixo}🎥 Vídeo`;
    if (tipo === 'documento') return `${prefixo}📄 Documento`;
    if (tipo === 'sticker') return `${prefixo}Sticker`;

    return `${prefixo}${texto || ''}`;
  };

  // Header compacto estilo WhatsApp
  const renderHeader = () => (
    <View style={styles.headerBar}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setMostrarFiltros(!mostrarFiltros);
        }}
      >
        <Text style={styles.headerButtonIcon}>{mostrarFiltros ? '✕' : '🏷️'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={sincronizarTudo}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.headerButtonIcon}>🔄</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderFiltros = () => {
    if (!mostrarFiltros) return null;

    return (
      <View style={styles.filtrosWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtrosContainer}
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
      </View>
    );
  };

  // Renderiza header de secao
  const renderSectionHeader = (status: StatusConversa, count: number) => {
    const grupo = GRUPOS_STATUS.find(g => g.id === status);
    if (!grupo || count === 0) return null;

    const isColapsado = gruposColapsados.has(status);

    return (
      <TouchableOpacity
        style={[styles.sectionHeader, { backgroundColor: grupo.cor }]}
        onPress={() => toggleGrupo(status)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderIcone}>{grupo.icone}</Text>
          <View>
            <Text style={styles.sectionHeaderTitulo}>{grupo.titulo}</Text>
            <Text style={styles.sectionHeaderCount}>
              {count} {count === 1 ? 'conversa' : 'conversas'}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionHeaderChevron}>
          {isColapsado ? '▶' : '▼'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Dados para FlatList com secoes
  type ListItem = { type: 'header'; status: StatusConversa; count: number } | { type: 'conversa'; data: Conversa };

  const dadosAgrupados = React.useMemo((): ListItem[] => {
    if (!mostrarGrupos || filtroAtivo !== 'todos') {
      // Sem agrupamento - retorna conversas direto
      return conversas.map(c => ({ type: 'conversa' as const, data: c }));
    }

    const items: ListItem[] = [];

    GRUPOS_STATUS.forEach(grupo => {
      const conversasDoGrupo = conversasAgrupadas[grupo.id];
      if (conversasDoGrupo.length > 0) {
        // Adiciona header
        items.push({ type: 'header', status: grupo.id, count: conversasDoGrupo.length });

        // Se nao colapsado, adiciona conversas
        if (!gruposColapsados.has(grupo.id)) {
          conversasDoGrupo.forEach(c => {
            items.push({ type: 'conversa', data: c });
          });
        }
      }
    });

    return items;
  }, [conversas, conversasAgrupadas, mostrarGrupos, gruposColapsados, filtroAtivo]);

  // Render item para FlatList com secoes
  const renderItemAgrupado = ({ item }: { item: ListItem }) => {
    if (item.type === 'header') {
      return renderSectionHeader(item.status, item.count);
    }
    return renderConversaItem(item.data);
  };

  // Render de uma conversa individual - simplificado estilo WhatsApp
  const renderConversaItem = (item: Conversa) => {
    const agenteConversa = agentesAtivos.get(item.jid);
    const aguardandoResposta = item.ultima_mensagem?.direcao === 'recebida';
    const tempoSemResposta = item.ultima_mensagem?.data_hora
      ? Math.floor((Date.now() - new Date(item.ultima_mensagem.data_hora).getTime()) / (1000 * 60 * 60))
      : 0;
    const urgente = aguardandoResposta && tempoSemResposta > 4;

    return (
      <TouchableOpacity
        style={[
          styles.conversaItem,
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
          {/* Badge de agente ativo (icone + dot de status) */}
          {agenteConversa && (
            <View style={[
              styles.agenteBadge,
              agenteConversa.status === 'ativo' ? styles.agenteBadgeAtivo : styles.agenteBadgePausado
            ]}>
              <Text style={styles.agenteBadgeIcone}>
                {agenteConversa.tipo_info?.icone || '🎯'}
              </Text>
            </View>
          )}
          {/* Indicador de aguardando resposta (quando sem agente) */}
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
            <View style={styles.headerRight}>
              {/* Dot de status do agente (sutil) */}
              {agenteConversa && (
                <View style={[
                  styles.statusDot,
                  agenteConversa.status === 'ativo' ? styles.statusDotGreen : styles.statusDotYellow
                ]} />
              )}
              <Text style={[styles.hora, urgente && styles.horaUrgente]}>
                {formatarHora(item.ultima_mensagem?.data_hora || item.ultima_interacao)}
              </Text>
            </View>
          </View>
          <View style={styles.mensagemRow}>
            <Text style={[styles.ultimaMensagem, aguardandoResposta && styles.msgRecebida]} numberOfLines={1}>
              {getUltimaMensagemTexto(item)}
            </Text>
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
            <Text style={styles.statusBannerText}>Sem conexao - mostrando cache</Text>
          </View>
        )}
        {isOnline && !isConnected && (
          <View style={styles.statusBannerWarning}>
            <View style={styles.statusBannerContent}>
              <View style={styles.statusBannerTextContainer}>
                <Text style={styles.statusBannerText}>
                  {lastError?.code === 4003
                    ? 'Erro de autenticacao WS'
                    : lastError?.code === 4001
                    ? 'Device ID invalido'
                    : reconnectAttempts > 0
                    ? `Reconectando... (${reconnectAttempts})`
                    : 'Tempo real pausado'}
                </Text>
                {lastError && (
                  <Text style={styles.statusBannerSubtext}>
                    {lastError.reason || lastError.message}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.statusBannerButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  reconnect();
                }}
              >
                <Text style={styles.statusBannerButtonText}>Reconectar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Header compacto com botoes de filtro e sync */}
        {renderHeader()}
        {renderFiltros()}

        {/* Toggle para mostrar/ocultar agrupamento */}
        {filtroAtivo === 'todos' && (
          <TouchableOpacity
            style={styles.toggleGrupos}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMostrarGrupos(!mostrarGrupos);
            }}
          >
            <Text style={styles.toggleGruposIcone}>
              {mostrarGrupos ? '📊' : '📋'}
            </Text>
            <Text style={styles.toggleGruposTexto}>
              {mostrarGrupos ? 'Por status' : 'Todas'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Feature 7: Smart Priority Queue - Responda Agora */}
        <PrioritySection
          visible={filtroAtivo === 'todos' && !mostrarGrupos}
          onPressConversa={(jid, nome) => navigation.navigate('Chat', { jid, nome })}
        />

        {/* Feature 2: Mood Detection Alerts */}
        <MoodAlertBanner
          visible={filtroAtivo === 'todos'}
          onPressAlerta={(jid, nome) => navigation.navigate('Chat', { jid, nome })}
        />

        <FlatList
          data={dadosAgrupados}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.status}` : item.data.jid
          }
          renderItem={renderItemAgrupado}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={({ leadingItem }) =>
            leadingItem?.type === 'conversa' ? <View style={styles.separator} /> : null
          }
          contentContainerStyle={styles.listContent}
          style={styles.flatList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhuma conversa {filtroAtivo !== 'todos' ? `em ${filtroAtivo}` : ''}
              </Text>
            </View>
          }
        />

        {/* Modal de ativar agente (via long-press) */}
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
  // Header compacto
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
  },
  headerButtonIcon: {
    fontSize: 18,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: colors.secondary,
  },
  statusDotYellow: {
    backgroundColor: '#FFA500',
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
  },
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBannerTextContainer: {
    flex: 1,
  },
  statusBannerSubtext: {
    color: colors.textSecondary,
    fontSize: fontSize.xs - 1,
    marginTop: 2,
    opacity: 0.8,
  },
  statusBannerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusBannerButtonText: {
    color: colors.textLight,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  // Estilos para agentes - badge sutil no avatar
  agenteBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  agenteBadgeAtivo: {
    backgroundColor: colors.secondary,
  },
  agenteBadgePausado: {
    backgroundColor: '#FFA500',
  },
  agenteBadgeIcone: {
    fontSize: 10,
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
  // Estilos para agrupamento por status
  toggleGrupos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  toggleGruposIcone: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  toggleGruposTexto: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeaderIcone: {
    fontSize: 18,
  },
  sectionHeaderTitulo: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionHeaderCount: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  sectionHeaderChevron: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
