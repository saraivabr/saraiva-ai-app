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
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, Conversa } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

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

  const carregarConversas = useCallback(async (filtro?: Filtro) => {
    try {
      let params: { categoria?: string; prioridade?: number } = {};

      if (filtro && filtro !== 'todos') {
        if (filtro === 'vip') {
          params.prioridade = 2;
        } else {
          params.categoria = filtro;
        }
      }

      const data = await conversasApi.listar(params);
      setConversas(data);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

    // Polling como fallback (mais espaçado quando WebSocket está conectado)
    const intervalo = isConnected ? 60000 : 10000; // 60s com WS, 10s sem
    pollingRef.current = setInterval(() => {
      carregarConversas(filtroAtivo);
    }, intervalo);

    // Listener para quando o app volta ao foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        carregarConversas(filtroAtivo);
      }
      appState.current = nextAppState;
    });

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      subscription.remove();
    };
  }, [carregarConversas, filtroAtivo, isConnected]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarConversas(filtroAtivo);
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

  const renderConversa = ({ item }: { item: Conversa }) => (
    <TouchableOpacity
      style={styles.conversaItem}
      onPress={() => navigation.navigate('Chat', { jid: item.jid, nome: item.nome })}
      onLongPress={() => navigation.navigate('Perfil', { jid: item.jid, nome: item.nome })}
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
      </View>

      {/* Info */}
      <View style={styles.conversaInfo}>
        <View style={styles.conversaHeader}>
          <Text style={styles.nome} numberOfLines={1}>
            {item.nome || item.jid.split('@')[0]}
          </Text>
          <Text style={styles.hora}>
            {formatarHora(item.ultima_mensagem?.data_hora || item.ultima_interacao)}
          </Text>
        </View>
        <View style={styles.mensagemRow}>
          <Text style={styles.ultimaMensagem} numberOfLines={1}>
            {getUltimaMensagemTexto(item)}
          </Text>
          {/* Indicadores sutis à direita */}
          {item.ia_automatica && <Text style={styles.indicadorIA}>✨</Text>}
          {item.prioridade === 2 && <Text style={styles.indicadorVIP}>⭐</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Nenhuma conversa {filtroAtivo !== 'todos' ? `em ${filtroAtivo}` : ''}
              </Text>
            </View>
          }
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
  filtrosContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
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
});
