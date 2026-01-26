import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { painelApi, CoachInsights, InsightCoach, PadroesCoach } from '../services/api';

interface Props {
  navigation: any;
}

const INSIGHT_CORES = {
  positivo: { bg: '#E8F5E9', text: '#2E7D32', icon: '✅' },
  neutro: { bg: '#E3F2FD', text: '#1565C0', icon: '💡' },
  melhoria: { bg: '#FFF3E0', text: '#E65100', icon: '🎯' },
};

export default function CoachScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<CoachInsights | null>(null);
  const [periodo, setPeriodo] = useState(30);

  const carregarInsights = useCallback(async () => {
    try {
      const data = await painelApi.getCoachInsights(periodo);
      setInsights(data);
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [periodo]);

  useEffect(() => {
    carregarInsights();
  }, [carregarInsights]);

  const handleRefresh = () => {
    setRefreshing(true);
    carregarInsights();
  };

  const handlePeriodoChange = (dias: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriodo(dias);
    setLoading(true);
  };

  const renderPadrao = (label: string, valor: string | number, icone: string, descricao?: string) => (
    <View style={styles.padraoItem}>
      <Text style={styles.padraoIcone}>{icone}</Text>
      <View style={styles.padraoConteudo}>
        <Text style={styles.padraoLabel}>{label}</Text>
        <Text style={styles.padraoValor}>{valor}</Text>
        {descricao && <Text style={styles.padraoDescricao}>{descricao}</Text>}
      </View>
    </View>
  );

  const renderInsight = (insight: InsightCoach, idx: number) => {
    const cor = INSIGHT_CORES[insight.tipo] || INSIGHT_CORES.neutro;
    return (
      <View key={idx} style={[styles.insightCard, { backgroundColor: cor.bg }]}>
        <View style={styles.insightHeader}>
          <Text style={styles.insightIcon}>{cor.icon}</Text>
          <Text style={[styles.insightTitulo, { color: cor.text }]}>{insight.titulo}</Text>
        </View>
        <Text style={styles.insightDescricao}>{insight.descricao}</Text>
        {insight.acao_sugerida && (
          <View style={styles.acaoBox}>
            <Text style={styles.acaoLabel}>Acao sugerida:</Text>
            <Text style={[styles.acaoText, { color: cor.text }]}>{insight.acao_sugerida}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analisando sua comunicacao...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (insights?.status === 'dados_insuficientes') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyTitle}>Dados Insuficientes</Text>
          <Text style={styles.emptyText}>{insights.mensagem}</Text>
          <Text style={styles.emptyHint}>
            Continue conversando e volte em alguns dias para ver suas metricas.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎓 Coach de Comunicacao</Text>
          <Text style={styles.headerSubtitle}>
            Analise de {insights?.total_mensagens || 0} mensagens
          </Text>
        </View>

        {/* Periodo selector */}
        <View style={styles.periodoSelector}>
          {[7, 30, 90].map((dias) => (
            <TouchableOpacity
              key={dias}
              style={[
                styles.periodoBtn,
                periodo === dias && styles.periodoBtnAtivo,
              ]}
              onPress={() => handlePeriodoChange(dias)}
            >
              <Text style={[
                styles.periodoText,
                periodo === dias && styles.periodoTextAtivo,
              ]}>
                {dias} dias
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dica do dia */}
        {insights?.dica_do_dia && (
          <View style={styles.dicaCard}>
            <Text style={styles.dicaEmoji}>💡</Text>
            <View style={styles.dicaConteudo}>
              <Text style={styles.dicaTitulo}>Dica do Dia</Text>
              <Text style={styles.dicaTexto}>{insights.dica_do_dia}</Text>
            </View>
          </View>
        )}

        {/* Padroes */}
        {insights?.padroes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Seus Padroes</Text>
            <View style={styles.padroesGrid}>
              {renderPadrao(
                'Tamanho medio',
                `${insights.padroes.tamanho_medio_enviadas} chars`,
                '📏',
                insights.padroes.tamanho_medio_enviadas < 20 ? 'Mensagens curtas' :
                insights.padroes.tamanho_medio_enviadas > 100 ? 'Mensagens detalhadas' : 'Equilibrado'
              )}
              {renderPadrao(
                'Taxa de perguntas',
                `${insights.padroes.taxa_perguntas}%`,
                '❓',
                insights.padroes.taxa_perguntas < 10 ? 'Faca mais perguntas!' :
                insights.padroes.taxa_perguntas > 30 ? 'Voce mostra interesse' : 'Normal'
              )}
              {renderPadrao(
                'Tempo de resposta',
                `${insights.padroes.tempo_resposta_medio_minutos} min`,
                '⏱️',
                insights.padroes.tempo_resposta_medio_minutos < 5 ? 'Muito rapido' :
                insights.padroes.tempo_resposta_medio_minutos > 60 ? 'Demora um pouco' : 'Adequado'
              )}
              {renderPadrao(
                'Balanco',
                `${insights.padroes.balanco_conversacional}x`,
                '⚖️',
                insights.padroes.balanco_conversacional > 1.5 ? 'Envia mais do que recebe' :
                insights.padroes.balanco_conversacional < 0.7 ? 'Recebe mais do que envia' : 'Equilibrado'
              )}
              {renderPadrao(
                'Horario pico',
                `${insights.padroes.hora_pico}h`,
                '🕐',
                'Quando voce mais conversa'
              )}
              {renderPadrao(
                'Taxa de emojis',
                `${insights.padroes.taxa_emojis}%`,
                '😊',
                insights.padroes.taxa_emojis < 5 ? 'Poucas emocoes' : 'Expressivo!'
              )}
            </View>
          </View>
        )}

        {/* Pontos fortes */}
        {insights?.pontos_fortes && insights.pontos_fortes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💪 Seus Pontos Fortes</Text>
            {insights.pontos_fortes.map((ponto, idx) => (
              <View key={idx} style={styles.pontoForteItem}>
                <Text style={styles.pontoForteIcon}>✅</Text>
                <Text style={styles.pontoForteText}>{ponto}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Areas de melhoria */}
        {insights?.areas_melhoria && insights.areas_melhoria.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Areas de Melhoria</Text>
            {insights.areas_melhoria.map((area, idx) => (
              <View key={idx} style={styles.areaMelhoriaItem}>
                <Text style={styles.areaMelhoriaIcon}>📍</Text>
                <Text style={styles.areaMelhoriaText}>{area}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Insights detalhados */}
        {insights?.insights && insights.insights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔍 Insights Detalhados</Text>
            {insights.insights.map((insight, idx) => renderInsight(insight, idx))}
          </View>
        )}

        {/* Estatisticas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Estatisticas</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValor}>{insights?.padroes?.total_enviadas || 0}</Text>
              <Text style={styles.statLabel}>Enviadas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValor}>{insights?.padroes?.total_recebidas || 0}</Text>
              <Text style={styles.statLabel}>Recebidas</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValor}>{insights?.padroes?.total_perguntas || 0}</Text>
              <Text style={styles.statLabel}>Perguntas</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: '#9C27B0',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  periodoSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  periodoBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  periodoBtnAtivo: {
    backgroundColor: '#9C27B0',
  },
  periodoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  periodoTextAtivo: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dicaCard: {
    flexDirection: 'row',
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: '#F3E5F5',
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  dicaEmoji: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  dicaConteudo: {
    flex: 1,
  },
  dicaTitulo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#7B1FA2',
    marginBottom: spacing.xs,
  },
  dicaTexto: {
    fontSize: fontSize.md,
    color: '#9C27B0',
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  padroesGrid: {
    gap: spacing.sm,
  },
  padraoItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  padraoIcone: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  padraoConteudo: {
    flex: 1,
  },
  padraoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  padraoValor: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  padraoDescricao: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pontoForteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  pontoForteIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  pontoForteText: {
    fontSize: fontSize.md,
    color: '#2E7D32',
    flex: 1,
  },
  areaMelhoriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  areaMelhoriaIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  areaMelhoriaText: {
    fontSize: fontSize.md,
    color: '#E65100',
    flex: 1,
  },
  insightCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  insightTitulo: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  insightDescricao: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  acaoBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  acaoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  acaoText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValor: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#9C27B0',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bottomPadding: {
    height: 100,
  },
});
