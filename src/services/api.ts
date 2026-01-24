import axios from 'axios';

const API_BASE_URL = 'https://ultron-v2.osc-fr1.scalingo.io/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Conversa {
  jid: string;
  nome: string;
  tipo: 'privado' | 'grupo';
  ultima_mensagem: {
    texto: string | null;
    tipo: string;
    data_hora: string | null;
    direcao: 'enviada' | 'recebida';
  } | null;
  total_mensagens: number;
  ia_automatica: boolean;
  ultima_interacao: string | null;
  // Campos de perfil
  categoria: string;
  arquetipo: string;
  nivel_conexao: string;
  prioridade: number;
  tags: string[];
  perfil_resumo: string | null;
}

export interface Mensagem {
  id: number;
  message_id: string;
  tipo: string;
  conteudo: string | null;
  direcao: 'enviada' | 'recebida';
  duracao_audio: number | null;
  data_hora: string | null;
  enviada_por_ia: boolean;
}

export interface Tarefa {
  id: number;
  descricao: string;
  contato: string;
  criada_em: string | null;
}

export interface SugestaoResposta {
  mensagens: string[];
  texto_unico: string;
}

// API Functions
export const conversasApi = {
  // Lista todas as conversas (pode filtrar por categoria/prioridade)
  listar: async (params?: { categoria?: string; prioridade?: number }): Promise<Conversa[]> => {
    const response = await api.get('/conversas', { params });
    return response.data.conversas;
  },

  // Lista mensagens de uma conversa
  mensagens: async (jid: string, limit = 50, offset = 0): Promise<{
    contato: { jid: string; nome: string; tipo: string };
    mensagens: Mensagem[];
    total: number;
  }> => {
    const response = await api.get(`/conversas/${encodeURIComponent(jid)}/mensagens`, {
      params: { limit, offset },
    });
    return response.data;
  },

  // Envia mensagem manual
  enviar: async (jid: string, texto: string): Promise<void> => {
    await api.post(`/conversas/${encodeURIComponent(jid)}/enviar`, { texto });
  },

  // Solicita sugestão da IA (retorna múltiplas mensagens humanizadas)
  sugerir: async (jid: string, contexto?: string): Promise<SugestaoResposta> => {
    const response = await api.post(`/conversas/${encodeURIComponent(jid)}/sugerir`, {
      contexto,
    });
    return response.data.sugestao;
  },

  // Toggle piloto automático
  toggleAuto: async (jid: string, ativo: boolean): Promise<void> => {
    await api.post(`/conversas/${encodeURIComponent(jid)}/auto`, { ativo });
  },
};

export const iaApi = {
  // Chat com assistente
  chat: async (pergunta: string): Promise<string> => {
    const response = await api.post('/ia/chat', { pergunta });
    return response.data.resposta;
  },

  // Resumo do dia
  resumoDia: async (): Promise<{
    data: string;
    total_interacoes: number;
    total_mensagens: number;
    mensagens_recebidas: number;
    mensagens_enviadas: number;
    audios_transcritos: number;
    tarefas_extraidas: number;
    resumo_ia: string | null;
  }> => {
    const response = await api.get('/ia/resumo-dia');
    return response.data;
  },

  // Lista tarefas
  tarefas: async (): Promise<Tarefa[]> => {
    const response = await api.get('/ia/tarefas');
    return response.data.tarefas;
  },
};

// API de Perfil de Contatos
export const perfilApi = {
  // Busca perfil de um contato
  get: async (jid: string): Promise<{
    jid: string;
    nome: string;
    categoria: string;
    arquetipo: string;
    nivel_conexao: string;
    prioridade: number;
    tags: string[];
    perfil_resumo: string | null;
    notas_ia: string | null;
  }> => {
    const response = await api.get(`/contatos/${encodeURIComponent(jid)}/perfil`);
    return response.data;
  },

  // Atualiza perfil de um contato
  atualizar: async (jid: string, dados: {
    categoria?: string;
    arquetipo?: string;
    nivel_conexao?: string;
    prioridade?: number;
    tags?: string[];
    notas_ia?: string;
  }): Promise<void> => {
    await api.put(`/contatos/${encodeURIComponent(jid)}/perfil`, dados);
  },

  // Analisa perfil automaticamente com IA
  analisar: async (jid: string): Promise<any> => {
    const response = await api.post(`/contatos/${encodeURIComponent(jid)}/analisar`);
    return response.data;
  },

  // Analisa todos os contatos
  analisarTodos: async (): Promise<{ analisados: number; erros: number }> => {
    const response = await api.post('/contatos/analisar-todos');
    return response.data.resultado;
  },
};

export default api;
