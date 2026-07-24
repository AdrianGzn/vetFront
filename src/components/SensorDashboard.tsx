import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Gauge, TrendingUp, AlertCircle } from 'lucide-react';

interface SensorData {
  weightDistributionLF: number;
  weightDistributionRF: number;
  weightDistributionLB: number;
  weightDistributionRB: number;
  totalWeight: number;
  cop?: {
    x: number;
    y: number;
  };
  gyroscope?: {
    x: number;
    y: number;
    z: number;
  };
  angles?: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  accelerometer?: {
    x: number;
    y: number;
    z: number;
  };
  temperature?: number;
  timestamp?: number;
}

interface HistoricalData extends SensorData {
  time: string;
}

const SensorDashboard: React.FC = () => {
  const [currentData, setCurrentData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<HistoricalData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testActive, setTestActive] = useState(false);

  const MAX_HISTORY = 60;

  // Conectar al WebSocket
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8081/ws/frontend');

    ws.onopen = () => {
      console.log('Conectado al WebSocket');
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SensorData;
        setCurrentData(data);

        // Agregar al historial
        const timestamp = new Date().toLocaleTimeString();
        setHistory((prev) => [
          ...prev.slice(-MAX_HISTORY),
          { ...data, time: timestamp },
        ]);
      } catch (err) {
        console.error('Error parseando datos:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Error WebSocket:', err);
      setError('Error de conexión');
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Desconectado del WebSocket');
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Enviar comando al WebSocket
  const sendCommand = (action: string, params?: any) => {
    const ws = new WebSocket('ws://localhost:8081/ws/frontend');
    ws.onopen = () => {
      ws.send(JSON.stringify({ action, ...params }));
      ws.close();
    };
  };

  const startTest = async () => {
    // Crear nueva cita en la API
    try {
      const response = await fetch('http://localhost:8080/bluetooth/startTest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petId: 1, testType: 'stability' }),
      });
      const result = await response.json();
      setTestActive(true);
      console.log('Test iniciado:', result);
    } catch (err) {
      console.error('Error iniciando test:', err);
    }
  };

  const endTest = async () => {
    // Finalizar cita
    try {
      await fetch('http://localhost:8080/bluetooth/endTest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: 1,
          notes: 'Test completado',
        }),
      });
      setTestActive(false);
      console.log('Test finalizado');
    } catch (err) {
      console.error('Error finalizando test:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Sistema de Estabilometría Canina
        </h1>

        {/* Status Indicator */}
        <div className="flex items-center gap-3 mt-4">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
          {error && (
            <div className="ml-4 flex items-center gap-2 text-red-600">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={startTest}
          disabled={testActive}
          className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
        >
          Iniciar Prueba
        </button>
        <button
          onClick={endTest}
          disabled={!testActive}
          className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400"
        >
          Finalizar Prueba
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Weight Distribution Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="text-blue-500" />
            Distribución de Peso
          </h2>

          {currentData && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Pata Frontal Izquierda */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Frontal Izq</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {currentData.weightDistributionLF.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>

                {/* Pata Frontal Derecha */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Frontal Der</p>
                  <p className="text-2xl font-bold text-green-600">
                    {currentData.weightDistributionRF.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>

                {/* Pata Posterior Izquierda */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Posterior Izq</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {currentData.weightDistributionLB.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>

                {/* Pata Posterior Derecha */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Posterior Der</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {currentData.weightDistributionRB.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">kg</p>
                </div>
              </div>

              {/* Total Weight */}
              <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                <p className="text-sm text-gray-600">Peso Total</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {currentData.totalWeight.toFixed(2)} kg
                </p>
              </div>
            </div>
          )}
        </div>

        {/* COP Visualization */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Gauge className="text-purple-500" />
            Centro de Presión
          </h2>

          {currentData?.cop && (
            <div>
              {/* COP Canvas */}
              <div className="bg-gray-100 w-full h-48 rounded-lg mb-4 relative flex items-center justify-center">
                <div className="w-40 h-40 border-2 border-gray-400 rounded-full relative">
                  {/* Punto del COP */}
                  <div
                    className="absolute w-4 h-4 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${(currentData.cop.x + 1) * 50}%`,
                      top: `${(currentData.cop.y + 1) * 50}%`,
                    }}
                  />

                  {/* Líneas de referencia */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">COP X</p>
                  <p className="font-bold">{currentData.cop.x.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-gray-600">COP Y</p>
                  <p className="font-bold">{currentData.cop.y.toFixed(3)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gyroscope/Orientation */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-green-500" />
            Orientación
          </h2>

          {currentData?.angles && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Roll</p>
                <p className="text-2xl font-bold text-red-600">
                  {currentData.angles.roll.toFixed(1)}°
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Pitch</p>
                <p className="text-2xl font-bold text-green-600">
                  {currentData.angles.pitch.toFixed(1)}°
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Yaw</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currentData.angles.yaw.toFixed(1)}°
                </p>
              </div>

              {currentData.temperature && (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Temperatura</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {currentData.temperature.toFixed(1)}°C
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Historical Data Chart */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Historial de Pesos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="weightDistributionLF"
                stroke="#3b82f6"
                name="Frontal Izq"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="weightDistributionRF"
                stroke="#10b981"
                name="Frontal Der"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="weightDistributionLB"
                stroke="#8b5cf6"
                name="Posterior Izq"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="weightDistributionRB"
                stroke="#f97316"
                name="Posterior Der"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Motor Control */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Control de Motores</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* Motor X */}
          <div>
            <label className="block text-sm font-medium mb-2">Motor X (Horizontal)</label>
            <input
              type="range"
              min="-100"
              max="100"
              defaultValue="0"
              onChange={(e) =>
                sendCommand('move', {
                  speedX: parseInt(e.target.value),
                  speedY: 0,
                })
              }
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">-100% a 100%</p>
          </div>

          {/* Motor Y */}
          <div>
            <label className="block text-sm font-medium mb-2">Motor Y (Vertical)</label>
            <input
              type="range"
              min="-100"
              max="100"
              defaultValue="0"
              onChange={(e) =>
                sendCommand('move', {
                  speedX: 0,
                  speedY: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">-100% a 100%</p>
          </div>
        </div>

        {/* Preset Movements */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <button
            onClick={() => sendCommand('circular', { radius: 30, speed: 20 })}
            className="py-2 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm"
          >
            Movimiento Circular
          </button>
          <button
            onClick={() => sendCommand('stop')}
            className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
          >
            Detener
          </button>
          <button
            onClick={() => sendCommand('move', { speedX: 30, speedY: 30 })}
            className="py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
          >
            Movimiento Diagonal
          </button>
        </div>
      </div>
    </div>
  );
};

export default SensorDashboard;
