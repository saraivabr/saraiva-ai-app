import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversa, Mensagem } from './api';

const CACHE_PREFIX = 'saraiva-ai-app';
const MAX_CACHED_MESSAGES = 200;

type CachedPayload<T> = {
  savedAt: string;
  data: T;
};

const buildKey = (key: string) => `${CACHE_PREFIX}:${key}`;

const readJson = async <T,>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(buildKey(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = async <T,>(key: string, value: T): Promise<void> => {
  await AsyncStorage.setItem(buildKey(key), JSON.stringify(value));
};

export const loadCachedConversations = async (filtro: string) => {
  return readJson<CachedPayload<Conversa[]>>(`conversas:${filtro}`);
};

export const saveCachedConversations = async (filtro: string, conversas: Conversa[]) => {
  const payload: CachedPayload<Conversa[]> = {
    savedAt: new Date().toISOString(),
    data: conversas,
  };
  await writeJson(`conversas:${filtro}`, payload);
};

export type CachedMensagens = {
  mensagens: Mensagem[];
  total: number;
};

export const loadCachedMensagens = async (jid: string) => {
  return readJson<CachedPayload<CachedMensagens>>(`chat:${jid}`);
};

export const saveCachedMensagens = async (jid: string, mensagens: Mensagem[], total: number) => {
  const payload: CachedPayload<CachedMensagens> = {
    savedAt: new Date().toISOString(),
    data: {
      mensagens: mensagens.slice(-MAX_CACHED_MESSAGES),
      total,
    },
  };
  await writeJson(`chat:${jid}`, payload);
};

export type CachedPerfil = {
  jid: string;
  nome: string;
  categoria: string;
  arquetipo: string;
  nivel_conexao: string;
  prioridade: number;
  tags: string[];
  perfil_resumo: string | null;
  notas_ia: string | null;
};

export const loadCachedPerfil = async (jid: string) => {
  return readJson<CachedPayload<CachedPerfil>>(`perfil:${jid}`);
};

export const saveCachedPerfil = async (jid: string, perfil: CachedPerfil) => {
  const payload: CachedPayload<CachedPerfil> = {
    savedAt: new Date().toISOString(),
    data: perfil,
  };
  await writeJson(`perfil:${jid}`, payload);
};
