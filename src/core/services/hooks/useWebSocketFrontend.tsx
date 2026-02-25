import { useEffect, useRef, useState, useCallback } from 'react';

export interface CommandMessage {
  action: 'start' | 'pause' | 'stop';
  type: 'static' | 'dynamic';
  totalTime: string;
  frequencyHZ: number;
  amplitudeMV: number;
}

export interface ESP32Data {
  gyroscope: any;
  accelerometer: any;
  weightDistributionLF: any;
  weightDistributionRF: any;
  weightDistributionLB: any;
  weightDistributionRB: any;
  symmetryIndexLF: any;
  symmetryIndexRF: any;
  symmetryIndexLB: any;
  symmetryIndexRB: any;
  verticalForce: any;
  verticalImpulse: string;
}

type WebSocketMode = 'verification' | 'monitoring';

interface UseWebSocketFrontendOptions {
  mode?: WebSocketMode;
  onDataReceived?: (data: ESP32Data) => void;
  onCommandSent?: (command: CommandMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export function useWebSocketFrontend(options: UseWebSocketFrontendOptions = {}) {
  const {
    mode = 'monitoring',
    onDataReceived,
    onCommandSent,
    onConnectionChange,
    onError,
    autoConnect = true
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastData, setLastData] = useState<ESP32Data | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const hasSentStartRef = useRef(false);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendCommand = useCallback((command: CommandMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('🎮 Sending command to ESP32:', command);
      wsRef.current.send(JSON.stringify(command));
      onCommandSent?.(command);
      
      if (command.action === 'start') {
        hasSentStartRef.current = true;
      }
    } else {
      console.error('WebSocket is not connected');
    }
  }, [onCommandSent]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = 'ws://localhost:8081/ws/frontend';
      console.log('🔌 Conectando a WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        
        console.log('✅ Conectado al WebSocket');
        setIsConnected(true);
        onConnectionChange?.(true);
        
        // Modo verification: enviar start UNA SOLA VEZ
        if (mode === 'verification' && !hasSentStartRef.current) {
          console.log('🎯 Modo verificación: enviando start');
          sendCommand({
            action: 'start',
            type: 'static',
            totalTime: '30',
            frequencyHZ: 100,
            amplitudeMV: 10
          });
        }
        
        // Modo monitoring: enviar stop para asegurar estado inicial
        if (mode === 'monitoring') {
          console.log('⏹️ Modo monitoreo: enviando stop inicial');
          sendCommand({
            action: 'stop',
            type: 'static',
            totalTime: '30',
            frequencyHZ: 100,
            amplitudeMV: 10
          });
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data: ESP32Data = JSON.parse(event.data);
          console.log('📊 Dato recibido del ESP32');
          setLastData(data);
          onDataReceived?.(data);
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        
        console.log('🔌 WebSocket desconectado - Código:', event.code, 'Razón:', event.reason);
        setIsConnected(false);
        onConnectionChange?.(false);
        
        // NO RECONECTAR AUTOMÁTICAMENTE - Solo registrar
        if (event.code !== 1000) {
          console.log('Cierre inesperado, pero no se reconectará automáticamente');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [onConnectionChange, onDataReceived, onError, mode, sendCommand]);

  // Efecto de montaje/desmontaje
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  // Efecto de conexión automática (UNA SOLA VEZ)
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    // No hay cleanup que intente reconectar
  }, [autoConnect, connect]);

  return {
    isConnected,
    lastData,
    sendCommand,
    connect,
    disconnect
  };
}

export function useParsedESP32Data(data: ESP32Data | null) {
  const parseJSON = useCallback(<T,>(jsonData: any): T | null => {
    if (!jsonData) return null;
    try {
      return typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return null;
    }
  }, []);

  if (!data) return null;

  return {
    gyroscope: parseJSON<{x: number; y: number; z: number}>(data.gyroscope),
    accelerometer: parseJSON<{x: number; y: number; z: number}>(data.accelerometer),
    
    weightDistributionLF: parseJSON<{value?: number; percentage?: number}>(data.weightDistributionLF),
    weightDistributionRF: parseJSON<{value?: number; percentage?: number}>(data.weightDistributionRF),
    weightDistributionLB: parseJSON<{value?: number; percentage?: number}>(data.weightDistributionLB),
    weightDistributionRB: parseJSON<{value?: number; percentage?: number}>(data.weightDistributionRB),
    
    symmetryIndexLF: parseJSON<{value?: number; unit?: string}>(data.symmetryIndexLF),
    symmetryIndexRF: parseJSON<{value?: number; unit?: string}>(data.symmetryIndexRF),
    symmetryIndexLB: parseJSON<{value?: number; unit?: string}>(data.symmetryIndexLB),
    symmetryIndexRB: parseJSON<{value?: number; unit?: string}>(data.symmetryIndexRB),
    
    verticalForce: parseJSON<{value?: number; unit?: string}>(data.verticalForce),
    verticalImpulse: data.verticalImpulse
  };
}