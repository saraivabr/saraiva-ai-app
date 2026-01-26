import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { painelApi, DashboardGeral, RelacionamentoScore } from '../services/api';

interface Props {
  navigation: any;
}

const STATUS_CORES = {
  excelente: { bg: '#E8F5E9', text: '#2E7D32', emoji: '🌟' },
  saudavel: { bg: '#E3F2FD', text: '#1565C0', emoji: '👍' },
  precisa_atencao: { bg: '#FFF3E0', text: '#E65100', emoji: '⚠️' },
  esfriando: { bg: '#FFEBEE', text: '#C62828', emoji: '❄️' },
  inativo: { bg: '#ECEFF1', text: '#546E7A', emoji: '💤' },
};

const TENDENCIA_ICONES = {
  melhorando: '📈',
  estavel: '➡️',
  piorando: '📉',
  novo: '✨',
  inativo: '⏸️',
};

export default function RelationshipDashboard({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardGeral | null>(null);

  const carregarDashboard = useCallback(async () => {
    try {
      const data = await painelApi.getDashboard(20);
      setDashboard(data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    carregarDashboard();
  };

  const handleContatoPress = (contato: RelacionamentoScore) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navegar para detalhes do contato
    navigation.navigate('Chat', {
      jid: contato.contato_id.toString(),
      nome: contato.contato_nome,
    });
  };

  const renderScoreGauge = (score: number) => {
    const color = score >= 80 ? '#4CAF50' : score >= 60 ? '#2196F3' : score >= 40 ? '#FF9800' : '#F44336';
    return (
      <View style={styles.gaugeContainer}>
        <View style={[styles.gaugeBackground]}>
          <View style={[styles.gaugeFill, { width: `${score}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.gaugeText, { color }]}>{score}</Text>
      </View>
    );
  };

  const renderContatoCard = (contato: RelacionamentoScore, destacar = false) => {
    const statusCor = STATUS_CORES[contato.status] || STATUS_CORES.inativo;
    const tendenciaIcone = TENDENCIA_ICONES[contato.tendencia] || '➡️';

    return (
      <TouchableOpacity
        key={contato.contato_id}
        style={[styles.contatoCard, destacar && { borderWidth: 2, borderColor: colors.primary }]}
        onPress={() => handleContatoPress(contato)}
        activeOpacity={0.7}
      >
        <View style={styles.contatoHeader}>
          <View style={styles.contatoInfo}>
            <View style={[styles.avatar, { backgroundColor: statusCor.bg }]}>
              <Text style={styles.avatarEmoji}>{statusCor.emoji}</Text>
            </View>
            <View style={styles.contatoTexto}>
              <Text style={styles.contatoNome}>{contato.contato_nome}</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: statusCor.text }]} />
                <Text style={[styles.statusText, { color: statusCor.text }]}>
                  {contato.status.replace('_', ' ')}
                </Text>
                <Text style={styles.tendenciaIcone}>{tendenciaIcone}</Text>
              </View>
            </View>
          </View>
          {renderScoreGauge(contato.score)}
        </View>

        {/* Scores detalhados */}
        <View style={styles.scoresGrid}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Frequencia</Text>
            <Text style={styles.scoreValue}>{contato.scores_detalhados.frequencia}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Balanco</Text>
            <Text style={styles.scoreValue}>{contato.scores_detalhados.balanco}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Recencia</Text>
            <Text style={styles.scoreValue}>{contato.scores_detalhados.recencia}</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreLabel}>Engajamento</Text>
            <Text style={styles.scoreValue}>{contato.scores_detalhados.engajamento}</Text>
          </View>
        </View>

        {/* Sugestoes */}
        {contato.sugestoes && contato.sugestoes.length > 0 && (
          <View style={styles.sugestaoBox}>
            <Text style={styles.sugestaoTitulo}>{contato.sugestoes[0].titulo}</Text>
            <Text style={styles.sugestaoDescricao}>{contato.sugestoes[0].descricao}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando dashboard...</Text>
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
          <Text style={styles.headerTitle}>💚 Saude dos Relacionamentos</Text>
          <Text style={styles.headerSubtitle}>
            {dashboard?.total_contatos || 0} contatos analisados
          </Text>
        </View>

        {/* Score medio */}
        <View style={styles.scoreMediaCard}>
          <Text style={styles.scoreMediaTitulo}>Score Medio</Text>
          <View style={styles.scoreMediaCircle}>
            <Text style={styles.scoreMediaValor}>{dashboard?.score_medio || 0}</Text>
            <Text style={styles.scoreMediaLabel}>pontos</Text>
          </View>
        </View>

        {/* Distribuicao por status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distribuicao</Text>
          <View style={styles.statusGrid}>
            {Object.entries(STATUS_CORES).map(([status, cor]) => {
              const count = dashboard?.por_status?.[status as keyof typeof dashboard.por_status] || 0;
              return (
                <View key={status} style={[styles.statusCard, { backgroundColor: cor.bg }]}>
                  <Text style={styles.statusEmoji}>{cor.emoji}</Text>
                  <Text style={[styles.statusCount, { color: cor.text }]}>{count}</Text>
                  <Text style={[styles.statusLabel, { color: cor.text }]}>
                    {status.replace('_', ' ')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top relacionamentos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Melhores Relacionamentos</Text>
          {dashboard?.top_scores && dashboard.top_scores.length > 0 ? (
            dashboard.top_scores.map((contato) => renderContatoCard(contato))
          ) : (
            <Text style={styles.emptyText}>Nenhum dado disponivel</Text>
          )}
        </View>

        {/* Precisam de atencao */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Precisam de Atencao</Text>
          {dashboard?.precisam_atencao && dashboard.precisam_atencao.length > 0 ? (
            dashboard.precisam_atencao.map((contato) => renderContatoCard(contato, true))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyText}>Todos os relacionamentos estao saudaveis!</Text>
            </View>
          )}
        </View>

        {/* Todas as sugestoes */}
        {dashboard?.todas_sugestoes && dashboard.todas_sugestoes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Sugestoes de Acao</Text>
            {dashboard.todas_sugestoes.slice(0, 5).map((sugestao, idx) => (
              <View key={idx} style={styles.sugestaoItem}>
                <View style={styles.sugestaoIcone}>
                  <Text>
                    {sugestao.tipo === 'frequencia' ? '📅' :
                     sugestao.tipo === 'balanco' ? '⚖️' :
                     sugestao.tipo === 'recencia' ? '⏰' : '💬'}
                  </Text>
                </View>
                <View style={styles.sugestaoConteudo}>
                  <Text style={styles.sugestaoItemTitulo}>{sugestao.titulo}</Text>
                  <Text style={styles.sugestaoItemDescricao}>{sugestao.descricao}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

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
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.primary,
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
  scoreMediaCard: {
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreMediaTitulo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  scoreMediaCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.primary,
  },
  scoreMediaValor: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreMediaLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
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
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusCard: {
    flex: 1,
    minWidth: '30%',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statusEmoji: {
    fontSize: 24,
  },
  statusCount: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  contatoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contatoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contatoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  contatoTexto: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  contatoNome: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
  },
  tendenciaIcone: {
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  gaugeContainer: {
    alignItems: 'center',
  },
  gaugeBackground: {
    width: 60,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  gaugeText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  scoresGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  scoreValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  sugestaoBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#FFF3E0',
    borderRadius: borderRadius.sm,
  },
  sugestaoTitulo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#E65100',
  },
  sugestaoDescricao: {
    fontSize: fontSize.xs,
    color: '#F57C00',
    marginTop: 2,
  },
  emptyBox: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#E8F5E9',
    borderRadius: borderRadius.md,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sugestaoItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  sugestaoIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sugestaoConteudo: {
    flex: 1,
  },
  sugestaoItemTitulo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  sugestaoItemDescricao: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomPadding: {
    height: 100,
  },
});
