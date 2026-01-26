import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { alertasApi, MoodAlerta } from '../services/api';

interface MoodAlertProps {
  onPressAlerta: (jid: string, nome: string) => void;
  visible: boolean;
}

// Cores por severidade
const CORES_SEVERIDADE = {
  importante: { bg: '#FFEBEE', border: '#F44336', text: '#C62828' },
  atencao: { bg: '#FFF3E0', border: '#FF9800', text: '#E65100' },
  info: { bg: '#E3F2FD', border: '#2196F3', text: '#1565C0' },
  positivo: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32' },
};

export default function MoodAlertBanner({
  onPressAlerta,
  visible,
}: MoodAlertProps) {
  const [loading, setLoading] = useState(false);
  const [alertas, setAlertas] = useState<MoodAlerta[]>([]);
  const [expanded, setExpanded] = useState(false);

  const carregarAlertas = useCallback(async () => {
    if (!visible) return;

    setLoading(true);

    try {
      const data = await alertasApi.listarAtivos(5);
      // Filtra apenas alertas importantes e de atencao
      const urgentes = data.alertas.filter(
        a => a.severidade === 'importante' || a.severidade === 'atencao'
      );
      setAlertas(urgentes.slice(0, 3));
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      carregarAlertas();
    }
  }, [visible, carregarAlertas]);

  if (!visible || alertas.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  const renderAlerta = (alerta: MoodAlerta, index: number) => {
    const cor = CORES_SEVERIDADE[alerta.severidade] || CORES_SEVERIDADE.info;

    return (
      <TouchableOpacity
        key={index}
        style={[styles.alertaItem, { backgroundColor: cor.bg, borderLeftColor: cor.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (alerta.contato_jid && alerta.contato_nome) {
            onPressAlerta(alerta.contato_jid, alerta.contato_nome);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.alertaContent}>
          {/* Icone ou Avatar */}
          <View style={styles.iconContainer}>
            {alerta.foto_url ? (
              <Image source={{ uri: alerta.foto_url }} style={styles.avatarSmall} />
            ) : (
              <Text style={styles.alertaIcone}>{alerta.icone}</Text>
            )}
          </View>

          {/* Texto */}
          <View style={styles.textoContainer}>
            <Text style={[styles.alertaTitulo, { color: cor.text }]} numberOfLines={1}>
              {alerta.titulo}
            </Text>
            <Text style={styles.alertaDescricao} numberOfLines={1}>
              {alerta.descricao}
            </Text>
          </View>

          {/* Seta */}
          <Text style={[styles.seta, { color: cor.border }]}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header colapsavel */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcone}>🔔</Text>
          <Text style={styles.headerTitulo}>
            {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} de relacionamento
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.chevron}>{expanded ? '▼' : '▶'}</Text>
        )}
      </TouchableOpacity>

      {/* Lista de alertas */}
      {expanded && !loading && (
        <View style={styles.alertasContainer}>
          {alertas.map((alerta, index) => renderAlerta(alerta, index))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFE0B2',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcone: {
    fontSize: 18,
  },
  headerTitulo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#E65100',
  },
  chevron: {
    fontSize: fontSize.sm,
    color: '#E65100',
  },
  alertasContainer: {
    paddingVertical: spacing.xs,
  },
  alertaItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderLeftWidth: 3,
    marginBottom: 1,
  },
  alertaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  alertaIcone: {
    fontSize: 20,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
  },
  textoContainer: {
    flex: 1,
  },
  alertaTitulo: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  alertaDescricao: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  seta: {
    fontSize: 24,
    fontWeight: '300',
    marginLeft: spacing.sm,
  },
});
