import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { ESP32Data } from '../hooks/useWebSocketFrontend';
import { useWebSocketFrontend } from '../hooks/useWebSocketFrontend';
import type { CommandMessage } from '../hooks/useWebSocketFrontend';

interface WebSocketContextType {
  isConnected: boolean;
  lastData: ESP32Data | null;
  sendCommand: (command: CommandMessage) => void;
  connect: () => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  mode?: 'verification' | 'monitoring';
}

export function WebSocketProvider({ children, mode = 'monitoring' }: WebSocketProviderProps) {
  const { isConnected, lastData, sendCommand, connect, disconnect } = useWebSocketFrontend({
    mode,
    autoConnect: false
  });

  return (
    <WebSocketContext.Provider value={{ isConnected, lastData, sendCommand, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}