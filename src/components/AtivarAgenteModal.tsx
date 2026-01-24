import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { agentesApi, TipoAgente, AgenteMissao } from '../services/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  jid: string;
  nomeContato: string;
  agenteAtivo?: AgenteMissao | null;
  onAgenteAtivado?: (agente: AgenteMissao) => void;
}

type Modo = 'automatico' | 'aprovacao' | 'hibrido';

const MODOS: { id: Modo; nome: string; icone: string; descricao: string }[] = [
  {
    id: 'aprovacao',
    nome: 'Aprovacao',
    icone: '✋',
    descricao: 'Voce aprova cada mensagem antes de enviar',
  },
  {
    id: 'hibrido',
    nome: 'Hibrido',
    icone: '⚡',
    descricao: 'Automatico mas pode pausar quando quiser',
  },
  {
    id: 'automatico',
    nome: 'Automatico',
    icone: '🤖',
    descricao: 'IA responde sozinha (cuidado!)',
  },
];

export default function AtivarAgenteModal({
  visible,
  onClose,
  jid,
  nomeContato,
  agenteAtivo,
  onAgenteAtivado,
}: Props) {
  const [tipos, setTipos] = useState<TipoAgente[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Form state
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('');
  const [modoSelecionado, setModoSelecionado] = useState<Modo>('aprovacao');
  const [foco, setFoco] = useState('');
  const [meta, setMeta] = useState('');

  useEffect(() => {
    if (visible) {
      carregarTipos();
      // Se tem agente ativo, preenche o form
      if (agenteAtivo) {
        setTipoSelecionado(agenteAtivo.tipo);
        setModoSelecionado(agenteAtivo.modo);
        setFoco(agenteAtivo.foco);
        setMeta(agenteAtivo.meta || '');
      } else {
        // Reset form
        setTipoSelecionado('');
        setModoSelecionado('aprovacao');
        setFoco('');
        setMeta('');
      }
    }
  }, [visible, agenteAtivo]);

  const carregarTipos = async () => {
    try {
      const data = await agentesApi.listarTipos();
      setTipos(data.tipos);
      if (!agenteAtivo && data.tipos.length > 0) {
        setTipoSelecionado(data.tipos[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar tipos:', error);
    } finally {
      setLoading(false);
    }
  };

  const tipoInfo = tipos.find(t => t.id === tipoSelecionado);

  const ativarAgente = async () => {
    if (!tipoSelecionado || !foco.trim()) {
      Alert.alert('Erro', 'Selecione um tipo e defina o foco da conversa');
      return;
    }

    setEnviando(true);
    try {
      const resultado = await agentesApi.ativar({
        jid,
        tipo: tipoSelecionado,
        modo: modoSelecionado,
        foco: foco.trim(),
        meta: meta.trim() || undefined,
      });

      Alert.alert('Sucesso', resultado.mensagem);

      // Busca agente atualizado
      const { agente } = await agentesApi.get(jid);
      if (agente && onAgenteAtivado) {
        onAgenteAtivado(agente);
      }

      onClose();
    } catch (error) {
      console.error('Erro ao ativar agente:', error);
      Alert.alert('Erro', 'Nao foi possivel ativar o agente');
    } finally {
      setEnviando(false);
    }
  };

  const desativarAgente = async () => {
    Alert.alert(
      'Desativar Agente',
      'Tem certeza que deseja encerrar esta missao?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            try {
              await agentesApi.desativar(jid);
              if (onAgenteAtivado) {
                onAgenteAtivado(null as any);
              }
              onClose();
            } catch (error) {
              Alert.alert('Erro', 'Nao foi possivel desativar o agente');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.headerCancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {agenteAtivo ? 'Editar Missao' : 'Ativar Agente'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.iaAccent} />
            </View>
          ) : (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Contato */}
              <View style={styles.contatoInfo}>
                <Text style={styles.contatoNome}>{nomeContato}</Text>
                <Text style={styles.contatoJid}>{jid.split('@')[0]}</Text>
              </View>

              {/* Tipo de Agente */}
              <Text style={styles.sectionTitle}>Tipo de Agente</Text>
              <View style={styles.tiposGrid}>
                {tipos.map((tipo) => (
                  <TouchableOpacity
                    key={tipo.id}
                    style={[
                      styles.tipoCard,
                      tipoSelecionado === tipo.id && styles.tipoCardSelecionado,
                    ]}
                    onPress={() => setTipoSelecionado(tipo.id)}
                  >
                    <Text style={styles.tipoIcone}>{tipo.icone}</Text>
                    <Text
                      style={[
                        styles.tipoNome,
                        tipoSelecionado === tipo.id && styles.tipoNomeSelecionado,
                      ]}
                    >
                      {tipo.nome}
                    </Text>
                    <Text style={styles.tipoDescricao}>{tipo.descricao}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tecnicas do tipo selecionado */}
              {tipoInfo && (
                <View style={styles.tecnicasBox}>
                  <Text style={styles.tecnicasTitle}>Tecnicas aplicadas:</Text>
                  {tipoInfo.tecnicas.map((tecnica, index) => (
                    <Text key={index} style={styles.tecnicaItem}>
                      • {tecnica}
                    </Text>
                  ))}
                  <Text style={styles.tomTexto}>Tom: {tipoInfo.tom}</Text>
                </View>
              )}

              {/* Modo de Operacao */}
              <Text style={styles.sectionTitle}>Modo de Operacao</Text>
              <View style={styles.modosContainer}>
                {MODOS.map((modo) => (
                  <TouchableOpacity
                    key={modo.id}
                    style={[
                      styles.modoOption,
                      modoSelecionado === modo.id && styles.modoOptionSelecionado,
                    ]}
                    onPress={() => setModoSelecionado(modo.id)}
                  >
                    <Text style={styles.modoIcone}>{modo.icone}</Text>
                    <View style={styles.modoTextos}>
                      <Text
                        style={[
                          styles.modoNome,
                          modoSelecionado === modo.id && styles.modoNomeSelecionado,
                        ]}
                      >
                        {modo.nome}
                      </Text>
                      <Text style={styles.modoDescricao}>{modo.descricao}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Foco */}
              <Text style={styles.sectionTitle}>Foco da Conversa *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Fechar proposta de consultoria"
                placeholderTextColor={colors.textSecondary}
                value={foco}
                onChangeText={setFoco}
                multiline
                numberOfLines={2}
              />

              {/* Meta (opcional) */}
              <Text style={styles.sectionTitle}>Meta (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Receber confirmacao ate sexta"
                placeholderTextColor={colors.textSecondary}
                value={meta}
                onChangeText={setMeta}
              />

              {/* Botoes */}
              <View style={styles.botoesContainer}>
                <TouchableOpacity
                  style={[styles.botao, styles.botaoAtivar]}
                  onPress={ativarAgente}
                  disabled={enviando}
                >
                  {enviando ? (
                    <ActivityIndicator color={colors.textLight} />
                  ) : (
                    <Text style={styles.botaoAtivarTexto}>
                      {agenteAtivo ? 'Atualizar' : 'Ativar Agente'}
                    </Text>
                  )}
                </TouchableOpacity>

                {agenteAtivo && (
                  <TouchableOpacity
                    style={[styles.botao, styles.botaoDesativar]}
                    onPress={desativarAgente}
                  >
                    <Text style={styles.botaoDesativarTexto}>Encerrar Missao</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerCancel: {
    fontSize: fontSize.md,
    color: colors.iaAccent,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    padding: spacing.xxl * 2,
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  contatoInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  contatoNome: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  contatoJid: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tipoCard: {
    width: '48%',
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tipoCardSelecionado: {
    borderColor: colors.iaAccent,
    borderWidth: 2,
    backgroundColor: colors.iaAccentLight,
  },
  tipoIcone: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  tipoNome: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tipoNomeSelecionado: {
    color: colors.iaAccent,
  },
  tipoDescricao: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  tecnicasBox: {
    backgroundColor: colors.iaAccentLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.iaAccent,
  },
  tecnicasTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.iaAccent,
    marginBottom: spacing.sm,
  },
  tecnicaItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  tomTexto: {
    fontSize: fontSize.sm,
    color: colors.iaAccent,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  modosContainer: {
    gap: spacing.sm,
  },
  modoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modoOptionSelecionado: {
    borderColor: colors.iaAccent,
    borderWidth: 2,
    backgroundColor: colors.iaAccentLight,
  },
  modoIcone: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  modoTextos: {
    flex: 1,
  },
  modoNome: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modoNomeSelecionado: {
    color: colors.iaAccent,
  },
  modoDescricao: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
  botoesContainer: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  botao: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  botaoAtivar: {
    backgroundColor: colors.iaAccent,
  },
  botaoAtivarTexto: {
    color: colors.textLight,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  botaoDesativar: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  botaoDesativarTexto: {
    color: '#FF3B30',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
