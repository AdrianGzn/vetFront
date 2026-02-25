import { useState, useCallback, useRef } from 'react';
import type { CommandMessage } from './useWebSocketFrontend';
import type { ESP32Data } from './useWebSocketFrontend';
import type { CreateDataSenseDto } from '../../models/dataSense';

// Simulación de la API (reemplazar con tu implementación real)
const useCreateDataSense = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDataSense = useCallback(async (data: CreateDataSenseDto) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simular llamada API
      console.log('📤 Enviando datos a la API:', data);
      
      // Aquí iría tu llamada real a la API
      // const response = await fetch('/api/dataSense/createDataSense', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(data)
      // });
      
      // Simular éxito después de 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = { id: Math.floor(Math.random() * 1000), ...data };
      console.log('✅ Datos guardados en API:', result);
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createDataSense, loading, error };
};

export function useDataCollection(appointmentId: number) {
  const [collectedData, setCollectedData] = useState<ESP32Data[]>([]);
  const [sessionInfo, setSessionInfo] = useState<{
    type: string;
    totalTime: string;
    frequencyHZ: number;
    amplitudeMV: number;
  } | null>(null);
  
  const { createDataSense, loading: isCreating, error: createError } = useCreateDataSense();
  const accumulationRef = useRef<ESP32Data[]>([]);

  const addDataPoint = useCallback((data: ESP32Data) => {
    setCollectedData(prev => [...prev, data]);
    accumulationRef.current = [...accumulationRef.current, data];
  }, []);

  const startSession = useCallback((command: CommandMessage) => {
    // Limpiar datos anteriores cuando se inicia una nueva sesión
    setCollectedData([]);
    accumulationRef.current = [];
    setSessionInfo({
      type: command.type,
      totalTime: command.totalTime,
      frequencyHZ: command.frequencyHZ,
      amplitudeMV: command.amplitudeMV
    });
    console.log('🎯 Sesión iniciada:', command);
  }, []);

  const saveSession = useCallback(async () => {
    if (!sessionInfo) {
      console.warn('No hay sesión activa');
      return null;
    }

    if (accumulationRef.current.length === 0) {
      console.warn('No hay datos para guardar');
      return null;
    }

    console.log(`💾 Guardando sesión con ${accumulationRef.current.length} puntos de datos`);

    // Función auxiliar para filtrar valores null/undefined antes de stringify
    const filterAndStringify = (arr: any[]) => {
      const filtered = arr.filter(item => item != null);
      return filtered.length > 0 ? JSON.stringify(filtered) : null;
    };

    // Preparar los datos combinados para la API
    const combinedData: CreateDataSenseDto = {
      idAppointment: appointmentId,
      type: sessionInfo.type,
      totalTime: sessionInfo.totalTime,
      frequencyHZ: sessionInfo.frequencyHZ,
      amplitudeMV: sessionInfo.amplitudeMV,
      
      // Datos de la IMU
      gyroscope: filterAndStringify(accumulationRef.current.map(d => d.gyroscope)),
      accelerometer: filterAndStringify(accumulationRef.current.map(d => d.accelerometer)),
      
      // Índices de simetría
      symmetryIndexLF: filterAndStringify(accumulationRef.current.map(d => d.symmetryIndexLF)),
      symmetryIndexRF: filterAndStringify(accumulationRef.current.map(d => d.symmetryIndexRF)),
      symmetryIndexLB: filterAndStringify(accumulationRef.current.map(d => d.symmetryIndexLB)),
      symmetryIndexRB: filterAndStringify(accumulationRef.current.map(d => d.symmetryIndexRB)),
      
      // Distribución de peso
      weightDistributionLF: filterAndStringify(accumulationRef.current.map(d => d.weightDistributionLF)),
      weightDistributionRF: filterAndStringify(accumulationRef.current.map(d => d.weightDistributionRF)),
      weightDistributionLB: filterAndStringify(accumulationRef.current.map(d => d.weightDistributionLB)),
      weightDistributionRB: filterAndStringify(accumulationRef.current.map(d => d.weightDistributionRB)),
      
      // Fuerza vertical e impulso
      verticalForce: filterAndStringify(accumulationRef.current.map(d => d.verticalForce)),
      verticalImpulse: accumulationRef.current
        .map(d => d.verticalImpulse)
        .filter(impulse => impulse && impulse.trim() !== '')
        .join(',') || ''
    };

    console.log('📦 Datos combinados preparados:', {
      puntos: accumulationRef.current.length,
      campos: Object.keys(combinedData).filter(k => combinedData[k as keyof CreateDataSenseDto] != null)
    });

    const result = await createDataSense(combinedData);
    
    if (result) {
      console.log('✅ Sesión guardada exitosamente');
      // Limpiar datos después de guardar exitosamente
      setCollectedData([]);
      accumulationRef.current = [];
      setSessionInfo(null);
    }
    
    return result;
  }, [appointmentId, sessionInfo, createDataSense]);

  const clearSession = useCallback(() => {
    setCollectedData([]);
    accumulationRef.current = [];
    setSessionInfo(null);
    console.log('🧹 Sesión limpiada');
  }, []);

  // Función para obtener estadísticas básicas de la sesión actual
  const getSessionStats = useCallback(() => {
    if (accumulationRef.current.length === 0) return null;
    
    const count = accumulationRef.current.length;
    
    return {
      dataPoints: count,
      firstData: accumulationRef.current[0],
      lastData: accumulationRef.current[count - 1]
    };
  }, []);

  return {
    collectedData,
    sessionInfo,
    isCreating,
    createError,
    addDataPoint,
    startSession,
    saveSession,
    clearSession,
    getSessionStats,
    dataCount: accumulationRef.current.length
  };
}