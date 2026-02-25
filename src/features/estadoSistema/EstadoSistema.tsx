import { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, Wifi, WifiOff, Play, Pause, Square, HardDrive, RefreshCw } from 'lucide-react';
import { useWebSocket } from '../../core/services/contexts/WebSocketContext';
import { useParsedESP32Data } from '../../core/services/hooks/useWebSocketFrontend';
import { useDataCollection } from '../../core/services/hooks/useDataCollection';
import { usePet } from '../../core/services/hooks/useApi';
import type { CommandMessage } from '../../core/services/hooks/useWebSocketFrontend';

// Storage keys
const STORAGE_KEY = 'esp32_raw_session_data';
const APPOINTMENTS_KEY = 'appointments';

interface EstadoSistemaProps {
  appointmentId?: number;
}

export function EstadoSistema({ appointmentId }: EstadoSistemaProps) {
  const [storedCount, setStoredCount] = useState(0);
  const [lastSensorUpdate, setLastSensorUpdate] = useState<Date | null>(null);
  const [localAppointment, setLocalAppointment] = useState<any>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [isManualConnecting, setIsManualConnecting] = useState(false);
  const mountedRef = useRef(true);
  
  
  const [commandConfig, setCommandConfig] = useState({
    type: 'static' as 'static' | 'dynamic',
    totalTime: '30',
    frequencyHZ: 100,
    amplitudeMV: 5
  });
  
  
  const { isConnected, lastData, sendCommand, connect } = useWebSocket();

  
  useEffect(() => {
    try {
      const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
      
      if (appointmentId) {
        const found = appointments.find((apt: any) => apt.id === appointmentId);
        setLocalAppointment(found);
      } else {
        const lastAppointment = appointments[appointments.length - 1];
        setLocalAppointment(lastAppointment);
      }
    } catch (e) {
      console.error('Error loading appointment from localStorage:', e);
    } finally {
      setLoadingAppointment(false);
    }
  }, [appointmentId]);

  const petId = localAppointment?.pet_id;
  const { pet, loading: petLoading, error: petError } = usePet(petId);
  
  const parsedData = useParsedESP32Data(lastData);
  
  const {
    addDataPoint,
    startSession,
    clearSession,
    sessionInfo,
    dataCount,
    isCreating
  } = useDataCollection(petId || 0);

  
  const handleNewData = useCallback((data: any) => {
    if (!mountedRef.current) return;
    
    setLastSensorUpdate(new Date());
    addDataPoint(data);
    
    
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      let stored = savedData ? JSON.parse(savedData) : [];
      stored.push({
        ...data,
        timestamp: Date.now(),
        sessionInfo: sessionInfo,
        appointmentId: localAppointment?.id,
        petId: petId
      });
      
      if (stored.length > 10000) {
        stored = stored.slice(-10000);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setStoredCount(stored.length);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [addDataPoint, sessionInfo, localAppointment?.id, petId]);

  
  useEffect(() => {
    if (lastData) {
      handleNewData(lastData);
    }
  }, [lastData, handleNewData]);

  
  useEffect(() => {
    if (!isConnected) return;

    const timeout = setInterval(() => {
      if (lastSensorUpdate) {
        const secondsSinceLastUpdate = (new Date().getTime() - lastSensorUpdate.getTime()) / 1000;
        if (secondsSinceLastUpdate > 5) {
          console.warn('⚠️ Timeout de sensores - sin datos por más de 5 segundos');
        }
      }
    }, 1000);

    return () => clearInterval(timeout);
  }, [lastSensorUpdate, isConnected]);

  
  useEffect(() => {
    mountedRef.current = true;
    
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setStoredCount(parsed.length);
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleManualConnect = useCallback(() => {
    setIsManualConnecting(true);
    connect();
    setTimeout(() => {
      setIsManualConnecting(false);
    }, 2000);
  }, [connect]);

  const handleStart = useCallback(() => {
    if (!isConnected) {
      alert('No hay conexión con el ESP32. Conecta primero.');
      return;
    }
    
    localStorage.removeItem(STORAGE_KEY);
    setStoredCount(0);
    
    const command: CommandMessage = {
      action: 'start',
      type: commandConfig.type,
      totalTime: commandConfig.totalTime,
      frequencyHZ: commandConfig.frequencyHZ,
      amplitudeMV: commandConfig.amplitudeMV
    };
    
    startSession(command);
    sendCommand(command);
    
    console.log(`✅ Sesión iniciada - Tipo: ${commandConfig.type} (localStorage limpiado)`);
  }, [startSession, sendCommand, isConnected, commandConfig]);

  const handlePause = useCallback(() => {
    if (!isConnected) {
      alert('No hay conexión con el ESP32.');
      return;
    }
    
    const command: CommandMessage = {
      action: 'pause',
      type: commandConfig.type,
      totalTime: commandConfig.totalTime,
      frequencyHZ: commandConfig.frequencyHZ,
      amplitudeMV: commandConfig.amplitudeMV
    };
    
    sendCommand(command);
  }, [sendCommand, isConnected, commandConfig]);

  const handleResume = useCallback(() => {
    if (!isConnected) {
      alert('No hay conexión con el ESP32.');
      return;
    }
    
    const command: CommandMessage = {
      action: 'start',
      type: commandConfig.type,
      totalTime: commandConfig.totalTime,
      frequencyHZ: commandConfig.frequencyHZ,
      amplitudeMV: commandConfig.amplitudeMV
    };
    
    sendCommand(command);
  }, [sendCommand, isConnected, commandConfig]);

  const handleStop = useCallback(async () => {
    if (!isConnected) {
      alert('No hay conexión con el ESP32.');
      return;
    }
    
    const command: CommandMessage = {
      action: 'stop',
      type: commandConfig.type,
      totalTime: commandConfig.totalTime,
      frequencyHZ: commandConfig.frequencyHZ,
      amplitudeMV: commandConfig.amplitudeMV
    };
    
    sendCommand(command);
    clearSession();
    localStorage.removeItem(STORAGE_KEY);
    setStoredCount(0);
    console.log(`🛑 Sesión detenida - Tipo: ${commandConfig.type}`);
  }, [sendCommand, clearSession, isConnected, commandConfig]);

  const clearLocalStorage = useCallback(() => {
    if (window.confirm('¿Estás seguro de limpiar todos los datos almacenados?')) {
      localStorage.removeItem(STORAGE_KEY);
      setStoredCount(0);
    }
  }, []);

  const weights = {
    LF: parsedData?.weightDistributionLF?.value || parsedData?.weightDistributionLF?.percentage || 0,
    RF: parsedData?.weightDistributionRF?.value || parsedData?.weightDistributionRF?.percentage || 0,
    LB: parsedData?.weightDistributionLB?.value || parsedData?.weightDistributionLB?.percentage || 0,
    RB: parsedData?.weightDistributionRB?.value || parsedData?.weightDistributionRB?.percentage || 0
  };

  const symmetry = {
    LF: parsedData?.symmetryIndexLF?.value || 0,
    RF: parsedData?.symmetryIndexRF?.value || 0,
    LB: parsedData?.symmetryIndexLB?.value || 0,
    RB: parsedData?.symmetryIndexRB?.value || 0
  };

  const totalWeight = weights.LF + weights.RF + weights.LB + weights.RB;

  if (loadingAppointment) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">Estado del Sistema</h2>
          <p className="text-slate-600 mt-1">Cargando información de la cita...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
              <div className="aspect-square bg-slate-200 rounded-lg mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!localAppointment) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-600 font-medium mb-2">No hay citas disponibles</p>
          <p className="text-sm text-yellow-500">Crea una nueva cita para comenzar el monitoreo</p>
        </div>
      </div>
    );
  }

  if (petLoading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">Estado del Sistema</h2>
          <p className="text-slate-600 mt-1">Cargando información de la mascota...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/2 mb-4"></div>
              <div className="aspect-square bg-slate-200 rounded-lg mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (petError || !pet) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Error al cargar la mascota</p>
          <p className="text-sm text-red-500">{petError || 'No se encontró la mascota'}</p>
          <p className="text-sm text-slate-600 mt-4">ID de mascota: {petId}</p>
          <p className="text-sm text-slate-600">Cita: {localAppointment.date}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Estado del Sistema</h2>
          <p className="text-slate-600 mt-1">
            Monitoreo en tiempo real - {pet.name} (Cita #{localAppointment.id})
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Fecha: {new Date(localAppointment.date).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isConnected && (
            <button
              onClick={handleManualConnect}
              disabled={isManualConnecting}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors ${
                isManualConnecting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <RefreshCw size={20} className={isManualConnecting ? 'animate-spin' : ''} />
              <span>{isManualConnecting ? 'Conectando...' : 'Conectar ESP32'}</span>
            </button>
          )}

          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
            <HardDrive size={20} className="text-slate-600" />
            <span className="text-sm text-slate-600">
              {storedCount} datos en local
            </span>
            {storedCount > 0 && (
              <button
                onClick={clearLocalStorage}
                className="ml-2 text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors text-xs"
              >
                Limpiar
              </button>
            )}
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isConnected ? (
              <>
                <Wifi size={20} />
                <span>Conectado</span>
              </>
            ) : (
              <>
                <WifiOff size={20} />
                <span>Desconectado</span>
              </>
            )}
          </div>
        </div>
      </div>

      {isConnected && lastSensorUpdate && (
        <div className="mb-4 text-sm text-slate-500">
          Última actualización: {lastSensorUpdate.toLocaleTimeString()}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Paciente Actual</h3>
            <div className="aspect-square rounded-lg overflow-hidden mb-4">
              <img 
                src={pet.image || "https://cdn.britannica.com/16/234216-050-C66F8665/beagle-hound-dog.jpg"}
                alt={pet.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Nombre:</span>
                <span className="font-semibold">{pet.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Raza:</span>
                <span className="font-semibold">{pet.race}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Edad:</span>
                <span className="font-semibold">{pet.age} años</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Peso registrado:</span>
                <span className="font-semibold">{pet.weight} kg</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-slate-600">Peso sensores:</span>
                <span className={`font-semibold text-lg ${!isConnected ? 'text-red-500' : 'text-blue-600'}`}>
                  {isConnected ? `${totalWeight.toFixed(1)} kg` : 'Error'}
                </span>
              </div>
              <div className="text-sm text-slate-500">
                Puntos en sesión: {dataCount}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Distribución de Peso por Sensor</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { pos: 'LF', color: 'from-purple-500 to-purple-600', value: weights.LF },
                { pos: 'RF', color: 'from-blue-500 to-blue-600', value: weights.RF },
                { pos: 'LB', color: 'from-green-500 to-green-600', value: weights.LB },
                { pos: 'RB', color: 'from-orange-500 to-orange-600', value: weights.RB }
              ].map((sensor) => (
                <div 
                  key={sensor.pos}
                  className={`rounded-lg p-4 ${
                    isConnected 
                      ? `bg-gradient-to-br ${sensor.color} text-white` 
                      : 'bg-red-100 text-red-700 border border-red-300'
                  }`}
                >
                  <div className="text-sm opacity-90 mb-1">Peso {sensor.pos}</div>
                  <div className="text-2xl font-semibold">
                    {isConnected ? sensor.value.toFixed(1) : 'Error'}
                  </div>
                  {isConnected && <div className="text-xs opacity-75">kg</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Índices de Simetría</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { pos: 'LF', color: 'from-indigo-500 to-indigo-600', value: symmetry.LF },
                { pos: 'RF', color: 'from-cyan-500 to-cyan-600', value: symmetry.RF },
                { pos: 'LB', color: 'from-emerald-500 to-emerald-600', value: symmetry.LB },
                { pos: 'RB', color: 'from-amber-500 to-amber-600', value: symmetry.RB }
              ].map((sensor) => (
                <div 
                  key={sensor.pos}
                  className={`rounded-lg p-4 ${
                    isConnected 
                      ? `bg-gradient-to-br ${sensor.color} text-white` 
                      : 'bg-red-100 text-red-700 border border-red-300'
                  }`}
                >
                  <div className="text-sm opacity-90 mb-1">Simetría {sensor.pos}</div>
                  <div className="text-2xl font-semibold">
                    {isConnected ? `${(sensor.value * 100).toFixed(1)}%` : 'Error'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Giroscopio & Acelerómetro</h3>
              {!isConnected ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <WifiOff size={30} className="mx-auto text-red-400 mb-2" />
                  <p className="text-red-600">ESP32 desconectado</p>
                  <p className="text-sm text-red-500 mt-1">Los datos IMU no están disponibles</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-600 mb-2">Giroscopio (rad/s)</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {['x', 'y', 'z'].map(axis => {
                        const gyroData = parsedData?.gyroscope as { x?: number; y?: number; z?: number } | undefined;
                        const value = gyroData?.[axis as 'x' | 'y' | 'z'];
                        
                        return (
                          <div key={axis} className="bg-slate-100 p-2 rounded">
                            <span className="text-xs text-slate-500">{axis.toUpperCase()}</span>
                            <div className="font-semibold">
                              {value?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-600 mb-2">Acelerómetro (g)</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {['x', 'y', 'z'].map(axis => {
                        const accelData = parsedData?.accelerometer as { x?: number; y?: number; z?: number } | undefined;
                        const value = accelData?.[axis as 'x' | 'y' | 'z'];
                        
                        return (
                          <div key={axis} className="bg-slate-100 p-2 rounded">
                            <span className="text-xs text-slate-500">{axis.toUpperCase()}</span>
                            <div className="font-semibold">
                              {value?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-4">Control del ESP32</h3>

              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de medición
                  </label>
                  <select
                    value={commandConfig.type}
                    onChange={(e) => setCommandConfig(prev => ({ 
                      ...prev, 
                      type: e.target.value as 'static' | 'dynamic' 
                    }))}
                    disabled={!isConnected || sessionInfo !== null}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="static">Estático</option>
                    <option value="dynamic">Dinámico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tiempo total (segundos)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={commandConfig.totalTime}
                    onChange={(e) => setCommandConfig(prev => ({ ...prev, totalTime: e.target.value }))}
                    disabled={!isConnected || sessionInfo !== null}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Frecuencia (Hz)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={commandConfig.frequencyHZ}
                    onChange={(e) => setCommandConfig(prev => ({ ...prev, frequencyHZ: parseInt(e.target.value) || 0 }))}
                    disabled={!isConnected || sessionInfo !== null}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amplitud (mV)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={commandConfig.amplitudeMV}
                    onChange={(e) => setCommandConfig(prev => ({ ...prev, amplitudeMV: parseInt(e.target.value) || 0 }))}
                    disabled={!isConnected || sessionInfo !== null}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {sessionInfo && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="font-medium">Sesión activa:</p>
                  <p>Tipo: {sessionInfo.type === 'static' ? 'Estático' : 'Dinámico'}</p>
                  <p>Tiempo: {sessionInfo.totalTime}s | Frec: {sessionInfo.frequencyHZ}Hz | Amp: {sessionInfo.amplitudeMV}mV</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex gap-3">
                  {sessionInfo === null ? (
                    <button
                      onClick={handleStart}
                      disabled={!isConnected}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Play size={20} />
                      Iniciar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handlePause}
                        disabled={!isConnected}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Pause size={20} />
                        Pausar
                      </button>
                      <button
                        onClick={handleResume}
                        disabled={!isConnected}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play size={20} />
                        Reanudar
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleStop}
                    disabled={!isConnected || dataCount === 0}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Square size={20} />
                    Detener
                  </button>
                </div>

                {!isConnected && (
                  <button
                    onClick={handleManualConnect}
                    disabled={isManualConnecting}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg disabled:bg-gray-300 flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw size={18} className={isManualConnecting ? 'animate-spin' : ''} />
                    {isManualConnecting ? 'Conectando...' : 'Conectar ESP32'}
                  </button>
                )}
              </div>

              {isCreating && (
                <p className="mt-3 text-sm text-blue-600 flex items-center gap-2">
                  <Activity size={16} className="animate-spin" />
                  Guardando datos en API...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-sm text-slate-500 border-t pt-4">
        <p>Los datos se están guardando automáticamente en localStorage como respaldo.</p>
        <p className="text-xs mt-1">Formato: {STORAGE_KEY} - {storedCount} puntos guardados</p>
      </div>
    </div>
  );
}