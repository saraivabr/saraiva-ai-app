import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../theme/whatsapp';
import { perfilApi } from '../services/api';

interface Props {
  route: any;
  navigation: any;
}

const CATEGORIAS = [
  { id: 'trabalho', label: 'Trabalho', icone: '💼' },
  { id: 'pessoal', label: 'Pessoal', icone: '👤' },
  { id: 'familia', label: 'Família', icone: '👨‍👩‍👧' },
  { id: 'negocios', label: 'Negócios', icone: '💰' },
  { id: 'outro', label: 'Outro', icone: '📁' },
];

const ARQUETIPOS = [
  { id: 'formal', label: 'Formal', desc: 'Sr./Sra., educado' },
  { id: 'casual', label: 'Casual', desc: 'Gírias, relaxado' },
  { id: 'profissional', label: 'Profissional', desc: 'Direto, objetivo' },
  { id: 'intimo', label: 'Íntimo', desc: 'Muito próximo' },
];

const PRIORIDADES = [
  { id: 0, label: 'Normal', cor: colors.textSecondary },
  { id: 1, label: 'Importante', cor: '#FF9800' },
  { id: 2, label: 'VIP', cor: '#FFD700' },
];

export default function PerfilScreen({ route, navigation }: Props) {
  const { jid, nome } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analisando, setAnalisando] = useState(false);

  const [categoria, setCategoria] = useState('pessoal');
  const [arquetipo, setArquetipo] = useState('casual');
  const [prioridade, setPrioridade] = useState(0);
  const [notas, setNotas] = useState('');
  const [perfilResumo, setPerfilResumo] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: nome || 'Perfil',
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.textLight,
    });
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      const perfil = await perfilApi.get(jid);
      setCategoria(perfil.categoria || 'pessoal');
      setArquetipo(perfil.arquetipo || 'casual');
      setPrioridade(perfil.prioridade || 0);
      setNotas(perfil.notas_ia || '');
      setPerfilResumo(perfil.perfil_resumo);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvar = async () => {
    setSaving(true);
    try {
      await perfilApi.atualizar(jid, {
        categoria,
        arquetipo,
        prioridade,
        notas_ia: notas || undefined,
      });
      Alert.alert('Sucesso', 'Perfil atualizado');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar');
    } finally {
      setSaving(false);
    }
  };

  const analisarComIA = async () => {
    setAnalisando(true);
    try {
      const resultado = await perfilApi.analisar(jid);
      if (resultado.perfil) {
        setCategoria(resultado.perfil.categoria || categoria);
        setArquetipo(resultado.perfil.arquetipo || arquetipo);
        setPrioridade(resultado.perfil.prioridade || prioridade);
        setNotas(resultado.perfil.notas_ia || notas);
        setPerfilResumo(resultado.perfil.perfil_resumo);
        Alert.alert('Sucesso', 'Perfil analisado pela IA');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível analisar');
    } finally {
      setAnalisando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Avatar e nome */}
      <View style={styles.header}>
        <View style={[styles.avatar, prioridade === 2 && styles.avatarVip]}>
          <Text style={styles.avatarText}>
            {nome?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.nome}>{nome}</Text>
        {perfilResumo && (
          <Text style={styles.resumo}>{perfilResumo}</Text>
        )}
      </View>

      {/* Botão analisar com IA */}
      <TouchableOpacity
        style={styles.analisarBtn}
        onPress={analisarComIA}
        disabled={analisando}
      >
        {analisando ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Text style={styles.analisarIcone}>🤖</Text>
            <Text style={styles.analisarTexto}>Analisar com IA</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Categoria */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Categoria</Text>
        <View style={styles.opcoes}>
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.opcao,
                categoria === cat.id && styles.opcaoAtiva,
              ]}
              onPress={() => setCategoria(cat.id)}
            >
              <Text style={styles.opcaoIcone}>{cat.icone}</Text>
              <Text style={[
                styles.opcaoLabel,
                categoria === cat.id && styles.opcaoLabelAtiva,
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Arquétipo */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Como falar</Text>
        <View style={styles.opcoes}>
          {ARQUETIPOS.map((arq) => (
            <TouchableOpacity
              key={arq.id}
              style={[
                styles.opcaoLarga,
                arquetipo === arq.id && styles.opcaoAtiva,
              ]}
              onPress={() => setArquetipo(arq.id)}
            >
              <Text style={[
                styles.opcaoLabel,
                arquetipo === arq.id && styles.opcaoLabelAtiva,
              ]}>
                {arq.label}
              </Text>
              <Text style={styles.opcaoDesc}>{arq.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Prioridade */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Prioridade</Text>
        <View style={styles.opcoes}>
          {PRIORIDADES.map((prio) => (
            <TouchableOpacity
              key={prio.id}
              style={[
                styles.opcao,
                prioridade === prio.id && { ...styles.opcaoAtiva, borderColor: prio.cor },
              ]}
              onPress={() => setPrioridade(prio.id)}
            >
              {prio.id === 2 && <Text style={styles.opcaoIcone}>⭐</Text>}
              <Text style={[
                styles.opcaoLabel,
                prioridade === prio.id && { color: prio.cor },
              ]}>
                {prio.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notas para IA */}
      <View style={styles.secao}>
        <Text style={styles.secaoTitulo}>Notas para a IA</Text>
        <Text style={styles.secaoSubtitulo}>
          O que a IA deve lembrar ao responder
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="Ex: Sempre pergunta de preços, não gosta de emoji..."
          placeholderTextColor={colors.textSecondary}
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Botão salvar */}
      <TouchableOpacity
        style={styles.salvarBtn}
        onPress={salvar}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.textLight} />
        ) : (
          <Text style={styles.salvarTexto}>Salvar</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
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
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.primary,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarVip: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  avatarText: {
    color: colors.textLight,
    fontSize: 32,
    fontWeight: '600',
  },
  nome: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textLight,
  },
  resumo: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  analisarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBackground,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  analisarIcone: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  analisarTexto: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
  secao: {
    padding: spacing.lg,
  },
  secaoTitulo: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  secaoSubtitulo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  opcaoLarga: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  opcaoAtiva: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(7, 94, 84, 0.1)',
  },
  opcaoIcone: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  opcaoLabel: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  opcaoLabelAtiva: {
    color: colors.primary,
  },
  opcaoDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  textArea: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  salvarBtn: {
    backgroundColor: colors.secondary,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  salvarTexto: {
    color: colors.textLight,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
