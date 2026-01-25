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
  foto_url: string | null;
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

export interface OpcaoArquetipo {
  tipo: string;
  icone: string;
  nome: string;
  descricao: string;
  mensagens: string[];
}

export interface SugestaoResposta {
  formato: 'arquetipos' | 'simples';
  analise?: string;
  emocao?: string;
  confianca?: number;
  opcoes: OpcaoArquetipo[];
  mensagens: string[];
  texto_unico: string;
}

// Tipos de Agentes de Missão
export interface TipoAgente {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  tecnicas: string[];
  tom: string;
}

export interface AgenteMissao {
  id: number;
  jid: string;
  nome_contato: string;
  foto_url?: string | null;
  tipo: string;
  tipo_info: TipoAgente;
  modo: 'automatico' | 'aprovacao' | 'hibrido';
  foco: string;
  meta?: string | null;
  prazo?: string | null;
  status: 'ativo' | 'pausado' | 'concluido' | 'falhou';
  progresso?: string;
  mensagens_enviadas: number;
  mensagens_aprovadas?: number;
  mensagens_rejeitadas?: number;
  criado_em?: string;
  ultima_acao?: string;
}

export interface SugestaoAgente {
  mensagens: string[];
  analise: string;
  estrategia: string;
  confianca: number;
  progresso?: string;
}

// Tipos para Ações Prioritárias
export interface AcaoPrioritaria {
  tipo: 'aguardando_resposta' | 'agente_ativo' | 'follow_up';
  urgencia: 'alta' | 'media' | 'baixa';
  jid: string;
  nome: string;
  foto_url?: string | null;
  titulo: string;
  subtitulo: string;
  preview: string;
  icone: string;
  cor: string;
  tempo_segundos?: number;
  dias_sem_resposta?: number;
  agente_tipo?: string;
  agente_id?: number;
  prioridade_contato?: number;
}

export interface StatsRapidas {
  mensagens_hoje: number;
  enviadas_hoje: number;
  recebidas_hoje: number;
  agentes_ativos: number;
  contatos_vip: number;
  data: string;
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
// API de Sincronização
export const syncApi = {
  // Sincroniza histórico completo do WhatsApp
  sincronizarHistorico: async (): Promise<{
    status: string;
    stats: {
      chats_processados: number;
      mensagens_novas: number;
    };
  }> => {
    const response = await api.post('/sync', {}, { timeout: 120000 }); // 2 min timeout
    return response.data;
  },

  // Sincroniza fotos de perfil de todos os contatos
  sincronizarContatos: async (): Promise<{
    status: string;
    total_contatos: number;
    atualizados: number;
    erros: number;
  }> => {
    const response = await api.post('/contatos/sincronizar', {}, { timeout: 120000 });
    return response.data;
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

// API de Agentes de Missão
export const agentesApi = {
  // Lista tipos de agentes disponíveis
  listarTipos: async (): Promise<{ tipos: TipoAgente[] }> => {
    const response = await api.get('/agentes/tipos');
    return response.data;
  },

  // Lista agentes ativos
  listarAtivos: async (): Promise<{ agentes: AgenteMissao[]; total: number }> => {
    const response = await api.get('/agentes/ativos');
    return response.data;
  },

  // Busca agente de uma conversa
  get: async (jid: string): Promise<{ agente: AgenteMissao | null }> => {
    const response = await api.get(`/agentes/${encodeURIComponent(jid)}`);
    return response.data;
  },

  // Ativa agente para uma conversa
  ativar: async (dados: {
    jid: string;
    tipo: string;
    modo: 'automatico' | 'aprovacao' | 'hibrido';
    foco: string;
    meta?: string;
    prazo?: string;
  }): Promise<{ status: string; mensagem: string; agente_id: number }> => {
    const response = await api.post('/agentes/ativar', dados);
    return response.data;
  },

  // Atualiza configuração do agente
  atualizar: async (jid: string, dados: {
    modo?: string;
    foco?: string;
    meta?: string;
    prazo?: string;
  }): Promise<void> => {
    await api.put(`/agentes/${encodeURIComponent(jid)}`, dados);
  },

  // Pausa agente
  pausar: async (jid: string): Promise<void> => {
    await api.post(`/agentes/${encodeURIComponent(jid)}/pausar`);
  },

  // Retoma agente pausado
  retomar: async (jid: string): Promise<void> => {
    await api.post(`/agentes/${encodeURIComponent(jid)}/retomar`);
  },

  // Conclui missão
  concluir: async (jid: string, sucesso: boolean = true): Promise<void> => {
    await api.post(`/agentes/${encodeURIComponent(jid)}/concluir`, null, {
      params: { sucesso },
    });
  },

  // Desativa/remove agente
  desativar: async (jid: string): Promise<void> => {
    await api.delete(`/agentes/${encodeURIComponent(jid)}`);
  },

  // Gera resposta do agente
  gerarResposta: async (jid: string, mensagem: string): Promise<{
    agente_tipo: string;
    agente_modo: string;
    foco: string;
    sugestao: SugestaoAgente;
  }> => {
    const response = await api.post(`/agentes/${encodeURIComponent(jid)}/gerar-resposta`, {
      mensagem,
    });
    return response.data;
  },

  // Registra envio de mensagem
  registrarEnvio: async (jid: string, aprovado: boolean): Promise<void> => {
    await api.post(`/agentes/${encodeURIComponent(jid)}/registrar-envio`, {
      aprovado,
    });
  },
};

// API de Ações Prioritárias
export const acoesApi = {
  // Lista ações prioritárias
  listarPrioritarias: async (limit = 5): Promise<{
    acoes: AcaoPrioritaria[];
    total: number;
    resumo: { aguardando_resposta: number; agentes_ativos: number; follow_ups: number };
  }> => {
    const response = await api.get('/acoes/prioritarias', { params: { limit } });
    return response.data;
  },

  // Estatísticas rápidas
  stats: async (): Promise<StatsRapidas> => {
    const response = await api.get('/acoes/stats');
    return response.data;
  },
};

export default api;
