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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, agentesApi, Mensagem, SugestaoResposta, OpcaoArquetipo, AgenteMissao, SugestaoAgente } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { loadCachedMensagens, saveCachedMensagens } from '../services/cache';
import { useConnectivity } from '../hooks/useConnectivity';
import AtivarAgenteModal from '../components/AtivarAgenteModal';
import AgenteBadge from '../components/AgenteBadge';
import InlineSuggestions from '../components/InlineSuggestions';
import QuickReplyChips from '../components/QuickReplyChips';
import SmartComposePreview from '../components/SmartComposePreview';

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
  const autoRespondendoRef = useRef(false);
  const ultimoAutoMessageIdRef = useRef<string | null>(null);
  const agenteAtivadoAgoraRef = useRef(false);

  // Estado para sugestoes inline (substitui navegacao para SuggestionsScreen)
  const [showInlineSuggestions, setShowInlineSuggestions] = useState(false);
  const [inlineSuggestionsLoading, setInlineSuggestionsLoading] = useState(false);
  const [inlineOpcoes, setInlineOpcoes] = useState<OpcaoArquetipo[]>([]);
  const [inlineAnalise, setInlineAnalise] = useState<string | undefined>();
  const [inlineConfianca, setInlineConfianca] = useState<number | undefined>();

  // Feature 8: Quick Replies - mostra quando tem mensagem recebida e nao esta digitando
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  // Feature 3: Smart Compose
  const [showSmartCompose, setShowSmartCompose] = useState(false);


  const normalizarConfianca = (valor?: number) => {
    if (typeof valor !== 'number') {
      return undefined;
    }
    if (valor > 1) {
      return Math.min(valor / 100, 1);
    }
    return Math.max(valor, 0);
  };

  const formatarConfiancaPercentual = (valor?: number) => {
    const normalizada = normalizarConfianca(valor);
    if (normalizada === undefined) {
      return '';
    }
    return `${Math.round(normalizada * 100)}%`;
  };

  const agenteAutoAtivo = Boolean(
    agente &&
      agente.status === 'ativo' &&
      (agente.modo === 'automatico' || agente.modo === 'hibrido')
  );

  // Carrega agente ativo para esta conversa
  const carregarAgente = useCallback(async () => {
    try {
      const data = await agentesApi.get(jid);
      setAgente(data.agente);
    } catch (error) {
      console.error('Erro ao carregar agente:', error);
    }
  }, [jid]);

  const atualizarHasMore = useCallback((nextOffset: number, nextTotal: number) => {
    setHasMore(nextOffset < nextTotal);
  }, []);

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

  const { isConnected, lastError, reconnectAttempts, watchConversation, unwatchConversation, reconnect } = useWebSocket({
    onNewMessage: useCallback((mensagemJid: string, mensagem: any) => {
      if (mensagemJid !== jid) return;
      setMensagens((prev) => {
        // Check if message already exists by real message_id
        if (prev.some((m) => m.message_id === mensagem.message_id)) {
          return prev;
        }

        // Check for optimistic message match (same content, sent within 30s)
        // This handles deduplication when server echoes back our sent message
        const msgTime = mensagem.data_hora ? new Date(mensagem.data_hora).getTime() : Date.now();
        const isOutgoing = mensagem.direcao === 'enviada';

        if (isOutgoing) {
          const optimisticMatch = prev.findIndex((m) => {
            if (!m.message_id.startsWith('sent_')) return false;
            if (m.conteudo !== mensagem.conteudo) return false;
            const mTime = m.data_hora ? new Date(m.data_hora).getTime() : 0;
            return Math.abs(msgTime - mTime) < 30000; // Within 30 seconds
          });

          if (optimisticMatch !== -1) {
            // Replace optimistic message with real one
            const updated = [...prev];
            updated[optimisticMatch] = mensagem;
            return updated;
          }
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

  // Registra envio de mensagem do agente
  const registrarEnvioAgente = useCallback(async (aprovado: boolean) => {
    if (agente) {
      try {
        await agentesApi.registrarEnvio(jid, aprovado);
        // Recarrega agente para atualizar metricas
        carregarAgente();
      } catch (error) {
        console.error('Erro ao registrar envio:', error);
      }
    }
  }, [agente, jid, carregarAgente]);

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
      Alert.alert(
        'Mensagem nao enviada',
        'A mensagem nao foi entregue. Verifique sua conexao e tente novamente.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Tentar novamente', onPress: () => enviarMensagem(textoEnviar) }
        ]
      );
    } finally {
      setEnviando(false);
    }
  };

  // Envia mensagens em sequência (como humano faria)
  const enviarMensagensEmSequencia = async (mensagensParaEnviar: string[], confirmar = true) => {
    if (!mensagensParaEnviar || mensagensParaEnviar.length === 0) return;

    // Se tem mais de 1 mensagem, pede confirmacao
    if (confirmar && mensagensParaEnviar.length > 1) {
      const preview = mensagensParaEnviar
        .map((msg, i) => `${i + 1}. ${msg.length > 50 ? msg.substring(0, 50) + '...' : msg}`)
        .join('\n');

      Alert.alert(
        `Enviar ${mensagensParaEnviar.length} mensagens?`,
        preview,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar todas',
            onPress: () => enviarMensagensEmSequencia(mensagensParaEnviar, false),
          },
        ]
      );
      return;
    }

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
      Alert.alert(
        'Envio interrompido',
        'Algumas mensagens podem nao ter sido enviadas. Verifique a conversa e tente novamente se necessario.',
        [{ text: 'OK' }]
      );
    } finally {
      setEnviando(false);
    }
  };

  const responderComAgente = useCallback(async ({
    mensagemBase,
    forcar = false,
    contextoExtra,
    chaveContexto,
  }: {
    mensagemBase?: Mensagem | null;
    forcar?: boolean;
    contextoExtra?: string;
    chaveContexto?: string;
  } = {}) => {
    if (!agenteAutoAtivo) return;
    if (autoRespondendoRef.current) return;
    if (!mensagemBase && !contextoExtra) {
      return;
    }
    if (mensagemBase && mensagemBase.direcao !== 'recebida') {
      return;
    }

    const baseKey = chaveContexto || mensagemBase?.message_id || 'sem_mensagem';
    if (!forcar && ultimoAutoMessageIdRef.current === baseKey) {
      return;
    }

    autoRespondendoRef.current = true;

    // Mostra sugestao inline
    setShowInlineSuggestions(true);
    setInlineSuggestionsLoading(true);
    setInlineOpcoes([]);

    try {
      const instrucaoProativa = 'Seja direto, puxe assunto e avance a conversa com proposta clara.';
      const mensagemContextoBase = contextoExtra || mensagemBase?.conteudo || '';
      const mensagemContexto = mensagemContextoBase
        ? `${mensagemContextoBase}\n\n${instrucaoProativa}`
        : instrucaoProativa;
      const resposta = await agentesApi.gerarResposta(jid, mensagemContexto);
      const mensagensGeradas = resposta.sugestao?.mensagens || [];

      if (mensagensGeradas.length > 0) {
        setInlineOpcoes([{
          tipo: agente?.tipo || 'agente',
          icone: agente?.tipo_info?.icone || '🎯',
          nome: agente?.tipo_info?.nome || 'Agente',
          descricao: resposta.sugestao?.estrategia || '',
          mensagens: mensagensGeradas,
        }]);
        setInlineConfianca(normalizarConfianca(resposta.sugestao?.confianca));
      } else {
        setShowInlineSuggestions(false);
        autoRespondendoRef.current = false;
      }

      ultimoAutoMessageIdRef.current = baseKey;
    } catch (error) {
      console.error('Erro ao responder com agente:', error);
      setShowInlineSuggestions(false);
      autoRespondendoRef.current = false;
    } finally {
      setInlineSuggestionsLoading(false);
    }
  }, [agenteAutoAtivo, jid, agente]);

  useEffect(() => {
    if (!agenteAutoAtivo) {
      ultimoAutoMessageIdRef.current = null;
      agenteAtivadoAgoraRef.current = false;
      return;
    }
    if (!agenteAtivadoAgoraRef.current) return;
    agenteAtivadoAgoraRef.current = false;
    const ultimaRecebida = [...mensagens].reverse().find((m) => m.direcao === 'recebida');
    if (ultimaRecebida) {
      responderComAgente({ mensagemBase: ultimaRecebida, forcar: true });
      return;
    }
    const ultimaMensagem = [...mensagens].reverse().find((m) => m.conteudo);
    const conteudoBase = ultimaMensagem?.conteudo?.trim() || '';
    const contextoExtra = conteudoBase
      ? `Inicie a conversa com base na ultima mensagem enviada: ${conteudoBase}`
      : 'Inicie a conversa de forma proativa e puxe assunto.';
    const chaveContexto = ultimaMensagem?.message_id
      ? `start_${ultimaMensagem.message_id}`
      : 'start_sem_mensagem';
    responderComAgente({ contextoExtra, chaveContexto, forcar: true });
  }, [agenteAutoAtivo, mensagens, responderComAgente]);

  useEffect(() => {
    if (!agenteAutoAtivo) return;
    const ultimaRecebida = [...mensagens].reverse().find((m) => m.direcao === 'recebida');
    if (!ultimaRecebida || !ultimaRecebida.message_id) return;
    if (!ultimoAutoMessageIdRef.current) {
      ultimoAutoMessageIdRef.current = ultimaRecebida.message_id;
      return;
    }
    if (ultimoAutoMessageIdRef.current !== ultimaRecebida.message_id) {
      responderComAgente({ mensagemBase: ultimaRecebida });
    }
  }, [agenteAutoAtivo, mensagens, responderComAgente]);

  // Feature 8: Quick Replies - mostra quando ultima mensagem foi recebida
  useEffect(() => {
    if (mensagens.length === 0) return;
    const ultimaMensagem = mensagens[mensagens.length - 1];
    const deveExibir = ultimaMensagem?.direcao === 'recebida' && !showInlineSuggestions && !agente;
    setShowQuickReplies(deveExibir);
  }, [mensagens, showInlineSuggestions, agente]);

  // Esconde quick replies quando usuario comeca a digitar
  useEffect(() => {
    if (texto.length > 0) {
      setShowQuickReplies(false);
    }
  }, [texto]);

  // Envia todas as mensagens sugeridas em sequência (formato simples)
  const enviarTodasSugestoes = async () => {
    if (!sugestao) {
      Alert.alert('Sem sugestao', 'Toque na varinha magica para gerar uma sugestao primeiro.');
      return;
    }
    if (!sugestao.mensagens || sugestao.mensagens.length === 0) {
      Alert.alert(
        'Sugestao vazia',
        'A IA nao gerou mensagens desta vez. Tente gerar novamente.',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Gerar nova', onPress: solicitarSugestao }
        ]
      );
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
        ...sugestao,
        mensagens: novasMensagens,
        texto_unico: novasMensagens.join(' | ')
      });
    }
  };

  const solicitarSugestao = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Mostra painel inline e inicia loading
    setShowInlineSuggestions(true);
    setInlineSuggestionsLoading(true);
    setInlineOpcoes([]);
    setInlineAnalise(undefined);
    setInlineConfianca(undefined);

    // Se tem agente ativo, usa sugestao do agente
    if (agente && agente.status === 'ativo') {
      try {
        // Pega a ultima mensagem recebida
        const ultimaRecebida = mensagens.filter(m => m.direcao === 'recebida').pop();
        const mensagemContexto = ultimaRecebida?.conteudo || '';

        const resposta = await agentesApi.gerarResposta(jid, mensagemContexto);
        const confiancaTexto = formatarConfiancaPercentual(resposta.sugestao.confianca);

        // Mostra sugestoes inline
        setInlineOpcoes([{
          tipo: agente.tipo,
          icone: agente.tipo_info?.icone || '🎯',
          nome: `${agente.tipo_info?.nome || 'Agente'}${confiancaTexto ? ` (${confiancaTexto})` : ''}`,
          descricao: resposta.sugestao.estrategia,
          mensagens: resposta.sugestao.mensagens,
        }]);
        setInlineAnalise(resposta.sugestao.analise);
        setInlineConfianca(normalizarConfianca(resposta.sugestao.confianca));
      } catch (error) {
        setShowInlineSuggestions(false);
        Alert.alert(
          'Sugestao indisponivel',
          'O agente nao conseguiu gerar uma resposta agora. Isso pode acontecer quando:\n\n• A conexao esta instavel\n• O servidor esta ocupado\n\nTente novamente em alguns segundos.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Tentar novamente', onPress: solicitarSugestao }
          ]
        );
      } finally {
        setInlineSuggestionsLoading(false);
      }
    } else {
      // Sugestao normal
      try {
        const resposta = await conversasApi.sugerir(jid);

        // Mostra sugestoes inline
        setInlineOpcoes(resposta.opcoes || [{
          tipo: 'default',
          icone: '💬',
          nome: 'Sugestao',
          descricao: 'Resposta sugerida pela IA',
          mensagens: resposta.mensagens,
        }]);
        setInlineAnalise(resposta.analise);
        setInlineConfianca(normalizarConfianca(resposta.confianca));
      } catch (error) {
        setShowInlineSuggestions(false);
        Alert.alert(
          'Sugestao indisponivel',
          'Nao foi possivel gerar uma sugestao neste momento.\n\nDica: verifique se ha mensagens recentes na conversa para a IA analisar.',
          [
            { text: 'OK', style: 'cancel' },
            { text: 'Tentar novamente', onPress: solicitarSugestao }
          ]
        );
      } finally {
        setInlineSuggestionsLoading(false);
      }
    }
  };

  // Handler para enviar sugestao inline
  const handleSendInlineSuggestion = async (mensagensParaEnviar: string[]) => {
    setShowInlineSuggestions(false);
    autoRespondendoRef.current = false;
    await enviarMensagensEmSequencia(mensagensParaEnviar, false);
    if (agente) {
      await registrarEnvioAgente(true);
    }
  };

  // Handler para cancelar sugestao inline
  const handleCancelInlineSuggestion = () => {
    setShowInlineSuggestions(false);
    setInlineOpcoes([]);
    autoRespondendoRef.current = false;
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
    const isAudio = item.tipo === 'audio';
    const transcricao = item.conteudo?.trim() || '';
    const hasTranscricao = transcricao.length > 0;

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
          {isAudio ? (
            <View style={styles.transcricaoContainer}>
              <View style={styles.transcricaoHeader}>
                <Text style={styles.transcricaoLabel}>Transcrição</Text>
                {item.duracao_audio ? (
                  <Text style={styles.transcricaoDuracao}>{item.duracao_audio}s</Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.mensagemTexto,
                  !hasTranscricao && styles.transcricaoPlaceholder
                ]}
              >
                {hasTranscricao ? transcricao : 'Transcrição pendente'}
              </Text>
            </View>
          ) : item.conteudo ? (
            <Text style={styles.mensagemTexto}>{item.conteudo}</Text>
          ) : null}
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

      {/* Sugestoes Inline (expande acima do input) */}
      <InlineSuggestions
        visible={showInlineSuggestions}
        loading={inlineSuggestionsLoading}
        opcoes={inlineOpcoes}
        analise={inlineAnalise}
        confianca={inlineConfianca}
        onSend={handleSendInlineSuggestion}
        onCancel={handleCancelInlineSuggestion}
      />

      {/* Feature 8: Quick Reply Chips */}
      <QuickReplyChips
        jid={jid}
        visible={showQuickReplies}
        onSelectReply={(reply) => {
          setTexto(reply);
          setShowQuickReplies(false);
        }}
      />

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

        {/* Botao Smart Compose (Feature 3) */}
        <TouchableOpacity
          style={styles.composeButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowSmartCompose(true);
          }}
        >
          <Text style={styles.composeButtonText}>✨</Text>
        </TouchableOpacity>

        {/* Botao Sugerir (varinha magica ou agente) */}
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
          agenteAtivadoAgoraRef.current = true;
          setSugestao(null);
          setSugestaoAgente(null);
        }}
      />

      {/* Feature 3: Smart Compose Modal */}
      <SmartComposePreview
        jid={jid}
        visible={showSmartCompose}
        onClose={() => setShowSmartCompose(false)}
        onSelectMessage={(mensagem) => {
          setTexto(mensagem);
          setShowSmartCompose(false);
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
  transcricaoContainer: {
    gap: spacing.xs,
  },
  transcricaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transcricaoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  transcricaoDuracao: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  transcricaoPlaceholder: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  sugestaoContainer: {
    padding: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    maxHeight: 360,
    alignSelf: 'center',
    width: '92%',
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
  confiancaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  confiancaBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confiancaBar: {
    height: '100%',
    borderRadius: 3,
  },
  confiancaTexto: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    minWidth: 90,
  },
  avisoConfianca: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  avisoConfiancaTexto: {
    fontSize: fontSize.sm,
    color: '#E65100',
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
    maxHeight: 84,
  },
  sugestaoTexto: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sugestaoMensagens: {
    marginBottom: spacing.sm,
    maxHeight: 140,
  },
  sugestaoMsgItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    marginTop: 2,
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
  composeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  composeButtonText: {
    fontSize: 16,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.iaAccent,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalBtnPrimary: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    color: colors.textLight,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalBtnSecondary: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  previewContainer: {
    marginTop: spacing.md,
  },
  previewMsgBalao: {
    backgroundColor: colors.bubbleSent,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.bubble,
    borderTopRightRadius: 0,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  previewMsgTexto: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
});
