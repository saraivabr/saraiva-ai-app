import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { conexaoApi } from '../services/api';

interface Props {
  navigation: any;
}

type ConnectionState = 'open' | 'close' | 'connecting' | 'conflict' | 'unknown' | 'error';

export default function ConexaoScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gerando, setGerando] = useState(false);

  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<ConnectionState>('unknown');
  const [message, setMessage] = useState('Verificando...');

  const [telefone, setTelefone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: 'Conexão WhatsApp',
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textLight,
    });
  }, [navigation]);

  const verificarStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const status = await conexaoApi.status();
      setConnected(status.connected);
      setState(status.state);
      setMessage(status.message);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      setState('error');
      setMessage('Erro ao verificar conexão');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    verificarStatus();
  }, [verificarStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    verificarStatus();
  };

  const gerarCodigo = async () => {
    if (!telefone || telefone.length < 10) {
      Alert.alert('Erro', 'Digite um número válido (com DDD)');
      return;
    }

    setGerando(true);
    setPairingCode(null);

    try {
      const result = await conexaoApi.gerarCodigo(telefone);
      if (result.success && result.pairingCode) {
        setPairingCode(result.pairingCode);
      } else {
        Alert.alert('Erro', result.message || 'Não foi possível gerar o código');
      }
    } catch (error: any) {
      console.error('Erro ao gerar código:', error);
      Alert.alert('Erro', error.response?.data?.detail || 'Erro ao gerar código');
    } finally {
      setGerando(false);
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'open':
        return '✅';
      case 'close':
        return '❌';
      case 'connecting':
        return '🔄';
      case 'conflict':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (state) {
      case 'open':
        return '#4CAF50';
      case 'close':
        return '#F44336';
      case 'connecting':
        return '#FF9800';
      case 'conflict':
        return '#FF5722';
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verificando conexão...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
          <Text style={[styles.statusTitle, { color: getStatusColor() }]}>
            {message}
          </Text>
          <Text style={styles.statusSubtitle}>
            {connected
              ? 'Seu WhatsApp está conectado e funcionando'
              : 'Conecte seu WhatsApp para usar o app'}
          </Text>
        </View>

        {/* Seção de Conexão - só mostra se desconectado */}
        {!connected && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conectar com código</Text>
            <Text style={styles.sectionSubtitle}>
              Digite seu número de celular para gerar um código de pareamento
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputPrefix}>+55</Text>
              <TextInput
                style={styles.input}
                placeholder="11999999999"
                placeholderTextColor={colors.textSecondary}
                value={telefone}
                onChangeText={(text) => setTelefone(text.replace(/\D/g, ''))}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, gerando && styles.buttonDisabled]}
              onPress={gerarCodigo}
              disabled={gerando}
            >
              {gerando ? (
                <ActivityIndicator size="small" color={colors.textLight} />
              ) : (
                <Text style={styles.buttonText}>Gerar Código</Text>
              )}
            </TouchableOpacity>

            {/* Código de Pareamento */}
            {pairingCode && (
              <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>Seu código de pareamento:</Text>
                <Text style={styles.codeValue}>{pairingCode}</Text>
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsTitle}>Como usar:</Text>
                  <Text style={styles.instructionsText}>
                    1. Abra o WhatsApp no seu celular{'\n'}
                    2. Vá em Configurações {'>'} Aparelhos conectados{'\n'}
                    3. Toque em "Conectar um aparelho"{'\n'}
                    4. Toque em "Conectar com número de telefone"{'\n'}
                    5. Digite o código acima
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Info quando conectado */}
        {connected && (
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>💡</Text>
              <Text style={styles.infoText}>
                Tudo certo! Você pode usar o app normalmente.
                Puxe para baixo para atualizar o status.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
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
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  statusCard: {
    backgroundColor: colors.primary,
    padding: spacing.xl,
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  statusSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  inputPrefix: {
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  codeCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  instructionsBox: {
    backgroundColor: 'rgba(7, 94, 84, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
  },
  instructionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  instructionsText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});
