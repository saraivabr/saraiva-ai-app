import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';

// WS_URL can be configured via app.json extra or falls back to production
const WS_URL = Constants.expoConfig?.extra?.wsUrl || 'wss://ultron-v2.osc-fr1.scalingo.io/ws';

interface ContactUpdatedData {
  jid: string;
  nome?: string;
  foto_url?: string;
}

interface WebSocketMessage {
  type: string;
  jid?: string;
  mensagem?: any;
  conversa?: any;
  data?: ContactUpdatedData;
  device_id?: string;
  message?: string;
}

export interface WebSocketError {
  code?: number;
  reason?: string;
  message: string;
  timestamp: Date;
}

interface UseWebSocketOptions {
  onNewMessage?: (jid: string, mensagem: any) => void;
  onConversationUpdate?: (jid: string, conversa: any) => void;
  onContactUpdated?: (data: ContactUpdatedData) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: WebSocketError) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [lastError, setLastError] = useState<WebSocketError | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceIdRef = useRef<string>(`app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${WS_URL}/${deviceIdRef.current}`;
    console.log(`[WS] Conectando a ${wsUrl}...`);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] Conectado com sucesso');
        setIsConnected(true);
        setLastError(null);
        setReconnectAttempts(0);
        options.onConnected?.();

        // Inicia heartbeat a cada 30s
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          switch (message.type) {
            case 'new_message':
              if (message.jid && message.mensagem) {
                options.onNewMessage?.(message.jid, message.mensagem);
              }
              break;

            case 'conversation_update':
              if (message.jid && message.conversa) {
                options.onConversationUpdate?.(message.jid, message.conversa);
              }
              break;

            case 'contact_updated':
              if (message.data?.jid) {
                options.onContactUpdated?.(message.data);
              }
              break;

            case 'connected':
              console.log('WebSocket: Confirmação de conexão recebida');
              break;

            case 'pong':
              // Heartbeat response - conexão OK
              break;
          }
        } catch (e) {
          console.error('Erro ao parsear mensagem WebSocket:', e);
        }
      };

      ws.onerror = (event: Event) => {
        const errorInfo: WebSocketError = {
          message: 'Erro na conexao WebSocket',
          timestamp: new Date(),
        };
        console.error('[WS] Erro:', errorInfo);
        setLastError(errorInfo);
        options.onError?.(errorInfo);
      };

      ws.onclose = (event: CloseEvent) => {
        const closeReason = getCloseReason(event.code);
        console.log(`[WS] Desconectado - codigo: ${event.code}, razao: ${closeReason}`);

        setIsConnected(false);

        if (event.code !== 1000) {
          const errorInfo: WebSocketError = {
            code: event.code,
            reason: event.reason || closeReason,
            message: `Conexao fechada: ${closeReason}`,
            timestamp: new Date(),
          };
          setLastError(errorInfo);
          options.onError?.(errorInfo);
        }

        options.onDisconnected?.();

        // Limpa heartbeat
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Tenta reconectar com backoff exponencial (max 30s)
        setReconnectAttempts((prev) => {
          const nextAttempt = prev + 1;
          const delay = Math.min(3000 * Math.pow(1.5, prev), 30000);
          console.log(`[WS] Reconectando em ${Math.round(delay / 1000)}s (tentativa ${nextAttempt})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (AppState.currentState === 'active') {
              connect();
            }
          }, delay);

          return nextAttempt;
        });
      };

      wsRef.current = ws;
    } catch (e) {
      const errorInfo: WebSocketError = {
        message: e instanceof Error ? e.message : 'Falha ao criar conexao',
        timestamp: new Date(),
      };
      console.error('[WS] Erro ao conectar:', errorInfo);
      setLastError(errorInfo);
      options.onError?.(errorInfo);

      // Tenta reconectar após 5 segundos
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [options]);

  // Helper para traduzir codigos de fechamento WS
  const getCloseReason = (code: number): string => {
    const reasons: Record<number, string> = {
      1000: 'Fechamento normal',
      1001: 'Navegando para outra pagina',
      1002: 'Erro de protocolo',
      1003: 'Dados invalidos',
      1006: 'Conexao perdida',
      1007: 'Dados inconsistentes',
      1008: 'Violacao de politica',
      1009: 'Mensagem muito grande',
      1011: 'Erro no servidor',
      1015: 'Falha TLS',
      4001: 'Device ID invalido',
      4003: 'Token de autenticacao invalido',
    };
    return reasons[code] || `Codigo desconhecido (${code})`;
  };

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const watchConversation = useCallback((jid: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'watch', jid }));
    }
  }, []);

  const unwatchConversation = useCallback((jid: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unwatch', jid }));
    }
  }, []);

  // Gerencia conexão baseado no estado do app
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        connect();
      } else if (nextAppState === 'background') {
        // Mantém conexão por um tempo em background, depois desconecta
        setTimeout(() => {
          if (AppState.currentState !== 'active') {
            disconnect();
          }
        }, 30000); // 30 segundos em background antes de desconectar
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Conecta inicialmente
    connect();

    return () => {
      subscription.remove();
      disconnect();
    };
  }, [connect, disconnect]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    isConnected,
    lastMessage,
    lastError,
    reconnectAttempts,
    watchConversation,
    unwatchConversation,
    reconnect: connect,
    clearError,
  };
}

export default useWebSocket;
