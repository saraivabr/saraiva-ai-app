import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';

// API_BASE_URL can be configured via app.json extra or falls back to production
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://ultron-v2.osc-fr1.scalingo.io/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error.message);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      code: error.code,
    };

    if (error.code === 'ECONNABORTED') {
      console.error('[API] Timeout:', errorInfo);
    } else if (error.code === 'ERR_NETWORK') {
      console.error('[API] Erro de rede - verifique conexao:', errorInfo);
    } else if (error.response) {
      console.error(`[API] Erro ${error.response.status}:`, errorInfo);
    } else {
      console.error('[API] Erro desconhecido:', errorInfo);
    }

    return Promise.reject(error);
  }
);

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

// Feature 7: Smart Priority Queue
export interface Prioridade {
  score: number;
  scores_detalhados: {
    urgencia_conteudo: number;
    importancia_contato: number;
    tempo_esperando: number;
    frequencia_conversa: number;
    horario_comercial: number;
  };
  fatores: {
    urgencia: 'alta' | 'media' | 'baixa';
    importancia: 'vip' | 'alta' | 'normal' | 'baixa';
    tempo_esperando_horas: number;
  };
  motivo: string;
  nivel: 'critico' | 'alto' | 'medio' | 'baixo';
}

export interface ConversaPriorizada {
  jid: string;
  nome: string;
  foto_url: string | null;
  ultima_mensagem: {
    texto: string | null;
    tipo: string;
    data_hora: string | null;
  } | null;
  prioridade: Prioridade;
  categoria: string;
  tags: string[];
}

// Feature 8: Quick Replies
export interface QuickRepliesResponse {
  jid: string;
  replies: string[];
  contexto: string;
  tipo_conversa: string;
}

// Feature 1: Memory Search
export interface MensagemEncontrada {
  id: number;
  contato_nome: string;
  contato_jid: string;
  conteudo: string;
  direcao: 'enviada' | 'recebida';
  data_hora: string | null;
  tipo: string;
}

export interface BuscaSemanticaResponse {
  status: string;
  query: string;
  resposta: string;
  mensagens: MensagemEncontrada[];
  total_encontradas: number;
  confianca: 'alta' | 'media' | 'baixa';
  sugestao_followup: string | null;
}

// Feature 2: Mood Detection & Alerts
export interface MoodAlerta {
  tipo: string;
  severidade: 'importante' | 'atencao' | 'info' | 'positivo';
  titulo: string;
  descricao: string;
  icone: string;
  contato_id?: number;
  contato_nome?: string;
  contato_jid?: string;
  foto_url?: string | null;
}

export interface MoodAnalise {
  contato_nome: string;
  contato_jid: string;
  humor: 'positivo' | 'neutro' | 'negativo' | 'misto';
  score: number;
  confianca: 'alta' | 'media' | 'baixa';
  metricas: {
    total_mensagens: number;
    mensagens_recebidas: number;
    mensagens_enviadas: number;
    tamanho_medio_msg: number;
    tempo_resposta_segundos: number;
  };
  alertas: MoodAlerta[];
  sugestoes: string[];
}

// Feature 4: Auto-Scheduler
export interface EventoDetectado {
  titulo: string;
  data: string;
  hora: string;
  local?: string;
  tipo: string;
  participantes?: string[];
  confianca: 'alta' | 'media' | 'baixa';
  trecho_original?: string;
  data_datetime?: string;
  contato_nome?: string;
  contato_jid?: string;
}

export interface Compromisso {
  id: number;
  titulo: string;
  descricao?: string;
  data_hora: string;
  local?: string;
  tipo: string;
  contato_nome: string;
  contato_jid: string;
  foto_url?: string | null;
}

// Feature 9: Milestones & Reminders
export interface Milestone {
  tipo: 'aniversario' | 'data_especial' | 'recorrente' | 'lembrete';
  titulo: string;
  data?: string;
  recorrencia?: 'semanal' | 'mensal' | 'anual';
  dia_semana?: string;
  descricao: string;
  importancia: 'alta' | 'media' | 'baixa';
}

