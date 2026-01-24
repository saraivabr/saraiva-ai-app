import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { colors, spacing, fontSize } from '../theme/whatsapp';
import { conversasApi, Conversa } from '../services/api';

interface Props {
  navigation: any;
}

export default function ConversasScreen({ navigation }: Props) {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarConversas = useCallback(async () => {
    try {
      const data = await conversasApi.listar();
      setConversas(data);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarConversas();
  }, [carregarConversas]);

  const formatarHora = (dataHora: string | null): string => {
    if (!dataHora) return '';
    const data = new Date(dataHora);
    const hoje = new Date();

    if (data.toDateString() === hoje.toDateString()) {
      return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    if (data.toDateString() === ontem.toDateString()) {
      return 'Ontem';
    }

    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const getUltimaMensagemTexto = (conversa: Conversa): string => {
    if (!conversa.ultima_mensagem) return '';

    const { tipo, texto, direcao } = conversa.ultima_mensagem;
    const prefixo = direcao === 'enviada' ? 'Você: ' : '';

    if (tipo === 'audio') return `${prefixo}🎤 Áudio`;
    if (tipo === 'imagem') return `${prefixo}📷 Foto`;
    if (tipo === 'video') return `${prefixo}🎥 Vídeo`;
    if (tipo === 'documento') return `${prefixo}📄 Documento`;
    if (tipo === 'sticker') return `${prefixo}Sticker`;

    return `${prefixo}${texto || ''}`;
  };

  const renderConversa = ({ item }: { item: Conversa }) => (
    <TouchableOpacity
      style={styles.conversaItem}
      onPress={() => navigation.navigate('Chat', { jid: item.jid, nome: item.nome })}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.nome?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        {item.ia_automatica && (
          <View style={styles.iaIndicator}>
            <Text style={styles.iaIndicatorText}>✨</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.conversaInfo}>
        <View style={styles.conversaHeader}>
          <Text style={styles.nome} numberOfLines={1}>
            {item.nome || item.jid.split('@')[0]}
          </Text>
          <Text style={styles.hora}>
            {formatarHora(item.ultima_mensagem?.data_hora || item.ultima_interacao)}
          </Text>
        </View>
        <Text style={styles.ultimaMensagem} numberOfLines={1}>
          {getUltimaMensagemTexto(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversas}
        keyExtractor={(item) => item.jid}
        renderItem={renderConversa}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
      />
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
  listContent: {
    paddingVertical: spacing.sm,
  },
  conversaItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.textLight,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  iaIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iaIndicatorText: {
    fontSize: 12,
  },
  conversaInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  conversaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nome: {
    fontSize: fontSize.lg,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  hora: {
    fontSize: fontSize.xs,
    color: colors.textTime,
  },
  ultimaMensagem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 82, // avatar width + padding
  },
});
