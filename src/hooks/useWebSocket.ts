import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const WS_URL = 'wss://ultron-v2.osc-fr1.scalingo.io/ws';

interface WebSocketMessage {
  type: string;
  jid?: string;
  mensagem?: any;
  conversa?: any;
  device_id?: string;
  message?: string;
}

interface UseWebSocketOptions {
  onNewMessage?: (jid: string, mensagem: any) => void;
  onConversationUpdate?: (jid: string, conversa: any) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deviceIdRef = useRef<string>(`app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(`${WS_URL}/${deviceIdRef.current}`);

      ws.onopen = () => {
        console.log('WebSocket conectado');
        setIsConnected(true);
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

      ws.onerror = (error) => {
        console.error('WebSocket erro:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        setIsConnected(false);
        options.onDisconnected?.();

        // Limpa heartbeat
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Tenta reconectar após 3 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          if (AppState.currentState === 'active') {
            connect();
          }
        }, 3000);
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('Erro ao conectar WebSocket:', e);
      // Tenta reconectar após 5 segundos
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [options]);

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

  return {
    isConnected,
    lastMessage,
    watchConversation,
    unwatchConversation,
    reconnect: connect,
  };
}

export default useWebSocket;
