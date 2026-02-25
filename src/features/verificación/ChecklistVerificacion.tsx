import { CheckCircle2, XCircle, AlertCircle, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useWebSocket } from '../../core/services/contexts/WebSocketContext';
import { useParsedESP32Data } from '../../core/services/hooks/useWebSocketFrontend';
import type { ESP32Data } from '../../core/services/hooks/useWebSocketFrontend';

interface SensorStatus {
  id: string;
  name: string;
  status: 'ok' | 'error' | 'warning';
  value: string;
  lastCheck: string;
  expected?: boolean;
}

export function ChecklistVerificacion() {
  const [lastSensorUpdate, setLastSensorUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'no-data'>('connecting');
  const [connectionMessage, setConnectionMessage] = useState('Conectando al sistema...');
  const [isVerificationActive, setIsVerificationActive] = useState(false);
  const [verificationType, setVerificationType] = useState<'static' | 'dynamic'>('static');
  
  const [weightSensors, setWeightSensors] = useState<SensorStatus[]>([
    { id: 'w1', name: 'Sensor de Peso 1 (Frontal Izq.)', status: 'warning', value: 'Esperando datos...', lastCheck: '--:--' },
    { id: 'w2', name: 'Sensor de Peso 2 (Frontal Der.)', status: 'warning', value: 'Esperando datos...', lastCheck: '--:--' },
    { id: 'w3', name: 'Sensor de Peso 3 (Trasero Izq.)', status: 'warning', value: 'Esperando datos...', lastCheck: '--:--' },
    { id: 'w4', name: 'Sensor de Peso 4 (Trasero Der.)', status: 'warning', value: 'Esperando datos...', lastCheck: '--:--' },
  ]);

  const [oscilloscope, setOscilloscope] = useState<SensorStatus>({
    id: 'osc1',
    name: 'Osciloscopio ECG / IMU',
    status: 'warning',
    value: 'Esperando datos...',
    lastCheck: '--:--',
  });

  const [sensorModules, setSensorModules] = useState({
    weight: false,
    gyroscope: false,
    accelerometer: false,
  });

  const mountedRef = useRef(true);
  const lastProcessedDataRef = useRef<string>('');
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isConnected, lastData, connect, sendCommand } = useWebSocket();

  const parsedData = useParsedESP32Data(lastData);

  // Efecto para conectar al montar la vista
  useEffect(() => {
    if (!isConnected) {
      connect();
    }

    return () => {
      if (isVerificationActive) {
        sendCommand({
          action: 'stop',
          type: verificationType,
          totalTime: '30',
          frequencyHZ: 100,
          amplitudeMV: 10
        });
      }
    };
  }, [isConnected, connect, isVerificationActive, verificationType, sendCommand]);

  const startVerification = useCallback(() => {
    if (!isConnected) return;
    
    setIsVerificationActive(true);
    sendCommand({
      action: 'start',
      type: verificationType,
      totalTime: '30',
      frequencyHZ: 100,
      amplitudeMV: 10
    });
  }, [isConnected, verificationType, sendCommand]);

  const stopVerification = useCallback(() => {
    if (!isConnected) return;
    
    setIsVerificationActive(false);
    sendCommand({
      action: 'stop',
      type: verificationType,
      totalTime: '30',
      frequencyHZ: 100,
      amplitudeMV: 10
    });
  }, [isConnected, verificationType, sendCommand]);

  const checkNoData = useCallback(() => {
    if (!isConnected || !isVerificationActive) return;
    
    if (lastSensorUpdate) {
      const secondsSinceLastUpdate = (Date.now() - lastSensorUpdate.getTime()) / 1000;
      if (secondsSinceLastUpdate > 2) {
        setConnectionStatus('no-data');
        setConnectionMessage('Sin recepción de datos - Reintentando...');
        startVerification();
      }
    } else {
      setConnectionStatus('no-data');
      setConnectionMessage('Esperando datos - Reintentando...');
      startVerification();
    }
  }, [isConnected, isVerificationActive, lastSensorUpdate, startVerification]);

  useEffect(() => {
    if (!isConnected || !isVerificationActive) {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
      return;
    }

    retryIntervalRef.current = setInterval(checkNoData, 2000);

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [isConnected, isVerificationActive, checkNoData]);

  const processData = useCallback(() => {
    if (!parsedData || !isConnected || !isVerificationActive) return;

    const dataKey = JSON.stringify({
      wLF: parsedData.weightDistributionLF?.value,
      wRF: parsedData.weightDistributionRF?.value,
      wLB: parsedData.weightDistributionLB?.value,
      wRB: parsedData.weightDistributionRB?.value,
      gX: parsedData.gyroscope?.x,
      aX: parsedData.accelerometer?.x
    });

    if (dataKey === lastProcessedDataRef.current) return;
    lastProcessedDataRef.current = dataKey;

    const now = new Date();
    setLastSensorUpdate(now);
    setConnectionStatus('connected');
    setConnectionMessage('Conectado al sistema - Verificando');
    
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const hasWeightData = !!(parsedData.weightDistributionLF?.value || 
                            parsedData.weightDistributionRF?.value || 
                            parsedData.weightDistributionLB?.value || 
                            parsedData.weightDistributionRB?.value);
    
    const hasGyroscopeData = !!(parsedData.gyroscope?.x !== undefined);
    const hasAccelerometerData = !!(parsedData.accelerometer?.x !== undefined);

    setSensorModules({
      weight: hasWeightData,
      gyroscope: hasGyroscopeData,
      accelerometer: hasAccelerometerData,
    });

    setWeightSensors(prev => prev.map(sensor => {
      let value = 'Sin datos';
      if (hasWeightData) {
        switch(sensor.id) {
          case 'w1': value = `${(parsedData.weightDistributionLF?.value || 0).toFixed(1)} kg`; break;
          case 'w2': value = `${(parsedData.weightDistributionRF?.value || 0).toFixed(1)} kg`; break;
          case 'w3': value = `${(parsedData.weightDistributionLB?.value || 0).toFixed(1)} kg`; break;
          case 'w4': value = `${(parsedData.weightDistributionRB?.value || 0).toFixed(1)} kg`; break;
        }
      }
      return {
        ...sensor,
        status: hasWeightData ? 'ok' : 'error',
        value,
        lastCheck: timeStr,
      };
    }));

    setOscilloscope(prev => ({
      ...prev,
      status: (hasGyroscopeData || hasAccelerometerData) ? 'ok' : 'error',
      value: hasGyroscopeData ? 'Datos IMU' : 'Sin señal',
      lastCheck: timeStr,
    }));

  }, [parsedData, isConnected, isVerificationActive]);

  useEffect(() => {
    processData();
  }, [processData]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { 
      mountedRef.current = false; 
      lastProcessedDataRef.current = '';
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, []);

  const handleManualConnect = () => {
    setConnectionStatus('connecting');
    setConnectionMessage('Conectando...');
    connect();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="text-green-500" size={24} />;
      case 'error': return <XCircle className="text-red-500" size={24} />;
      default: return <AlertCircle className="text-yellow-500" size={24} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ok': return { text: 'Operativo', bg: 'bg-green-50', border: 'border-green-200' };
      case 'error': return { text: 'Error', bg: 'bg-red-50', border: 'border-red-200' };
      default: return { text: 'Esperando...', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    }
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="text-green-600" size={20} />;
      case 'connecting': return <Wifi className="text-yellow-600 animate-pulse" size={20} />;
      case 'no-data': return <Wifi className="text-orange-600 animate-pulse" size={20} />;
      default: return <WifiOff className="text-red-600" size={20} />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-50 border-green-200 text-green-800';
      case 'connecting': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'no-data': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold">Checklist de Verificación</h2>
        <p className="text-slate-600 mt-1">Verificación del estado de sensores</p>
      </div>

      {connectionStatus === 'disconnected' && (
        <div className="mb-4">
          <button
            onClick={handleManualConnect}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Conectar al sistema
          </button>
        </div>
      )}

      {isConnected && (
        <div className="mb-6 space-y-4">
          {/* Selector de tipo */}
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="static"
                checked={verificationType === 'static'}
                onChange={(e) => setVerificationType(e.target.value as 'static')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-slate-700">Estático</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="dynamic"
                checked={verificationType === 'dynamic'}
                onChange={(e) => setVerificationType(e.target.value as 'dynamic')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-slate-700">Dinámico</span>
            </label>
          </div>

          {/* Botones de control */}
          <div className="flex gap-2">
            {!isVerificationActive ? (
              <button
                onClick={startVerification}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Activity size={16} />
                Iniciar verificación {verificationType === 'static' ? 'estática' : 'dinámica'}
              </button>
            ) : (
              <button
                onClick={stopVerification}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Activity size={16} />
                Detener verificación
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`mb-6 p-4 rounded-lg border ${getConnectionColor()}`}>
        <div className="flex items-center gap-3">
          {getConnectionIcon()}
          <div>
            <p className="font-medium">{connectionMessage}</p>
            {connectionStatus === 'connected' && lastSensorUpdate && (
              <p className="text-sm opacity-75">Últimos datos: {lastSensorUpdate.toLocaleTimeString()}</p>
            )}
            {connectionStatus === 'no-data' && (
              <p className="text-sm opacity-75">Reintentando cada 2 segundos...</p>
            )}
            {isVerificationActive && (
              <p className="text-sm text-green-600">
                Verificación {verificationType === 'static' ? 'estática' : 'dinámica'} activa
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Sensores de Peso</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weightSensors.map((sensor) => {
            const statusInfo = getStatusText(sensor.status);
            return (
              <div key={sensor.id} className={`p-4 rounded-lg border ${statusInfo.border} ${statusInfo.bg}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-slate-900">{sensor.name}</h4>
                    <p className="text-sm text-slate-600">Última verificación: {sensor.lastCheck}</p>
                  </div>
                  {getStatusIcon(sensor.status)}
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xl font-semibold text-slate-900">{sensor.value}</span>
                  <span className="text-sm font-medium text-slate-700">{statusInfo.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">IMU (Giroscopio/Acelerómetro)</h3>
        <div className={`p-6 rounded-lg border ${getStatusText(oscilloscope.status).border} ${getStatusText(oscilloscope.status).bg}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-medium text-slate-900 text-lg">{oscilloscope.name}</h4>
              <p className="text-sm text-slate-600">Última verificación: {oscilloscope.lastCheck}</p>
            </div>
            {getStatusIcon(oscilloscope.status)}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-semibold text-slate-900">{oscilloscope.value}</span>
            <span className="text-sm font-medium text-slate-700">{getStatusText(oscilloscope.status).text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}