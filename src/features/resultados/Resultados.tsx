import { useState, useEffect, useRef } from 'react';
import { Trash2, Upload, Download, Dog, Calendar, Clock, Activity, Weight, FileText } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { useCOPCalculator, type COPStatistics } from '../../core/services/hooks/useCOPCalculator';
import { useCreateDataSense, usePet } from '../../core/services/hooks/useApi';
import { generatePDF } from './GenerateReport';
import type { DataSense } from '../../core/models/dataSense';


const STORAGE_KEY = 'esp32_raw_session_data';
const APPOINTMENTS_KEY = 'appointments';

interface SensorDataPoint {
  timestamp: number;
  weightLF: number;
  weightRF: number;
  weightLB: number;
  weightRB: number;
  symLF: number;
  symRF: number;
  symLB: number;
  symRB: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  accelX: number;
  accelY: number;
  accelZ: number;
}

interface Appointment {
  id: number;
  pet_id: number;
  date: string;
}

export function Resultados() {
  const [storedData, setStoredData] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<SensorDataPoint[]>([]);
  const [copStats, setCopStats] = useState<COPStatistics | null>(null);
  const [localAppointment, setLocalAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  
  const chartRefs = {
    gyro: useRef<HTMLDivElement>(null),
    accel: useRef<HTMLDivElement>(null),
    weightsLine: useRef<HTMLDivElement>(null),
    weightsBar: useRef<HTMLDivElement>(null),
    symmetryLine: useRef<HTMLDivElement>(null),
    symmetryBar: useRef<HTMLDivElement>(null)
  };

  const { calculateSessionStatistics, resetLength } = useCOPCalculator();
  const { createDataSense, loading: apiLoading, error: apiError } = useCreateDataSense();

  const petId = localAppointment?.pet_id;
  const { pet, loading: petLoading, error: petError } = usePet(petId || 0);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setStoredData(parsed);
        
        const processed = parsed.map((item: any) => {
          const weightLF = parseNumericValue(item.weightDistributionLF);
          const weightRF = parseNumericValue(item.weightDistributionRF);
          const weightLB = parseNumericValue(item.weightDistributionLB);
          const weightRB = parseNumericValue(item.weightDistributionRB);
          
          const symLF = parseNumericValue(item.symmetryIndexLF);
          const symRF = parseNumericValue(item.symmetryIndexRF);
          const symLB = parseNumericValue(item.symmetryIndexLB);
          const symRB = parseNumericValue(item.symmetryIndexRB);
          
          const gyro = parseJSON(item.gyroscope) || { x: 0, y: 0, z: 0 };
          const accel = parseJSON(item.accelerometer) || { x: 0, y: 0, z: 0 };
          
          return {
            timestamp: item.timestamp || Date.now(),
            weightLF,
            weightRF,
            weightLB,
            weightRB,
            symLF,
            symRF,
            symLB,
            symRB,
            gyroX: gyro.x || 0,
            gyroY: gyro.y || 0,
            gyroZ: gyro.z || 0,
            accelX: accel.x || 0,
            accelY: accel.y || 0,
            accelZ: accel.z || 0
          };
        });
        
        setProcessedData(processed);
        
        if (processed.length > 0) {
          const copDataArray = processed.map((p: any) => ({
            timestamp: p.timestamp,
            copX: (p.weightLF * -150 + p.weightRF * 150 + p.weightLB * -150 + p.weightRB * 150) / 
                  (p.weightLF + p.weightRF + p.weightLB + p.weightRB) || 0,
            copY: (p.weightLF * 200 + p.weightRF * 200 + p.weightLB * -200 + p.weightRB * -200) / 
                  (p.weightLF + p.weightRF + p.weightLB + p.weightRB) || 0,
            copMedLat: Math.abs((p.weightLF * -150 + p.weightRF * 150 + p.weightLB * -150 + p.weightRB * 150) / 
                               (p.weightLF + p.weightRF + p.weightLB + p.weightRB) || 0),
            copCranCaud: Math.abs((p.weightLF * 200 + p.weightRF * 200 + p.weightLB * -200 + p.weightRB * -200) / 
                                 (p.weightLF + p.weightRF + p.weightLB + p.weightRB) || 0),
            totalForce: p.weightLF + p.weightRF + p.weightLB + p.weightRB,
            supportSurface: 0
          }));
          
          resetLength();
          const stats = calculateSessionStatistics(copDataArray);
          setCopStats(stats);
        }
      }

      const appointments = JSON.parse(localStorage.getItem(APPOINTMENTS_KEY) || '[]');
      if (appointments.length > 0) {
        const lastAppointment = appointments[appointments.length - 1];
        setLocalAppointment(lastAppointment);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }, [calculateSessionStatistics, resetLength]);

  const parseJSON = (data: any): any => {
    if (!data) return null;
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return null;
    }
  };

  const parseNumericValue = (data: any): number => {
    const parsed = parseJSON(data);
    return parsed?.value || parsed?.percentage || parsed || 0;
  };

  const determineMeasurementType = (): 'static' | 'dynamic' => {
    if (storedData.length > 0 && storedData[0]?.sessionInfo?.type) {
      return storedData[0].sessionInfo.type;
    }
    return 'static';
  };

  const handleClearLocalStorage = () => {
    if (window.confirm('¿Estás seguro de eliminar todos los datos almacenados localmente?')) {
      localStorage.removeItem(STORAGE_KEY);
      setStoredData([]);
      setProcessedData([]);
      setCopStats(null);
      setUploadStatus('idle');
    }
  };

  const handleUploadToAPI = async () => {
    if (storedData.length === 0) {
      alert('No hay datos para subir');
      return;
    }

    if (!localAppointment) {
      alert('No hay información de cita disponible');
      return;
    }

    setUploadStatus('idle');
    setUploadMessage('');

    const measurementType = determineMeasurementType();
    
    const sessionInfo = storedData[0]?.sessionInfo || {
      type: measurementType,
      totalTime: '30',
      frequencyHZ: 100,
      amplitudeMV: 5
    };

    const filterAndStringify = (arr: any[], key: string) => {
      const values = arr.map(d => d[key]).filter(v => v != null);
      return values.length > 0 ? JSON.stringify(values) : null;
    };

    const dataSenseData: Omit<DataSense, 'id'> = {
      idAppointment: localAppointment.id,
      type: sessionInfo.type,
      totalTime: sessionInfo.totalTime,
      frequencyHZ: sessionInfo.frequencyHZ,
      amplitudeMV: sessionInfo.amplitudeMV,
      
      COPN: null,
      COPC: null,
      result: null,
      
      gyroscope: filterAndStringify(storedData, 'gyroscope'),
      accelerometer: filterAndStringify(storedData, 'accelerometer'),
      
      symmetryIndexLF: filterAndStringify(storedData, 'symmetryIndexLF'),
      symmetryIndexRF: filterAndStringify(storedData, 'symmetryIndexRF'),
      symmetryIndexLB: filterAndStringify(storedData, 'symmetryIndexLB'),
      symmetryIndexRB: filterAndStringify(storedData, 'symmetryIndexRB'),
      
      weightDistributionLF: filterAndStringify(storedData, 'weightDistributionLF'),
      weightDistributionRF: filterAndStringify(storedData, 'weightDistributionRF'),
      weightDistributionLB: filterAndStringify(storedData, 'weightDistributionLB'),
      weightDistributionRB: filterAndStringify(storedData, 'weightDistributionRB'),
      
      verticalForce: filterAndStringify(storedData, 'verticalForce'),
      verticalImpulse: storedData.map(d => d.verticalImpulse).filter(Boolean).join(',')
    };

    console.log('📤 Enviando datos a la API:', {
      ...dataSenseData,
      tipoDetectado: measurementType,
      tipoSessionInfo: storedData[0]?.sessionInfo?.type
    });
    
    const result = await createDataSense(dataSenseData);
    console.log('📥 Respuesta de la API:', result);
    
    if (result) {
      setUploadStatus('success');
      setUploadMessage('Datos guardados exitosamente en la API');
      
      if (window.confirm('¿Deseas eliminar los datos locales después de subirlos?')) {
        localStorage.removeItem(STORAGE_KEY);
        setStoredData([]);
        setProcessedData([]);
        setCopStats(null);
      }
    } else {
      setUploadStatus('error');
      setUploadMessage(apiError || 'Error al guardar los datos');
    }
  };

  const handleDownloadJSON = () => {
    const dataStr = JSON.stringify(storedData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `datos_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleGeneratePDF = async () => {
    if (!pet || processedData.length === 0) {
      alert('No hay datos suficientes para generar el reporte');
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      await generatePDF({
        pet: {
          name: pet.name,
          race: pet.race,
          age: pet.age,
          weight: pet.weight,
          gender: pet.gender,
          diagnosis: pet.diagnosis,
          owner: pet.owner
        },
        appointmentDate: localAppointment ? new Date(localAppointment.date).toLocaleString() : 'Fecha no disponible',
        processedData,
        copStats,
        measurementType: determineMeasurementType(),
        timeChartData,
        avgWeights,
        avgSymmetry
      });
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const timeChartData = processedData.map((p, index) => ({
    name: `M${index + 1}`,
    time: new Date(p.timestamp).toLocaleTimeString(),
    weightLF: p.weightLF,
    weightRF: p.weightRF,
    weightLB: p.weightLB,
    weightRB: p.weightRB,
    symLF: p.symLF * 100,
    symRF: p.symRF * 100,
    symLB: p.symLB * 100,
    symRB: p.symRB * 100,
    gyroX: p.gyroX,
    gyroY: p.gyroY,
    gyroZ: p.gyroZ,
    accelX: p.accelX,
    accelY: p.accelY,
    accelZ: p.accelZ
  }));

  const avgWeights = [
    { name: 'Frontal Izq', value: processedData.reduce((sum, p) => sum + p.weightLF, 0) / processedData.length || 0 },
    { name: 'Frontal Der', value: processedData.reduce((sum, p) => sum + p.weightRF, 0) / processedData.length || 0 },
    { name: 'Trasero Izq', value: processedData.reduce((sum, p) => sum + p.weightLB, 0) / processedData.length || 0 },
    { name: 'Trasero Der', value: processedData.reduce((sum, p) => sum + p.weightRB, 0) / processedData.length || 0 }
  ];

  const avgSymmetry = [
    { name: 'Frontal Izq', value: (processedData.reduce((sum, p) => sum + p.symLF, 0) / processedData.length || 0) * 100 },
    { name: 'Frontal Der', value: (processedData.reduce((sum, p) => sum + p.symRF, 0) / processedData.length || 0) * 100 },
    { name: 'Trasero Izq', value: (processedData.reduce((sum, p) => sum + p.symLB, 0) / processedData.length || 0) * 100 },
    { name: 'Trasero Der', value: (processedData.reduce((sum, p) => sum + p.symRB, 0) / processedData.length || 0) * 100 }
  ];

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

  if (loading || petLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <Activity size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-600">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (petError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Error al cargar la mascota</p>
          <p className="text-sm text-red-500">{petError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Resultados de la Medición</h2>
          <p className="text-slate-600 mt-1">
            {processedData.length} puntos de datos recolectados
          </p>
          {storedData.length > 0 && storedData[0]?.sessionInfo?.type && (
            <p className="text-sm mt-1">
              <span className="font-medium">Tipo de medición:</span>{' '}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                storedData[0].sessionInfo.type === 'static' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {storedData[0].sessionInfo.type === 'static' ? 'Estático' : 'Dinámico'}
              </span>
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF || processedData.length === 0}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 transition-colors"
          >
            <FileText size={18} className={isGeneratingPDF ? 'animate-spin' : ''} />
            {isGeneratingPDF ? 'Generando...' : 'Generar PDF'}
          </button>
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={18} />
            Descargar JSON
          </button>
          <button
            onClick={handleUploadToAPI}
            disabled={apiLoading || storedData.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 transition-colors"
          >
            <Upload size={18} className={apiLoading ? 'animate-spin' : ''} />
            {apiLoading ? 'Subiendo...' : 'Subir a API'}
          </button>
          <button
            onClick={handleClearLocalStorage}
            disabled={storedData.length === 0}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 transition-colors"
          >
            <Trash2 size={18} />
            Limpiar Local
          </button>
        </div>
      </div>

      {apiError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          Error al subir datos: {apiError}
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-600">
          {uploadMessage}
        </div>
      )}

      {pet && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100">
              <img 
                src={pet.image || "https://cdn.britannica.com/16/234216-050-C66F8665/beagle-hound-dog.jpg"}
                alt={pet.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-slate-500">Paciente</p>
                <p className="font-semibold flex items-center gap-1">
                  <Dog size={16} className="text-blue-500" />
                  {pet.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Raza</p>
                <p className="font-semibold">{pet.race}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Edad</p>
                <p className="font-semibold flex items-center gap-1">
                  <Calendar size={16} className="text-blue-500" />
                  {pet.age} años
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Peso</p>
                <p className="font-semibold flex items-center gap-1">
                  <Weight size={16} className="text-blue-500" />
                  {pet.weight} kg
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Género</p>
                <p className="font-semibold">{pet.gender === 'M' ? 'Macho' : 'Hembra'}</p>
              </div>
            </div>
          </div>
          {pet.diagnosis && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-slate-500">Diagnóstico</p>
              <p className="font-medium">{pet.diagnosis}</p>
            </div>
          )}
        </div>
      )}

      {processedData.length === 0 && (
        <div className="bg-yellow-50 mb-5 border border-yellow-200 rounded-lg p-8 text-center mt-6">
          <p className="text-yellow-600 font-medium">No hay datos disponibles</p>
          <p className="text-sm text-yellow-500 mt-1">
            Realiza una medición en la vista de Estado del Sistema para ver resultados
          </p>
        </div>
      )}

      {copStats && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-semibold text-lg mb-4">Estadísticas del Centro de Presiones (COP)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-left">Parámetro</th>
                  <th className="p-3 text-left">Media ± SE</th>
                  <th className="p-3 text-left">Desviación Estándar</th>
                  <th className="p-3 text-left">Muestras</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-3 font-medium">COP-MedLat (mm)</td>
                  <td className="p-3">{copStats.medLat.mean.toFixed(2)} ± {copStats.medLat.se.toFixed(2)}</td>
                  <td className="p-3">{copStats.medLat.std.toFixed(2)}</td>
                  <td className="p-3">{copStats.sampleSize}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-3 font-medium">COP-CranCaud (mm)</td>
                  <td className="p-3">{copStats.cranCaud.mean.toFixed(2)} ± {copStats.cranCaud.se.toFixed(2)}</td>
                  <td className="p-3">{copStats.cranCaud.std.toFixed(2)}</td>
                  <td className="p-3">{copStats.sampleSize}</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Superficie de Soporte (mm²)</td>
                  <td className="p-3">{copStats.supportSurface.mean.toFixed(2)} ± {copStats.supportSurface.se.toFixed(2)}</td>
                  <td className="p-3">{copStats.supportSurface.std.toFixed(2)}</td>
                  <td className="p-3">{copStats.sampleSize}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-3 font-medium">Longitud Estatokinesiograma (mm)</td>
                  <td className="p-3" colSpan={3}>{copStats.statokinesiogramLength.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div id="chart-gyro" ref={chartRefs.gyro} className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Giroscopio (rad/s)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="gyroX" stroke="#ef4444" name="Eje X" dot={false} />
              <Line type="monotone" dataKey="gyroY" stroke="#3b82f6" name="Eje Y" dot={false} />
              <Line type="monotone" dataKey="gyroZ" stroke="#10b981" name="Eje Z" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div id="chart-accel" ref={chartRefs.accel} className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">Acelerómetro (g)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="accelX" stroke="#ef4444" name="Eje X" dot={false} />
              <Line type="monotone" dataKey="accelY" stroke="#3b82f6" name="Eje Y" dot={false} />
              <Line type="monotone" dataKey="accelZ" stroke="#10b981" name="Eje Z" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="font-semibold mb-4">Distribución de Peso por Sensor</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div id="chart-weights-line" ref={chartRefs.weightsLine}>
            <h4 className="text-sm font-medium text-slate-600 mb-2">Evolución Temporal</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="weightLF" stroke="#8b5cf6" name="LF" dot={false} />
                <Line type="monotone" dataKey="weightRF" stroke="#3b82f6" name="RF" dot={false} />
                <Line type="monotone" dataKey="weightLB" stroke="#10b981" name="LB" dot={false} />
                <Line type="monotone" dataKey="weightRB" stroke="#f59e0b" name="RB" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div id="chart-weights-bar" ref={chartRefs.weightsBar}>
            <h4 className="text-sm font-medium text-slate-600 mb-2">Promedios</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={avgWeights}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Peso (kg)" radius={[8, 8, 0, 0]}>
                  {avgWeights.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold mb-4">Índices de Simetría (%)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div id="chart-symmetry-line" ref={chartRefs.symmetryLine}>
            <h4 className="text-sm font-medium text-slate-600 mb-2">Evolución Temporal</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="symLF" stroke="#8b5cf6" name="LF" dot={false} />
                <Line type="monotone" dataKey="symRF" stroke="#3b82f6" name="RF" dot={false} />
                <Line type="monotone" dataKey="symLB" stroke="#10b981" name="LB" dot={false} />
                <Line type="monotone" dataKey="symRB" stroke="#f59e0b" name="RB" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div id="chart-symmetry-bar" ref={chartRefs.symmetryBar}>
            <h4 className="text-sm font-medium text-slate-600 mb-2">Promedios</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={avgSymmetry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="value" name="Simetría (%)" radius={[8, 8, 0, 0]}>
                  {avgSymmetry.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}