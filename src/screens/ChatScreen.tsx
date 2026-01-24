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
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, Mensagem, SugestaoResposta, OpcaoArquetipo } from '../services/api';

const INPUT_ACCESSORY_ID = 'chatInputAccessory';

interface Props {
  route: any;
  navigation: any;
}

export default function ChatScreen({ route, navigation }: Props) {
  const { jid, nome } = route.params;
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sugerindo, setSugerindo] = useState(false);
  const [sugestao, setSugestao] = useState<SugestaoResposta | null>(null);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = useWindowDimensions();

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: nome || jid.split('@')[0],
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textLight,
    });
  }, [navigation, nome, jid]);

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

  const carregarMensagens = useCallback(async (silent = false) => {
    try {
      const data = await conversasApi.mensagens(jid);

      // Verifica se tem mensagens novas
      if (data.mensagens.length > 0) {
        const ultimaMsg = data.mensagens[data.mensagens.length - 1];
        if (lastMessageIdRef.current !== ultimaMsg.message_id) {
          lastMessageIdRef.current = ultimaMsg.message_id;
          setMensagens(data.mensagens);
          if (!silent) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
        }
      } else {
        setMensagens(data.mensagens);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [jid]);

  // Carrega inicial + polling para auto-refresh
  useEffect(() => {
    carregarMensagens();

    // Polling a cada 5 segundos para novas mensagens
    pollingRef.current = setInterval(() => {
      carregarMensagens(true);
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [carregarMensagens]);

  const enviarMensagem = async (mensagemTexto?: string) => {
    const textoEnviar = mensagemTexto || texto;
    if (!textoEnviar.trim()) return;

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
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
    } finally {
      setEnviando(false);
    }
  };

  // Envia mensagens em sequência (como humano faria)
  const enviarMensagensEmSequencia = async (mensagensParaEnviar: string[]) => {
    if (!mensagensParaEnviar || mensagensParaEnviar.length === 0) return;

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
        // Pequeno delay entre mensagens (como humano)
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      setSugestao(null);
      setOpcaoSelecionada(0);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar as mensagens');
    } finally {
      setEnviando(false);
    }
  };

  // Envia todas as mensagens sugeridas em sequência (formato simples)
  const enviarTodasSugestoes = async () => {
    if (!sugestao || sugestao.mensagens.length === 0) return;
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
    setSugerindo(true);
    try {
      const resposta = await conversasApi.sugerir(jid);
      setSugestao(resposta);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar sugestão');
    } finally {
      setSugerindo(false);
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
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
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
                    onPress={() => setOpcaoSelecionada(index)}
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
              {sugestao.opcoes[opcaoSelecionada]?.mensagens && (
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
              )}

              <View style={styles.sugestaoBotoes}>
                <TouchableOpacity
                  style={[styles.sugestaoBotao, styles.sugestaoBotaoEnviar]}
                  onPress={() => {
                    const mensagensParaEnviar = sugestao.opcoes[opcaoSelecionada]?.mensagens || [];
                    if (mensagensParaEnviar.length > 0) {
                      enviarMensagensEmSequencia(mensagensParaEnviar);
                    }
                  }}
                  disabled={enviando}
                >
                  <Text style={styles.sugestaoBotaoTexto}>
                    {enviando ? 'Enviando...' : `Enviar ${sugestao.opcoes[opcaoSelecionada]?.nome || ''}`}
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
                Sugestão ({sugestao.mensagens.length} {sugestao.mensagens.length === 1 ? 'msg' : 'msgs'}):
              </Text>
              <View style={styles.sugestaoMensagens}>
                {sugestao.mensagens.map((msg, index) => (
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
                ))}
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

        {/* Botão Sugerir (varinha mágica) */}
        <TouchableOpacity
          style={styles.sugerirBotao}
          onPress={solicitarSugestao}
          disabled={sugerindo}
        >
          {sugerindo ? (
            <ActivityIndicator size="small" color={colors.iaAccent} />
          ) : (
            <Text style={styles.sugerirIcone}>🪄</Text>
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
