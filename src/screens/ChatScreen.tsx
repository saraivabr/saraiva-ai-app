import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
  Keyboard,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, agentesApi, Mensagem, SugestaoResposta, OpcaoArquetipo, AgenteMissao, SugestaoAgente } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadCachedMensagens, saveCachedMensagens } from '../services/cache';
import { useConnectivity } from '../hooks/useConnectivity';
import AtivarAgenteModal from '../components/AtivarAgenteModal';
import AgenteBadge from '../components/AgenteBadge';

const INPUT_ACCESSORY_ID = 'chatInputAccessory';
const PAGE_SIZE = 50;
const BOTTOM_THRESHOLD = 120;
const LOAD_MORE_THRESHOLD = 80;

interface Props {
  route: any;
  navigation: any;
}

export default function ChatScreen({ route, navigation }: Props) {
  const { jid, nome } = route.params;
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [sugestao, setSugestao] = useState<SugestaoResposta | null>(null);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = useWindowDimensions();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalMensagens, setTotalMensagens] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const { isOnline } = useConnectivity();

  // Estado do agente
  const [agente, setAgente] = useState<AgenteMissao | null>(null);
  const [modalAgenteVisivel, setModalAgenteVisivel] = useState(false);
  const [sugestaoAgente, setSugestaoAgente] = useState<SugestaoAgente | null>(null);
  const [gerandoSugestaoAgente, setGerandoSugestaoAgente] = useState(false);

  // Carrega agente ativo para esta conversa
  const carregarAgente = useCallback(async () => {
    try {
      const data = await agentesApi.get(jid);
      setAgente(data.agente);
    } catch (error) {
      console.error('Erro ao carregar agente:', error);
    }
  }, [jid]);

  useEffect(() => {
    carregarAgente();
  }, [carregarAgente]);

  useEffect(() => {
    navigation.setOptions({
      title: nome || jid.split('@')[0],
      headerStyle: { backgroundColor: agente ? colors.iaAccent : colors.primary },
      headerTintColor: colors.textLight,
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: spacing.md }}
          onPress={() => setModalAgenteVisivel(true)}
        >
          {agente ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, marginRight: 4 }}>{agente.tipo_info?.icone || '🎯'}</Text>
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: agente.status === 'ativo' ? colors.secondary : '#FFA500'
              }} />
            </View>
          ) : (
            <Text style={{ fontSize: 20 }}>🎯</Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, nome, jid, agente]);

  // Listener do teclado para ajustar a view
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadCachedMensagens(jid).then((cached) => {
      if (!isMounted || !cached) return;
      setMensagens(cached.data.mensagens);
      setOffset(cached.data.mensagens.length);
      setTotalMensagens(cached.data.total);
      atualizarHasMore(cached.data.mensagens.length, cached.data.total);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [jid, atualizarHasMore]);

  useEffect(() => {
    if (mensagens.length === 0) return;
    saveCachedMensagens(jid, mensagens, totalMensagens).catch(() => {});
  }, [jid, mensagens, totalMensagens]);

  const scrollToBottom = useCallback((animated = true) => {
    flatListRef.current?.scrollToEnd({ animated });
  }, []);

  const atualizarHasMore = useCallback((nextOffset: number, nextTotal: number) => {
    setHasMore(nextOffset < nextTotal);
  }, []);

  useEffect(() => {
    atualizarHasMore(offset, totalMensagens);
  }, [offset, totalMensagens, atualizarHasMore]);

  const carregarMensagens = useCallback(async (silent = false) => {
    try {
      const data = await conversasApi.mensagens(jid, PAGE_SIZE, 0);
      setMensagens(data.mensagens);
      setOffset(data.mensagens.length);
      setTotalMensagens(data.total);
      atualizarHasMore(data.mensagens.length, data.total);
      if (!silent) {
        setTimeout(() => scrollToBottom(false), 0);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [jid, atualizarHasMore, scrollToBottom]);

  const carregarMaisMensagens = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await conversasApi.mensagens(jid, PAGE_SIZE, offset);
      setMensagens((prev) => {
        const existentes = new Set(prev.map((m) => m.message_id));
        const maisAntigas = data.mensagens.filter((m) => !existentes.has(m.message_id));
        return [...maisAntigas, ...prev];
      });
      const nextOffset = offset + data.mensagens.length;
      setOffset(nextOffset);
      setTotalMensagens(data.total);
      atualizarHasMore(nextOffset, data.total);
    } catch (error) {
      console.error('Erro ao carregar mensagens antigas:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, jid, loadingMore, offset, atualizarHasMore]);

  const sincronizarUltimasMensagens = useCallback(async () => {
    try {
      const data = await conversasApi.mensagens(jid, PAGE_SIZE, 0);
      setMensagens((prev) => {
        const porId = new Map(prev.map((m) => [m.message_id, m]));
        data.mensagens.forEach((m) => porId.set(m.message_id, m));
        const merged = Array.from(porId.values());
        merged.sort((a, b) => {
          const aTime = a.data_hora ? new Date(a.data_hora).getTime() : 0;
          const bTime = b.data_hora ? new Date(b.data_hora).getTime() : 0;
          return aTime - bTime;
        });
        return merged;
      });
      setTotalMensagens(data.total);
      atualizarHasMore(offset, data.total);
      if (isNearBottom) {
        setTimeout(() => scrollToBottom(true), 0);
      }
    } catch (error) {
      console.error('Erro ao sincronizar mensagens:', error);
    }
  }, [jid, isNearBottom, offset, atualizarHasMore, scrollToBottom]);

  const { isConnected, watchConversation, unwatchConversation } = useWebSocket({
    onNewMessage: useCallback((mensagemJid: string, mensagem: any) => {
      if (mensagemJid !== jid) return;
      setMensagens((prev) => {
        if (prev.some((m) => m.message_id === mensagem.message_id)) {
          return prev;
        }
        const merged = [...prev, mensagem];
        merged.sort((a, b) => {
          const aTime = a.data_hora ? new Date(a.data_hora).getTime() : 0;
          const bTime = b.data_hora ? new Date(b.data_hora).getTime() : 0;
          return aTime - bTime;
        });
        return merged;
      });
      if (isNearBottom) {
        setTimeout(() => scrollToBottom(true), 0);
      }
    }, [jid, isNearBottom, scrollToBottom]),
  });

  // Carrega inicial + fallback polling quando WebSocket está offline
  useEffect(() => {
    carregarMensagens();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [carregarMensagens]);

  useEffect(() => {
    if (!isConnected && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        sincronizarUltimasMensagens();
      }, 10000);
    }
    if (isConnected && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [isConnected, sincronizarUltimasMensagens]);

  useEffect(() => {
    if (isConnected) {
      watchConversation(jid);
      sincronizarUltimasMensagens();
    }
  }, [isConnected, jid, watchConversation, sincronizarUltimasMensagens]);

  useEffect(() => {
    return () => {
      unwatchConversation(jid);
    };
  }, [jid, unwatchConversation]);

  const enviarMensagem = async (mensagemTexto?: string) => {
    const textoEnviar = mensagemTexto || texto;
    if (!textoEnviar.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnviando(true);
    try {
      await conversasApi.enviar(jid, textoEnviar);
      setTexto('');
      // Adiciona mensagem localmente
      const novaMensagem: Mensagem = {
        id: Date.now(),
        message_id: `sent_${Date.now()}`,
        tipo: 'texto',
        conteudo: textoEnviar,
        direcao: 'enviada',
        duracao_audio: null,
        data_hora: new Date().toISOString(),
        enviada_por_ia: false,
      };
      setMensagens((prev) => [...prev, novaMensagem]);
      setOffset((prev) => prev + 1);
      setTotalMensagens((prev) => prev + 1);
      if (isNearBottom) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
    } finally {
      setEnviando(false);
    }
  };

  // Envia mensagens em sequência (como humano faria)
  const enviarMensagensEmSequencia = async (mensagensParaEnviar: string[]) => {
    if (!mensagensParaEnviar || mensagensParaEnviar.length === 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEnviando(true);
    try {
      for (const msg of mensagensParaEnviar) {
        await conversasApi.enviar(jid, msg);
        // Adiciona mensagem localmente
        const novaMensagem: Mensagem = {
          id: Date.now() + Math.random(),
          message_id: `sent_${Date.now()}_${Math.random()}`,
          tipo: 'texto',
          conteudo: msg,
          direcao: 'enviada',
          duracao_audio: null,
          data_hora: new Date().toISOString(),
          enviada_por_ia: true,
        };
        setMensagens((prev) => [...prev, novaMensagem]);
        setOffset((prev) => prev + 1);
        setTotalMensagens((prev) => prev + 1);
        // Pequeno delay entre mensagens (como humano)
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      setSugestao(null);
      setOpcaoSelecionada(0);
      if (isNearBottom) {
        setTimeout(() => scrollToBottom(true), 100);
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', 'Não foi possível enviar as mensagens');
    } finally {
      setEnviando(false);
    }
  };

  // Envia todas as mensagens sugeridas em sequência (formato simples)
  const enviarTodasSugestoes = async () => {
    if (!sugestao) {
      Alert.alert('Erro', 'Nenhuma sugestao disponivel');
      return;
    }
    if (!sugestao.mensagens || sugestao.mensagens.length === 0) {
      Alert.alert('Erro', 'A sugestao nao contem mensagens. Tente gerar novamente.');
      return;
    }
    await enviarMensagensEmSequencia(sugestao.mensagens);
  };

  // Remove uma mensagem específica da sugestão
  const removerSugestao = (index: number) => {
    if (!sugestao) return;
    const novasMensagens = sugestao.mensagens.filter((_, i) => i !== index);
    if (novasMensagens.length === 0) {
      setSugestao(null);
    } else {
      setSugestao({
        mensagens: novasMensagens,
        texto_unico: novasMensagens.join(' | ')
      });
    }
  };

  const solicitarSugestao = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Se tem agente ativo, usa sugestão do agente
    if (agente && agente.status === 'ativo') {
      setGerandoSugestaoAgente(true);
      try {
        // Pega a ultima mensagem recebida
        const ultimaRecebida = mensagens.filter(m => m.direcao === 'recebida').pop();
        const mensagemContexto = ultimaRecebida?.conteudo || '';

        const resposta = await agentesApi.gerarResposta(jid, mensagemContexto);
        setSugestaoAgente(resposta.sugestao);
        // Converte para formato de sugestao normal para reutilizar o mesmo componente
        setSugestao({
          formato: 'simples',
          mensagens: resposta.sugestao.mensagens,
          texto_unico: resposta.sugestao.mensagens.join(' | '),
          opcoes: [{
            tipo: agente.tipo,
            icone: agente.tipo_info?.icone || '🎯',
            nome: `${agente.tipo_info?.nome || 'Agente'} (${resposta.sugestao.confianca}%)`,
            descricao: resposta.sugestao.estrategia,
            mensagens: resposta.sugestao.mensagens,
          }],
          analise: resposta.sugestao.analise,
        });
      } catch (error) {
        Alert.alert('Erro', 'Nao foi possivel gerar sugestao do agente');
      } finally {
        setGerandoSugestaoAgente(false);
      }
    } else {
      // Sugestao normal
      setSugerindo(true);
      try {
        const resposta = await conversasApi.sugerir(jid);
        setSugestao(resposta);
      } catch (error) {
        Alert.alert('Erro', 'Nao foi possivel gerar sugestao');
      } finally {
        setSugerindo(false);
      }
    }
  };

  // Registra envio de mensagem do agente
  const registrarEnvioAgente = async (aprovado: boolean) => {
    if (agente) {
      try {
        await agentesApi.registrarEnvio(jid, aprovado);
        // Recarrega agente para atualizar metricas
        carregarAgente();
      } catch (error) {
        console.error('Erro ao registrar envio:', error);
      }
    }
  };

  const formatarHora = (dataHora: string | null): string => {
    if (!dataHora) return '';
    return new Date(dataHora).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMensagem = ({ item }: { item: Mensagem }) => {
    const isEnviada = item.direcao === 'enviada';
    const isIA = item.enviada_por_ia;
    const maxBubbleWidth = screenWidth * 0.75;

    return (
      <View
        style={[
          styles.mensagemContainer,
          { maxWidth: maxBubbleWidth },
          isEnviada ? styles.mensagemEnviada : styles.mensagemRecebida,
        ]}
      >
        <View
          style={[
            styles.balao,
            isEnviada
              ? isIA
                ? styles.balaoIA
                : styles.balaoEnviado
              : styles.balaoRecebido,
          ]}
        >
          {item.tipo === 'audio' && (
            <View style={styles.audioContainer}>
              <Text style={styles.audioIcon}>🎤</Text>
              <Text style={styles.audioDuracao}>
                {item.duracao_audio ? `${item.duracao_audio}s` : 'Áudio'}
              </Text>
            </View>
          )}
          {item.conteudo && (
            <Text style={styles.mensagemTexto}>{item.conteudo}</Text>
          )}
          <View style={styles.mensagemFooter}>
            <Text style={styles.mensagemHora}>{formatarHora(item.data_hora)}</Text>
            {isEnviada && (
              <Text style={styles.checkIcon}>✓✓</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {!isOnline && (
        <View style={styles.statusBannerOffline}>
          <Text style={styles.statusBannerText}>Sem conexão • mostrando cache</Text>
        </View>
      )}
      {isOnline && !isConnected && (
        <View style={styles.statusBannerWarning}>
          <Text style={styles.statusBannerText}>Tempo real pausado • usando sincronização</Text>
        </View>
      )}
      {/* Badge do agente ativo */}
      {agente && (
        <AgenteBadge
          agente={agente}
          onPress={() => setModalAgenteVisivel(true)}
        />
      )}

      {/* Lista de mensagens */}
      <FlatList
        ref={flatListRef}
        data={mensagens}
        keyExtractor={(item) => item.message_id || String(item.id)}
        renderItem={renderMensagem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === 'android' ? keyboardHeight : spacing.md }
        ]}
        style={styles.flatList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
          setIsNearBottom(distanceFromBottom < BOTTOM_THRESHOLD);
          if (!loading && contentOffset.y < LOAD_MORE_THRESHOLD) {
            carregarMaisMensagens();
          }
        }}
        scrollEventThrottle={16}
        ListHeaderComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />

      {/* Sugestão da IA - Arquetipos psicológicos */}
      {sugestao && (
        <View style={styles.sugestaoContainer}>
          {/* Header com análise e emoção detectada */}
          {sugestao.formato === 'arquetipos' && (sugestao.analise || sugestao.emocao) && (
            <View style={styles.analiseHeader}>
              {sugestao.emocao && (
                <View style={styles.emocaoBadge}>
                  <Text style={styles.emocaoTexto}>
                    {sugestao.emocao === 'feliz' ? '😊' :
                     sugestao.emocao === 'triste' ? '😢' :
                     sugestao.emocao === 'ansioso' ? '😰' :
                     sugestao.emocao === 'irritado' ? '😤' :
                     sugestao.emocao === 'neutro' ? '😐' : '🤔'} {sugestao.emocao}
                  </Text>
                </View>
              )}
              {sugestao.analise && (
                <Text style={styles.analiseTexto} numberOfLines={2}>
                  {sugestao.analise}
                </Text>
              )}
            </View>
          )}

          {/* Opções de arquétipos */}
          {sugestao.formato === 'arquetipos' && sugestao.opcoes && sugestao.opcoes.length > 0 ? (
            <>
              <Text style={styles.sugestaoLabel}>Escolha o tom da resposta:</Text>
              <View style={styles.arquetiposGrid}>
                {sugestao.opcoes.map((opcao, index) => (
                  <TouchableOpacity
                    key={opcao.tipo}
                    style={[
                      styles.arquetipoCard,
                      opcaoSelecionada === index && styles.arquetipoCardSelecionado
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setOpcaoSelecionada(index);
                    }}
                  >
                    <Text style={styles.arquetipoIcone}>{opcao.icone}</Text>
                    <Text style={[
                      styles.arquetipoNome,
                      opcaoSelecionada === index && styles.arquetipoNomeSelecionado
                    ]}>
                      {opcao.nome}
                    </Text>
                    <Text style={styles.arquetipoDescricao} numberOfLines={2}>
                      {opcao.descricao}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview das mensagens do arquétipo selecionado */}
              {sugestao.opcoes?.[opcaoSelecionada]?.mensagens && sugestao.opcoes[opcaoSelecionada].mensagens.length > 0 ? (
                <View style={styles.sugestaoMensagens}>
                  <Text style={styles.previewLabel}>
                    Preview ({sugestao.opcoes[opcaoSelecionada].mensagens.length} msgs):
                  </Text>
                  <ScrollView style={styles.previewScroll} nestedScrollEnabled>
                    {sugestao.opcoes[opcaoSelecionada].mensagens.map((msg, index) => (
                      <View key={index} style={styles.sugestaoMsgItem}>
                        <View style={styles.sugestaoMsgBalao}>
                          <Text style={styles.sugestaoMsgTexto}>{msg}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.sugestaoMensagens}>
                  <Text style={[styles.previewLabel, { color: '#FF6B6B' }]}>
                    Sem mensagens para esta opcao. Selecione outra.
                  </Text>
                </View>
              )}

              <View style={styles.sugestaoBotoes}>
                <TouchableOpacity
                  style={[styles.sugestaoBotao, styles.sugestaoBotaoEnviar]}
                  onPress={() => {
                    const opcao = sugestao.opcoes?.[opcaoSelecionada];
                    if (!opcao || !opcao.mensagens || opcao.mensagens.length === 0) {
                      Alert.alert('Erro', 'Esta opcao nao contem mensagens. Selecione outra ou gere novamente.');
                      return;
                    }
                    enviarMensagensEmSequencia(opcao.mensagens);
                  }}
                  disabled={enviando}
                >
                  <Text style={styles.sugestaoBotaoTexto}>
                    {enviando ? 'Enviando...' : `Enviar ${sugestao.opcoes?.[opcaoSelecionada]?.nome || ''}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sugestaoBotao, styles.sugestaoBotaoDescartar]}
                  onPress={() => { setSugestao(null); setOpcaoSelecionada(0); }}
                >
                  <Text style={styles.sugestaoBotaoTextoDescartar}>✕</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* Fallback para formato simples */
            <>
              <Text style={styles.sugestaoLabel}>
                Sugestão ({sugestao.mensagens?.length || 0} {(sugestao.mensagens?.length || 0) === 1 ? 'msg' : 'msgs'}):
              </Text>
              <View style={styles.sugestaoMensagens}>
                {sugestao.mensagens && sugestao.mensagens.length > 0 ? (
                  sugestao.mensagens.map((msg, index) => (
                    <View key={index} style={styles.sugestaoMsgItem}>
                      <View style={styles.sugestaoMsgBalao}>
                        <Text style={styles.sugestaoMsgTexto}>{msg}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.sugestaoMsgRemover}
                        onPress={() => removerSugestao(index)}
                      >
                        <Text style={styles.sugestaoMsgRemoverTexto}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.previewLabel, { color: '#FF6B6B' }]}>
                    Erro ao gerar sugestao. Tente novamente.
                  </Text>
                )}
              </View>
              <View style={styles.sugestaoBotoes}>
                <TouchableOpacity
                  style={[styles.sugestaoBotao, styles.sugestaoBotaoEnviar]}
                  onPress={enviarTodasSugestoes}
                  disabled={enviando}
                >
                  <Text style={styles.sugestaoBotaoTexto}>
                    {enviando ? 'Enviando...' : 'Enviar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sugestaoBotao, styles.sugestaoBotaoDescartar]}
                  onPress={() => setSugestao(null)}
                >
                  <Text style={styles.sugestaoBotaoTextoDescartar}>✕</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Mensagem"
          placeholderTextColor={colors.textSecondary}
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={4096}
        />

        {/* Botão Sugerir (varinha mágica ou agente) */}
        <TouchableOpacity
          style={[
            styles.sugerirBotao,
            agente && agente.status === 'ativo' && styles.sugerirBotaoAgente,
          ]}
          onPress={solicitarSugestao}
          disabled={sugerindo || gerandoSugestaoAgente}
        >
          {sugerindo || gerandoSugestaoAgente ? (
            <ActivityIndicator size="small" color={colors.iaAccent} />
          ) : (
            <Text style={styles.sugerirIcone}>
              {agente && agente.status === 'ativo' ? (agente.tipo_info?.icone || '🎯') : '🪄'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Botão Enviar */}
        <TouchableOpacity
          style={[
            styles.enviarBotao,
            (!texto.trim() || enviando) && styles.enviarBotaoDisabled,
          ]}
          onPress={() => enviarMensagem()}
          disabled={!texto.trim() || enviando}
        >
          {enviando ? (
            <ActivityIndicator size="small" color={colors.textLight} />
          ) : (
            <Text style={styles.enviarIcone}>➤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de ativar/editar agente */}
      <AtivarAgenteModal
        visible={modalAgenteVisivel}
        onClose={() => setModalAgenteVisivel(false)}
        jid={jid}
        nomeContato={nome}
        agenteAtivo={agente}
        onAgenteAtivado={(novoAgente) => {
          setAgente(novoAgente);
          setSugestao(null);
          setSugestaoAgente(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chatBackground,
  },
  flatList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.chatBackground,
  },
  loadingMore: {
    paddingVertical: spacing.sm,
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
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  mensagemContainer: {
    marginVertical: spacing.xs,
  },
  mensagemEnviada: {
    alignSelf: 'flex-end',
  },
  mensagemRecebida: {
    alignSelf: 'flex-start',
  },
  balao: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.bubble,
    minWidth: 80,
  },
  balaoEnviado: {
    backgroundColor: colors.bubbleSent,
    borderTopRightRadius: 0,
  },
  balaoRecebido: {
    backgroundColor: colors.bubbleReceived,
    borderTopLeftRadius: 0,
  },
  balaoIA: {
    backgroundColor: colors.bubbleSent,
    borderTopRightRadius: 0,
    borderLeftWidth: 3,
    borderLeftColor: colors.iaAccent,
  },
  mensagemTexto: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  mensagemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  mensagemHora: {
    fontSize: fontSize.xs,
    color: colors.textTime,
  },
  checkIcon: {
    fontSize: fontSize.xs,
    color: colors.checkBlue,
    marginLeft: spacing.xs,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  audioIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  audioDuracao: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sugestaoContainer: {
    backgroundColor: colors.iaAccentLight,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.iaAccent,
    maxHeight: 400,
  },
  analiseHeader: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 43, 226, 0.2)',
  },
  emocaoBadge: {
    backgroundColor: 'rgba(138, 43, 226, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  emocaoTexto: {
    fontSize: fontSize.sm,
    color: colors.iaAccent,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  analiseTexto: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  sugestaoLabel: {
    fontSize: fontSize.sm,
    color: colors.iaAccent,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  arquetiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  arquetipoCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(138, 43, 226, 0.3)',
    alignItems: 'center',
  },
  arquetipoCardSelecionado: {
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
    borderColor: colors.iaAccent,
    borderWidth: 2,
  },
  arquetipoIcone: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  arquetipoNome: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  arquetipoNomeSelecionado: {
    color: colors.iaAccent,
  },
  arquetipoDescricao: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  previewLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  previewScroll: {
    maxHeight: 100,
  },
  sugestaoTexto: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sugestaoMensagens: {
    marginBottom: spacing.sm,
    maxHeight: 150,
  },
  sugestaoMsgItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sugestaoMsgBalao: {
    flex: 1,
    backgroundColor: colors.bubbleSent,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.bubble,
    borderTopRightRadius: 0,
  },
  sugestaoMsgTexto: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  sugestaoMsgRemover: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sugestaoMsgRemoverTexto: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sugestaoBotoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  sugestaoBotao: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  sugestaoBotaoEnviar: {
    backgroundColor: colors.secondary,
  },
  sugestaoBotaoDescartar: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  sugestaoBotaoTexto: {
    color: colors.textLight,
    fontWeight: '600',
  },
  sugestaoBotaoTextoDescartar: {
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    backgroundColor: colors.chatBackground,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  sugerirBotao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sugerirBotaoAgente: {
    backgroundColor: colors.iaAccentLight,
    borderWidth: 2,
    borderColor: colors.iaAccent,
  },
  sugerirIcone: {
    fontSize: 22,
  },
  enviarBotao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enviarBotaoDisabled: {
    backgroundColor: colors.textSecondary,
  },
  enviarIcone: {
    fontSize: 20,
    color: colors.textLight,
  },
});
