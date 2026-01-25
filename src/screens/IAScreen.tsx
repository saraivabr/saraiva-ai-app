import React, { useState, useRef, useEffect } from 'react';
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
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { iaApi } from '../services/api';
import { useFeatureUsada } from '../components/TooltipOnboarding';

interface Mensagem {
  id: string;
  texto: string;
  remetente: 'usuario' | 'ia';
  hora: string;
}

const PROMPTS_RAPIDOS = [
  'Manda oi pro João',
  'O que o Pedro disse?',
  'Quem falou de reunião?',
  'Resumo do dia',
];

export default function IAScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { usada: abaUsada, marcarUsada: marcarAbaUsada } = useFeatureUsada('aba_ia');

  // Marca a aba como usada na primeira visita
  useEffect(() => {
    if (!abaUsada) {
      marcarAbaUsada();
    }
  }, [abaUsada, marcarAbaUsada]);

  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: '1',
      texto: 'Olá! Sou o Saraiva.AI, seu assistente pessoal.\n\nPosso fazer várias coisas por você:\n\n📤 Enviar mensagens: "Manda oi pro João"\n📖 Ler conversas: "O que o Pedro disse?"\n🔍 Buscar: "Quem falou de reunião?"\n📝 Resumir: "Resume conversa com Maria"\n\nO que você precisa?',
      remetente: 'ia',
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [texto, setTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const enviarPergunta = async (pergunta?: string) => {
    const textoEnviar = pergunta || texto;
    if (!textoEnviar.trim()) return;

    const novaMensagemUsuario: Mensagem = {
      id: Date.now().toString(),
      texto: textoEnviar,
      remetente: 'usuario',
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMensagens((prev) => [...prev, novaMensagemUsuario]);
    setTexto('');
    setCarregando(true);

    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    try {
      const resposta = await iaApi.chat(textoEnviar);

      const novaMensagemIA: Mensagem = {
        id: (Date.now() + 1).toString(),
        texto: resposta,
        remetente: 'ia',
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMensagens((prev) => [...prev, novaMensagemIA]);
    } catch (error) {
      const mensagemErro: Mensagem = {
        id: (Date.now() + 1).toString(),
        texto: 'Desculpe, não consegui processar sua pergunta. Tente novamente.',
        remetente: 'ia',
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMensagens((prev) => [...prev, mensagemErro]);
    } finally {
      setCarregando(false);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    }
  };

  const renderMensagem = ({ item }: { item: Mensagem }) => {
    const isUsuario = item.remetente === 'usuario';
    const maxBubbleWidth = screenWidth * 0.8;

    return (
      <View
        style={[
          styles.mensagemContainer,
          { maxWidth: maxBubbleWidth },
          isUsuario ? styles.mensagemUsuario : styles.mensagemIA,
        ]}
      >
        <View
          style={[
            styles.balao,
            isUsuario ? styles.balaoUsuario : styles.balaoIA,
          ]}
        >
          <Text style={[styles.mensagemTexto, isUsuario && styles.textoUsuario]}>
            {item.texto}
          </Text>
          <Text style={[styles.hora, isUsuario && styles.horaUsuario]}>
            {item.hora}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header do Assistente */}
      <View style={styles.header}>
        <View style={styles.avatarIA}>
          <Text style={styles.avatarTexto}>🤖</Text>
        </View>
        <View>
          <Text style={styles.headerNome}>Saraiva.AI</Text>
          <Text style={styles.headerStatus}>
            {carregando ? 'digitando...' : 'online'}
          </Text>
        </View>
      </View>

      {/* Lista de mensagens */}
      <FlatList
        ref={flatListRef}
        data={mensagens}
        keyExtractor={(item) => item.id}
        renderItem={renderMensagem}
        contentContainerStyle={styles.listContent}
        style={styles.flatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        showsVerticalScrollIndicator={false}
      />

      {/* Prompts rápidos */}
      {mensagens.length <= 1 && (
        <View style={styles.promptsContainer}>
          <Text style={styles.promptsLabel}>Sugestões:</Text>
          <View style={styles.promptsGrid}>
            {PROMPTS_RAPIDOS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={styles.promptChip}
                onPress={() => enviarPergunta(prompt)}
              >
                <Text style={styles.promptChipTexto}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Indicador de carregamento */}
      {carregando && (
        <View style={styles.carregandoContainer}>
          <ActivityIndicator size="small" color={colors.iaAccent} />
          <Text style={styles.carregandoTexto}>Pensando...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Pergunte algo..."
          placeholderTextColor={colors.textSecondary}
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={4096}
          editable={!carregando}
        />
        <TouchableOpacity
          style={[
            styles.enviarBotao,
            (!texto.trim() || carregando) && styles.enviarBotaoDisabled,
          ]}
          onPress={() => enviarPergunta()}
          disabled={!texto.trim() || carregando}
        >
          <Text style={styles.enviarIcone}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Fundo mais escuro para aba IA
  },
  flatList: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  avatarIA: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: colors.iaAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarTexto: {
    fontSize: 24,
  },
  headerNome: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textLight,
  },
  headerStatus: {
    fontSize: fontSize.sm,
    color: colors.secondary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  mensagemContainer: {
    marginVertical: spacing.xs,
  },
  mensagemUsuario: {
    alignSelf: 'flex-end',
  },
  mensagemIA: {
    alignSelf: 'flex-start',
  },
  balao: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  balaoUsuario: {
    backgroundColor: colors.iaAccent,
    borderTopRightRadius: 0,
  },
  balaoIA: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#0f3460',
  },
  mensagemTexto: {
    fontSize: fontSize.md,
    color: colors.textLight,
    lineHeight: 22,
  },
  textoUsuario: {
    color: colors.textLight,
  },
  hora: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  horaUsuario: {
    color: 'rgba(255,255,255,0.7)',
  },
  promptsContainer: {
    padding: spacing.md,
    backgroundColor: '#16213e',
  },
  promptsLabel: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    marginBottom: spacing.sm,
    opacity: 0.7,
  },
  promptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  promptChip: {
    backgroundColor: '#0f3460',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.iaAccent,
  },
  promptChipTexto: {
    color: colors.textLight,
    fontSize: fontSize.sm,
  },
  carregandoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#16213e',
  },
  carregandoTexto: {
    color: colors.iaAccent,
    marginLeft: spacing.sm,
    fontSize: fontSize.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    backgroundColor: '#16213e',
  },
  input: {
    flex: 1,
    backgroundColor: '#0f3460',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textLight,
    maxHeight: 100,
    marginRight: spacing.sm,
  },
  enviarBotao: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.iaAccent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enviarBotaoDisabled: {
    backgroundColor: '#0f3460',
  },
  enviarIcone: {
    fontSize: 20,
    color: colors.textLight,
  },
});
