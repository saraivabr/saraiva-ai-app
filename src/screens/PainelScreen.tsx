import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography, shadows } from '../design-system/tokens';
import { painelApi } from '../services/api';

interface Nudge {
  contato_id: number;
  contato_nome: string;
  tipo: string;
  titulo: string;
  mensagem: string;
}

interface Resumo {
  mensagens_semana: number;
  contatos_ativos: number;
  contatos_atencao: number;
  nudges: Nudge[];
}

export default function PainelScreen({ navigation }: any) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDados = useCallback(async () => {
    try {
      const dados = await painelApi.getResumo();
      setResumo(dados);
    } catch (error) {
      console.error('Erro ao carregar painel:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const onRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.aiPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header com gradiente */}
      <LinearGradient
        colors={[colors.aiPrimary, colors.aiSecondary]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Seu Painel</Text>
        <Text style={styles.headerSubtitle}>Relationship Intelligence</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cards de metricas */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardPrimary]}>
            <Text style={styles.metricValue}>{resumo?.mensagens_semana || 0}</Text>
            <Text style={styles.metricLabel}>Mensagens esta semana</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{resumo?.contatos_ativos || 0}</Text>
            <Text style={styles.metricLabel}>Contatos ativos</Text>
          </View>
        </View>

        {/* Card de atencao */}
        {(resumo?.contatos_atencao || 0) > 0 && (
          <TouchableOpacity style={styles.alertCard}>
            <Text style={styles.alertIcon}>!</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {resumo?.contatos_atencao} contatos precisam de atencao
              </Text>
              <Text style={styles.alertSubtitle}>
                Voce nao fala com eles ha mais de 14 dias
              </Text>
            </View>
            <Text style={styles.alertArrow}>{'>'}</Text>
          </TouchableOpacity>
        )}

        {/* Nudges */}
        <Text style={styles.sectionTitle}>Hora de reconectar</Text>

        {resumo?.nudges && resumo.nudges.length > 0 ? (
          resumo.nudges.map((nudge, index) => (
            <TouchableOpacity
              key={index}
              style={styles.nudgeCard}
              onPress={() => navigation.navigate('Chat', {
                jid: `${nudge.contato_id}@s.whatsapp.net`,
                nome: nudge.contato_nome
              })}
            >
              <View style={styles.nudgeAvatar}>
                <Text style={styles.nudgeAvatarText}>
                  {nudge.contato_nome?.charAt(0) || '?'}
                </Text>
              </View>
              <View style={styles.nudgeContent}>
                <Text style={styles.nudgeTitle}>{nudge.titulo}</Text>
                <Text style={styles.nudgeMessage}>{nudge.mensagem}</Text>
              </View>
              <TouchableOpacity style={styles.nudgeAction}>
                <Text style={styles.nudgeActionText}>{'...'}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>OK</Text>
            <Text style={styles.emptyText}>
              Tudo em dia! Seus relacionamentos estao saudaveis.
            </Text>
          </View>
        )}

        {/* Link para ranking */}
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate('RelationshipDashboard')}
        >
          <Text style={styles.linkIcon}>*</Text>
          <Text style={styles.linkText}>Ver ranking de relacionamentos</Text>
          <Text style={styles.linkArrow}>{'>'}</Text>
        </TouchableOpacity>

        {/* Link para saude */}
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => navigation.navigate('Saude')}
        >
          <Text style={styles.linkIcon}>#</Text>
          <Text style={styles.linkText}>Saude dos relacionamentos</Text>
          <Text style={styles.linkArrow}>{'>'}</Text>
        </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    ...typography.headingXL,
    color: colors.textLight,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textLight,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  metricCardPrimary: {
    backgroundColor: colors.surfaceMagic,
    borderWidth: 1,
    borderColor: colors.aiPrimary,
  },
  metricValue: {
    ...typography.headingXL,
    color: colors.textPrimary,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: spacing.md,
    color: '#92400E',
    fontWeight: '700',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.headingSM,
    color: '#92400E',
  },
  alertSubtitle: {
    ...typography.caption,
    color: '#B45309',
  },
  alertArrow: {
    ...typography.headingMD,
    color: '#B45309',
  },
  sectionTitle: {
    ...typography.headingMD,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  nudgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  nudgeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.aiPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  nudgeAvatarText: {
    ...typography.headingMD,
    color: colors.textLight,
  },
  nudgeContent: {
    flex: 1,
  },
  nudgeTitle: {
    ...typography.headingSM,
    color: colors.textPrimary,
  },
  nudgeMessage: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nudgeAction: {
    padding: spacing.sm,
  },
  nudgeActionText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    color: colors.secondary,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  linkIcon: {
    fontSize: 24,
    marginRight: spacing.md,
    color: colors.aiPrimary,
  },
  linkText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  linkArrow: {
    ...typography.headingMD,
    color: colors.textSecondary,
  },
});
