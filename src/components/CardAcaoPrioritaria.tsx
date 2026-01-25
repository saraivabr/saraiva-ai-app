import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { AcaoPrioritaria } from '../services/api';

interface Props {
  acao: AcaoPrioritaria;
  onPress: () => void;
  onDismiss?: () => void;
}

export default function CardAcaoPrioritaria({ acao, onPress, onDismiss }: Props) {
  const getUrgenciaStyle = () => {
    switch (acao.urgencia) {
      case 'alta':
        return { backgroundColor: '#FFEBEE', borderColor: '#FF5252' };
      case 'media':
        return { backgroundColor: '#FFF8E1', borderColor: '#FFB300' };
      default:
        return { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' };
    }
  };

  const urgenciaStyle = getUrgenciaStyle();

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: urgenciaStyle.backgroundColor, borderLeftColor: urgenciaStyle.borderColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {/* Avatar ou Icone */}
        <View style={styles.avatarContainer}>
          {acao.foto_url ? (
            <Image source={{ uri: acao.foto_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: acao.cor }]}>
              <Text style={styles.avatarIcone}>{acao.icone}</Text>
            </View>
          )}
          {/* Badge de urgência */}
          <View style={[styles.urgenciaBadge, { backgroundColor: acao.cor }]}>
            <Text style={styles.urgenciaTexto}>
              {acao.urgencia === 'alta' ? '!' : acao.urgencia === 'media' ? '•' : ''}
            </Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.titulo} numberOfLines={1}>{acao.titulo}</Text>
          <Text style={styles.subtitulo} numberOfLines={1}>{acao.subtitulo}</Text>
          <Text style={styles.preview} numberOfLines={1}>{acao.preview}</Text>
        </View>

        {/* Ação */}
        <View style={styles.acaoContainer}>
          <View style={[styles.acaoBotao, { backgroundColor: acao.cor }]}>
            <Text style={styles.acaoTexto}>
              {acao.tipo === 'aguardando_resposta' ? 'Responder' :
               acao.tipo === 'agente_ativo' ? 'Ver' : 'Retomar'}
            </Text>
          </View>
        </View>
      </View>

      {/* Dismiss button */}
      {onDismiss && (
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissTexto}>✕</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.divider,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcone: {
    fontSize: 22,
  },
  urgenciaBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  urgenciaTexto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titulo: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subtitulo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  preview: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  acaoContainer: {
    marginLeft: spacing.sm,
  },
  acaoBotao: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  acaoTexto: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  dismissBtn: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissTexto: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
