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
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, Mensagem } from '../services/api';

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
  const [sugestao, setSugestao] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({
      title: nome || jid.split('@')[0],
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textLight,
    });
  }, [navigation, nome, jid]);

  const carregarMensagens = useCallback(async () => {
    try {
      const data = await conversasApi.mensagens(jid);
      setMensagens(data.mensagens);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }, [jid]);

  useEffect(() => {
    carregarMensagens();
  }, [carregarMensagens]);

  const enviarMensagem = async (mensagemTexto?: string) => {
    const textoEnviar = mensagemTexto || texto;
    if (!textoEnviar.trim()) return;

    setEnviando(true);
    try {
      await conversasApi.enviar(jid, textoEnviar);
      setTexto('');
      setSugestao(null);
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

    return (
      <View
        style={[
          styles.mensagemContainer,
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Lista de mensagens */}
      <FlatList
        ref={flatListRef}
        data={mensagens}
        keyExtractor={(item) => item.message_id || String(item.id)}
        renderItem={renderMensagem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {/* Sugestão da IA */}
      {sugestao && (
        <View style={styles.sugestaoContainer}>
          <Text style={styles.sugestaoLabel}>Sugestão da IA:</Text>
          <Text style={styles.sugestaoTexto}>{sugestao}</Text>
          <View style={styles.sugestaoBotoes}>
            <TouchableOpacity
              style={[styles.sugestaoBotao, styles.sugestaoBotaoEnviar]}
              onPress={() => enviarMensagem(sugestao)}
            >
              <Text style={styles.sugestaoBotaoTexto}>✓ Enviar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sugestaoBotao, styles.sugestaoBotaoDescartar]}
              onPress={() => setSugestao(null)}
            >
              <Text style={styles.sugestaoBotaoTextoDescartar}>✕ Descartar</Text>
            </TouchableOpacity>
          </View>
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
    maxWidth: '80%',
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
  },
  sugestaoLabel: {
    fontSize: fontSize.xs,
    color: colors.iaAccent,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sugestaoTexto: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
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
