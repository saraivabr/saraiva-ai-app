import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, shadows } from '../design-system/tokens';
import { painelApi } from '../services/api';

interface PerfilContato {
  contato: {
    id: number;
    nome: string;
    foto_url: string | null;
    total_mensagens: number;
    primeira_interacao: string | null;
    ultima_interacao: string | null;
  };
  perfil: {
    profissao: string | null;
    empresa: string | null;
    interesses: string[];
    estado_civil: string | null;
    aniversario: string | null;
  } | null;
  score: {
    total: number;
    frequencia: number;
    reciprocidade: number;
    engajamento: number;
    status: string;
    dias_desde_ultima_msg: number;
  };
  fatos: Array<{
    id: number;
    tipo: string;
    conteudo: string;
  }>;
}

export default function PerfilContatoScreen({ route, navigation }: any) {
  const { contatoId, nome } = route.params;
  const [perfil, setPerfil] = useState<PerfilContato | null>(null);
  const [loading, setLoading] = useState(true);
  const [sugestao, setSugestao] = useState<string | null>(null);

  useEffect(() => {
    carregarPerfil();
  }, [contatoId]);

  const carregarPerfil = async () => {
    try {
      const dados = await painelApi.getPerfilContato(contatoId);
      setPerfil(dados);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const gerarSugestao = async () => {
    try {
      const dados = await painelApi.getSugestao(contatoId);
      setSugestao(dados.sugestao);
    } catch (error) {
      console.error('Erro ao gerar sugestao:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#22C55E';
    if (score >= 50) return '#F59E0B';
    if (score >= 30) return '#F97316';
    return '#EF4444';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'forte': return 'Relacionamento Forte';
      case 'normal': return 'Normal';
      case 'esfriando': return 'Esfriando';
      case 'frio': return 'Frio';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.aiPrimary} />
      </View>
    );
  }

  if (!perfil) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erro ao carregar perfil</Text>
      </View>
    );
  }

  const { contato, score, fatos } = perfil;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.aiPrimary]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          {contato.foto_url ? (
            <Image source={{ uri: contato.foto_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {contato.nome?.charAt(0) || '?'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.nomeContato}>{contato.nome}</Text>
        <Text style={styles.statusContato}>{getStatusText(score.status)}</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreMain}>
            <Text style={[styles.scoreValue, { color: getScoreColor(score.total) }]}>
              {score.total}
            </Text>
            <Text style={styles.scoreLabel}>Relationship Score</Text>
          </View>

          <View style={styles.scoreDetails}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreItemValue}>{score.frequencia}</Text>
              <Text style={styles.scoreItemLabel}>Frequencia</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreItemValue}>{score.reciprocidade}</Text>
              <Text style={styles.scoreItemLabel}>Reciprocidade</Text>
            </View>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreItemValue}>{score.engajamento}</Text>
              <Text style={styles.scoreItemLabel}>Engajamento</Text>
            </View>
          </View>

          {score.dias_desde_ultima_msg > 0 && (
            <Text style={styles.diasInfo}>
              Ultima mensagem ha {score.dias_desde_ultima_msg} dias
            </Text>
          )}
        </View>

        {/* Perfil Info */}
        {perfil.perfil && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informacoes</Text>

            {perfil.perfil.profissao && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Profissao</Text>
                <Text style={styles.infoValue}>{perfil.perfil.profissao}</Text>
              </View>
            )}

            {perfil.perfil.empresa && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Empresa</Text>
                <Text style={styles.infoValue}>{perfil.perfil.empresa}</Text>
              </View>
            )}

            {perfil.perfil.interesses && perfil.perfil.interesses.length > 0 && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Interesses</Text>
                <View style={styles.tagsContainer}>
                  {perfil.perfil.interesses.map((interesse, i) => (
                    <View key={i} style={styles.tag}>
                      <Text style={styles.tagText}>{interesse}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Fatos */}
        {fatos && fatos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>O que sei sobre {contato.nome}</Text>

            {fatos.map((fato) => (
              <View key={fato.id} style={styles.fatoCard}>
                <Text style={styles.fatoTipo}>
                  {fato.tipo === 'evento' ? 'Evento' :
                   fato.tipo === 'compromisso' ? 'Compromisso' :
                   fato.tipo === 'promessa' ? 'Promessa' : 'Fato'}
                </Text>
                <Text style={styles.fatoConteudo}>{fato.conteudo}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sugestao */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sugestao de mensagem</Text>

          {sugestao ? (
            <View style={styles.sugestaoCard}>
              <Text style={styles.sugestaoText}>{sugestao}</Text>
              <TouchableOpacity
                style={styles.enviarButton}
                onPress={() => navigation.navigate('Chat', {
                  jid: `${contatoId}@s.whatsapp.net`,
                  nome: contato.nome,
                  mensagemInicial: sugestao
                })}
              >
                <Text style={styles.enviarButtonText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.gerarButton} onPress={gerarSugestao}>
              <Text style={styles.gerarButtonText}>Gerar sugestao</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estatisticas</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{contato.total_mensagens}</Text>
              <Text style={styles.statLabel}>Total de mensagens</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: spacing.lg,
    top: 50,
  },
  backButtonText: {
    ...typography.body,
    color: colors.textLight,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.textLight,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.headingXL,
    color: colors.textLight,
  },
  nomeContato: {
    ...typography.headingLG,
    color: colors.textLight,
  },
  statusContato: {
    ...typography.body,
    color: colors.textLight,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  scoreMain: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '700',
  },
  scoreLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scoreDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreItemValue: {
    ...typography.headingMD,
    color: colors.textPrimary,
  },
  scoreItemLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  diasInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingSM,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  infoItem: {
    marginBottom: spacing.md,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tag: {
    backgroundColor: colors.surfaceMagic,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  tagText: {
    ...typography.caption,
    color: colors.aiPrimary,
  },
  fatoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  fatoTipo: {
    ...typography.caption,
    color: colors.aiPrimary,
    marginRight: spacing.sm,
    fontWeight: '600',
  },
  fatoConteudo: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  sugestaoCard: {
    backgroundColor: colors.surfaceMagic,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.aiPrimary,
  },
  sugestaoText: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  enviarButton: {
    backgroundColor: colors.aiPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  enviarButtonText: {
    ...typography.button,
    color: colors.textLight,
  },
  gerarButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.aiPrimary,
    borderStyle: 'dashed',
  },
  gerarButtonText: {
    ...typography.body,
    color: colors.aiPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flex: 1,
    minWidth: '45%',
    ...shadows.sm,
  },
  statValue: {
    ...typography.headingLG,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
