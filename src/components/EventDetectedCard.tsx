import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conversasApi, EventoDetectado } from '../services/api';

interface EventDetectedCardProps {
  evento: EventoDetectado;
  onDismiss: () => void;
  onSaved?: () => void;
}

export default function EventDetectedCard({
  evento,
  onDismiss,
  onSaved,
}: EventDetectedCardProps) {
  const [saving, setSaving] = useState(false);

  const handleAgendar = async () => {
    if (!evento.contato_jid) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    try {
      await conversasApi.salvarEvento(evento.contato_jid, evento);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Agendado!', `"${evento.titulo}" foi salvo na sua agenda.`);
      onSaved?.();
      onDismiss();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar o evento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const formatarData = () => {
    if (evento.data_datetime) {
      const data = new Date(evento.data_datetime);
      return data.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return `${evento.data} ${evento.hora}`;
  };

  // Icone baseado no tipo
  const getIcone = () => {
    const icones: Record<string, string> = {
      almoco: '🍽️',
      jantar: '🍽️',
      reuniao: '💼',
      consulta: '🏥',
      festa: '🎉',
      viagem: '✈️',
      esporte: '⚽',
      cinema: '🎬',
      default: '📅',
    };
    return icones[evento.tipo] || icones.default;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icone}>{getIcone()}</Text>
        <Text style={styles.badge}>Evento detectado</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.titulo}>{evento.titulo}</Text>
        <Text style={styles.data}>{formatarData()}</Text>
        {evento.local && (
          <Text style={styles.local}>📍 {evento.local}</Text>
        )}
        {evento.trecho_original && (
          <Text style={styles.trecho}>"{evento.trecho_original}"</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDismiss();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.dismissText}>Ignorar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.agendarBtn}
          onPress={handleAgendar}
          disabled={saving}
          activeOpacity={0.7}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.agendarText}>📅 Agendar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E3F2FD',
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icone: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  badge: {
    fontSize: fontSize.xs,
    color: '#1565C0',
    fontWeight: '600',
    backgroundColor: '#BBDEFB',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  content: {
    marginBottom: spacing.md,
  },
  titulo: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: spacing.xs,
  },
  data: {
    fontSize: fontSize.sm,
    color: '#1976D2',
    marginBottom: spacing.xs,
  },
  local: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  trecho: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  dismissBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  dismissText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  agendarBtn: {
    backgroundColor: '#2196F3',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  agendarText: {
    fontSize: fontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