// Feature 3: Smart Compose
export interface ComposicaoMensagem {
  mensagem: string;
  alternativas: Array<{
    texto: string;
    tom: string;
  }>;
  estrategia: string;
  dica: string;
  objetivo: string;
  tom: string;
  contato_nome: string;
  error?: string;
}

// Feature 5: Relationship Dashboard
export interface ScoreDetalhado {
  frequencia: number;
  balanco: number;
  recencia: number;
  engajamento: number;
}

export interface SugestaoRelacionamento {
  tipo: string;
  titulo: string;
  descricao: string;
  acao: string;
}

export interface RelacionamentoScore {
  contato_id: number;
  contato_nome: string;
  score: number;
  scores_detalhados: ScoreDetalhado;
  status: 'excelente' | 'saudavel' | 'precisa_atencao' | 'esfriando' | 'inativo';
  tendencia: 'melhorando' | 'estavel' | 'piorando' | 'novo' | 'inativo';
  sugestoes: SugestaoRelacionamento[];
  ultima_interacao: string | null;
  total_mensagens_mes: number;
}

export interface DashboardGeral {
  score_medio: number;
  total_contatos: number;
  por_status: {
    excelentes: number;
    saudaveis: number;
    precisa_atencao: number;
    esfriando: number;
    inativos: number;
  };
  top_scores: RelacionamentoScore[];
  precisam_atencao: RelacionamentoScore[];
  todas_sugestoes: SugestaoRelacionamento[];
}

// Feature 6: Voice Actions
export interface VoiceActionResult {
  status: string;
  acao?: string;
  mensagem?: string;
  analise?: {
    intencao: string;
    contato?: string;
    confianca: 'alta' | 'media' | 'baixa';
  };
  contato_jid?: string;
  contato_nome?: string;
  mensagem_sugerida?: string;
  confirmacao?: string;
  periodo?: string;
  total_mensagens?: number;
  resumo?: string;
}

// Feature 10: Communication Coach
export interface InsightCoach {
  titulo: string;
  descricao: string;
  tipo: 'positivo' | 'neutro' | 'melhoria';
  acao_sugerida: string;
}

export interface PadroesCoach {
  tamanho_medio_enviadas: number;
  tamanho_medio_recebidas: number;
  taxa_perguntas: number;
  taxa_emojis: number;
  tempo_resposta_medio_segundos: number;
  tempo_resposta_medio_minutos: number;
  hora_pico: number;
  balanco_conversacional: number;
  total_enviadas: number;
  total_recebidas: number;
  total_perguntas: number;
}

export interface CoachInsights {
  status: string;
  periodo_dias?: number;
  total_mensagens?: number;
  padroes?: PadroesCoach;
  insights?: InsightCoach[];
  pontos_fortes?: string[];
  areas_melhoria?: string[];
  dica_do_dia?: string;
  mensagem?: string;
}

export interface LembreteItem {
  id: number;
  titulo: string;
  descricao?: string;
  tipo: string;
  data_lembrete: string;
  dias_ate: number;
  recorrencia?: string;
  contato_nome: string;
  contato_jid: string;
  foto_url?: string | null;
  sugestao: string;
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

  // Feature 7: Smart Priority Queue
  listarPriorizadas: async (limit = 10): Promise<{
    total: number;
    fila: ConversaPriorizada[];
    por_nivel: {
      critico: ConversaPriorizada[];
      alto: ConversaPriorizada[];
      medio: ConversaPriorizada[];
      baixo: ConversaPriorizada[];
    };
    resumo: { critico: number; alto: number; medio: number; baixo: number };
  }> => {
    const response = await api.get('/conversas/prioridade', { params: { limit } });
    return response.data;
  },

  // Feature 8: Quick Replies
  quickReplies: async (jid: string, quantidade = 4): Promise<QuickRepliesResponse> => {
    const response = await api.get(`/conversas/${encodeURIComponent(jid)}/quick-replies`, {
      params: { quantidade },
    });
    return response.data;
  },

  quickReplyCustomizada: async (jid: string, tom: string): Promise<{ resposta: string }> => {
    const response = await api.post(`/conversas/${encodeURIComponent(jid)}/quick-replies/customizada`, null, {
      params: { tom },
    });
    return response.data;
  },

  // Feature 4: Auto-Scheduler
  extrairEventos: async (jid: string): Promise<{
    jid: string;
    eventos: EventoDetectado[];
    total: number;
  }> => {
    const response = await api.get(`/conversas/${encodeURIComponent(jid)}/eventos`);
    return response.data;
  },

  salvarEvento: async (jid: string, evento: EventoDetectado): Promise<{ compromisso_id: number }> => {
    const response = await api.post(`/conversas/${encodeURIComponent(jid)}/eventos/salvar`, evento);
    return response.data;
  },

  // Feature 9: Milestones
  detectarMilestones: async (jid: string, diasHistorico = 90): Promise<{
    jid: string;
    milestones: Milestone[];
    total: number;
  }> => {
    const response = await api.get(`/conversas/${encodeURIComponent(jid)}/milestones`, {
      params: { dias_historico: diasHistorico },
    });
    return response.data;
  },
};

// Feature 4 & 9: Compromissos e Lembretes API
export const agendaApi = {
  // Compromissos pendentes
  listarCompromissos: async (dias = 7): Promise<{
    compromissos: Compromisso[];
    total: number;
  }> => {
    const response = await api.get('/compromissos/pendentes', { params: { dias } });
    return response.data;
  },

  // Lembretes proximos
  listarLembretes: async (dias = 7): Promise<{
    lembretes: LembreteItem[];
    total: number;
    por_urgencia: {
      hoje: LembreteItem[];
      amanha: LembreteItem[];
      semana: LembreteItem[];
    };
    resumo: { hoje: number; amanha: number; semana: number };
  }> => {
    const response = await api.get('/lembretes/proximos', { params: { dias } });
    return response.data;
  },

  // Marcar lembrete como notificado
  marcarNotificado: async (lembreteId: number): Promise<void> => {
    await api.post(`/lembretes/${lembreteId}/notificado`);
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

  // Sincroniza nomes e fotos de todos os contatos
  sincronizarContatos: async (): Promise<{
    status: string;
    total_contatos: number;
    nomes_atualizados: number;
    fotos_atualizadas: number;
    mapa_nomes_total: number;
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

// API de Conexão WhatsApp
export const conexaoApi = {
  // Verifica status da conexão
  status: async (): Promise<{
    connected: boolean;
    state: 'open' | 'close' | 'connecting' | 'conflict' | 'unknown' | 'error';
    message: string;
    instance?: string;
    checked_at?: string;
  }> => {
    const response = await api.get('/admin/conexao/status');
    return response.data;
  },

  // Gera código de pareamento
  gerarCodigo: async (phone: string): Promise<{
    success: boolean;
    pairingCode?: string;
    message: string;
    error?: string;
  }> => {
    const response = await api.post('/admin/conexao/pairing-code', null, {
      params: { phone },
    });
    return response.data;
  },
};

// API do Painel (Relationship Intelligence)
export const painelApi = {
  getResumo: async () => {
    const response = await api.get('/painel/resumo');
    return response.data;
  },
  getRanking: async (limit = 10) => {
    const response = await api.get(`/painel/contatos/ranking?limit=${limit}`);
    return response.data;
  },
  getPerfilContato: async (contatoId: number) => {
    const response = await api.get(`/painel/contato/${contatoId}/perfil`);
    return response.data;
  },
  getSugestao: async (contatoId: number) => {
    const response = await api.get(`/painel/contato/${contatoId}/sugestao`);
    return response.data;
  },
  getNudges: async () => {
    const response = await api.get('/painel/nudges');
    return response.data;
  },
  getSaude: async () => {
    const response = await api.get('/painel/saude');
    return response.data;
  },

  // Feature 5: Relationship Dashboard
  getDashboard: async (limit = 20): Promise<DashboardGeral> => {
    const response = await api.get('/painel/dashboard', { params: { limit } });
    return response.data;
  },
  getDashboardContato: async (contatoId: number): Promise<RelacionamentoScore> => {
    const response = await api.get(`/painel/dashboard/contato/${contatoId}`);
    return response.data;
  },

  // Feature 3: Smart Compose
  compor: async (
    jid: string,
    objetivo: string,
    tom = 'natural',
    contextoExtra?: string
  ): Promise<ComposicaoMensagem> => {
    const response = await api.post('/painel/compor', null, {
      params: { jid, objetivo, tom, contexto_extra: contextoExtra },
    });
    return response.data;
  },
  sugerirContinuacao: async (jid: string, textoAtual: string): Promise<{ sugestoes: string[] }> => {
    const response = await api.post('/painel/compor/continuacao', null, {
      params: { jid, texto_atual: textoAtual },
    });
    return response.data;
  },

  // Feature 6: Voice Actions
  processarVoz: async (texto: string): Promise<VoiceActionResult> => {
    const response = await api.post('/painel/voz/comando', null, {
      params: { texto },
    });
    return response.data;
  },

  // Feature 10: Communication Coach
  getCoachInsights: async (dias = 30): Promise<CoachInsights> => {
    const response = await api.get('/painel/coach/insights', { params: { dias } });
    return response.data;
  },
  getCoachConversa: async (jid: string, dias = 30): Promise<CoachInsights & { contato_nome?: string }> => {
    const response = await api.get(`/painel/coach/conversa/${encodeURIComponent(jid)}`, {
      params: { dias },
    });
    return response.data;
  },
};

// Feature 1: Memory Search API
export const buscaApi = {
  // Busca semantica em todo historico
  semantica: async (
    query: string,
    options?: { contato_jid?: string; dias?: number; limit?: number }
  ): Promise<BuscaSemanticaResponse> => {
    const response = await api.post('/busca/semantica', {
      query,
      contato_jid: options?.contato_jid,
      dias: options?.dias || 30,
      limit: options?.limit || 10,
    });
    return response.data;
  },

  // Busca sobre topico especifico de um contato
  sobreContato: async (jid: string, topico: string): Promise<BuscaSemanticaResponse> => {
    const response = await api.get(`/busca/contato/${encodeURIComponent(jid)}/sobre/${encodeURIComponent(topico)}`);
    return response.data;
  },

  // Timeline de eventos com um contato
  timelineContato: async (jid: string, dias = 30): Promise<{
    eventos: Array<{ data: string; titulo: string; descricao: string }>;
    resumo: string;
    tendencia: string;
  }> => {
    const response = await api.get(`/busca/contato/${encodeURIComponent(jid)}/timeline`, {
      params: { dias },
    });
    return response.data;
  },

  // Sugestoes de busca
  sugestoes: async (): Promise<{
    sugestoes: Array<{ query: string; icone: string; categoria: string }>;
  }> => {
    const response = await api.get('/busca/recentes');
    return response.data;
  },
};

// Feature 2: Mood Detection & Alerts API
export const alertasApi = {
  // Analisa humor de um contato
  analisarHumor: async (jid: string, dias = 7): Promise<MoodAnalise> => {
    const response = await api.get(`/alertas/humor/${encodeURIComponent(jid)}`, {
      params: { dias },
    });
    return response.data;
  },

  // Lista alertas ativos
  listarAtivos: async (limit = 10): Promise<{
    total: number;
    alertas: MoodAlerta[];
    por_severidade: {
      importante: MoodAlerta[];
      atencao: MoodAlerta[];
      info: MoodAlerta[];
      positivo: MoodAlerta[];
    };
    resumo: { importantes: number; atencao: number; info: number; positivos: number };
  }> => {
    const response = await api.get('/alertas/ativos', { params: { limit } });
    return response.data;
  },

  // Resumo geral dos relacionamentos
  resumo: async (): Promise<{
    status: string;
    total_analisados: number;
    positivos: number;
    neutros: number;
    preocupantes: number;
    score_geral: number;
  }> => {
    const response = await api.get('/alertas/resumo');
    return response.data;
  },

  // Forca nova analise
  forcarAnalise: async (jid: string, dias = 7): Promise<MoodAnalise> => {
    const response = await api.post(`/alertas/contato/${encodeURIComponent(jid)}/analisar`, null, {
      params: { dias },
    });
    return response.data;
  },
};

export default api;
