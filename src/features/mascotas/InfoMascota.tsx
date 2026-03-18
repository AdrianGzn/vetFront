import { ArrowLeft, Calendar, Activity, Heart, Scale, Weight, Zap, Moon, Sunrise, Sunset, Dog, User, Phone, MapPin, Hash, Clock, AlertCircle, Thermometer, Bone, Eye, FileText, Tag, Download, BarChart3, LineChart, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { usePet } from '../../core/services/hooks/useApi';
import { usePetAppointments } from '../../core/services/hooks/useApi';
import { usePetDataSense } from '../../core/services/hooks/useApi';
import { useDeleteAppointment, useDeleteDataSense } from '../../core/services/hooks/useApi';
import { useCOPCalculator, type COPStatistics } from '../../core/services/hooks/useCOPCalculator';
import type { DataSense } from '../../core/models/dataSense';

type DataTypeFilter = 'todos' | 'static' | 'dynamic';

interface ProcessedDataPoint {
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
  verticalForce: number;
  verticalImpulse: number;
}

interface MeasurementData {
  ds: DataSense;
  processedData: ProcessedDataPoint[];
  copStats: COPStatistics | null;
  timeChartData: any[];
  avgWeights: any[];
  avgSymmetry: any[];
  verticalData: any[];
}

export function InfoMascota() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const petId = parseInt(id || '0');

  const [selectedAppointment, setSelectedAppointment] = useState<number | null>(null);
  const [expandedDataSense, setExpandedDataSense] = useState<Record<number, boolean>>({});
  const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilter>('todos');
  const [measurementsMap, setMeasurementsMap] = useState<Record<number, MeasurementData[]>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { pet, loading: petLoading, error: petError } = usePet(petId);
  const { appointments, loading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = usePetAppointments(petId);
  const { dataSense, loading: dataSenseLoading, error: dataSenseError, refetch: refetchDataSense } = usePetDataSense(petId);
  const { deleteAppointment, loading: deletingAppointment } = useDeleteAppointment();
  const { deleteDataSense, loading: deletingDataSense } = useDeleteDataSense();
  
  const { calculateSessionStatistics, resetLength } = useCOPCalculator();

  // Refrescar datos cuando se elimina algo
  useEffect(() => {
    if (refreshTrigger > 0) {
      refetchAppointments();
      refetchDataSense();
    }
  }, [refreshTrigger, refetchAppointments, refetchDataSense]);

  // Procesar datos cuando se cargan
  useEffect(() => {
    if (!dataSense.length) return;

    const newMeasurementsMap: Record<number, MeasurementData[]> = {};

    dataSense.forEach(ds => {
      const appointmentId = ds.idAppointment;
      
      if (!newMeasurementsMap[appointmentId]) {
        newMeasurementsMap[appointmentId] = [];
      }

      try {
        // Parsear los arrays de cada campo
        const weightLFArray = parseJSONArray(ds.weightDistributionLF);
        const weightRFArray = parseJSONArray(ds.weightDistributionRF);
        const weightLBArray = parseJSONArray(ds.weightDistributionLB);
        const weightRBArray = parseJSONArray(ds.weightDistributionRB);
        
        const symLFArray = parseJSONArray(ds.symmetryIndexLF);
        const symRFArray = parseJSONArray(ds.symmetryIndexRF);
        const symLBArray = parseJSONArray(ds.symmetryIndexLB);
        const symRBArray = parseJSONArray(ds.symmetryIndexRB);
        
        const gyroArray = parseJSONArray(ds.gyroscope);
        const accelArray = parseJSONArray(ds.accelerometer);
        const verticalForceArray = parseJSONArray(ds.verticalForce);
        const verticalImpulseArray = ds.verticalImpulse?.split(',').map(Number).filter((v: number) => !isNaN(v)) || [];
        
        // Determinar la longitud máxima de los arrays
        const maxLength = Math.max(
          weightLFArray?.length || 0,
          weightRFArray?.length || 0,
          weightLBArray?.length || 0,
          weightRBArray?.length || 0,
          symLFArray?.length || 0,
          symRFArray?.length || 0,
          symLBArray?.length || 0,
          symRBArray?.length || 0,
          gyroArray?.length || 0,
          accelArray?.length || 0,
          verticalForceArray?.length || 0,
          verticalImpulseArray?.length || 0
        );

        const processedData: ProcessedDataPoint[] = [];

        // Crear puntos de datos para cada índice
        for (let i = 0; i < maxLength; i++) {
          const weightLF = weightLFArray?.[i]?.value || weightLFArray?.[i]?.percentage || weightLFArray?.[i] || 0;
          const weightRF = weightRFArray?.[i]?.value || weightRFArray?.[i]?.percentage || weightRFArray?.[i] || 0;
          const weightLB = weightLBArray?.[i]?.value || weightLBArray?.[i]?.percentage || weightLBArray?.[i] || 0;
          const weightRB = weightRBArray?.[i]?.value || weightRBArray?.[i]?.percentage || weightRBArray?.[i] || 0;
          
          const symLF = symLFArray?.[i]?.value || symLFArray?.[i] || 0;
          const symRF = symRFArray?.[i]?.value || symRFArray?.[i] || 0;
          const symLB = symLBArray?.[i]?.value || symLBArray?.[i] || 0;
          const symRB = symRBArray?.[i]?.value || symRBArray?.[i] || 0;
          
          const gyro = gyroArray?.[i] || { x: 0, y: 0, z: 0 };
          const accel = accelArray?.[i] || { x: 0, y: 0, z: 0 };
          const verticalForce = verticalForceArray?.[i]?.value || verticalForceArray?.[i] || 0;
          const verticalImpulse = verticalImpulseArray?.[i] || 0;
          
          processedData.push({
            timestamp: Date.now() + i,
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
            accelZ: accel.z || 0,
            verticalForce,
            verticalImpulse
          });
        }

        // Calcular estadísticas COP para esta medición
        let copStats = null;
        if (processedData.length > 0) {
          resetLength();
          
          const copDataArray = processedData.map(p => ({
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
          
          copStats = calculateSessionStatistics(copDataArray);
        }

        // Formatear datos para gráficas
        const timeChartData = processedData.map((p, index) => ({
          name: `M${index + 1}`,
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
          accelZ: p.accelZ,
          verticalForce: p.verticalForce,
          verticalImpulse: p.verticalImpulse
        }));

        // Promedios para barras
        const avgWeights = [
          { name: 'LF', value: processedData.reduce((sum, p) => sum + p.weightLF, 0) / processedData.length || 0 },
          { name: 'RF', value: processedData.reduce((sum, p) => sum + p.weightRF, 0) / processedData.length || 0 },
          { name: 'LB', value: processedData.reduce((sum, p) => sum + p.weightLB, 0) / processedData.length || 0 },
          { name: 'RB', value: processedData.reduce((sum, p) => sum + p.weightRB, 0) / processedData.length || 0 }
        ];

        const avgSymmetry = [
          { name: 'LF', value: (processedData.reduce((sum, p) => sum + p.symLF, 0) / processedData.length || 0) * 100 },
          { name: 'RF', value: (processedData.reduce((sum, p) => sum + p.symRF, 0) / processedData.length || 0) * 100 },
          { name: 'LB', value: (processedData.reduce((sum, p) => sum + p.symLB, 0) / processedData.length || 0) * 100 },
          { name: 'RB', value: (processedData.reduce((sum, p) => sum + p.symRB, 0) / processedData.length || 0) * 100 }
        ];

        // Datos para vertical (fuerza e impulso)
        const verticalData = processedData.map((p, index) => ({
          name: `M${index + 1}`,
          fuerza: p.verticalForce,
          impulso: p.verticalImpulse
        }));

        newMeasurementsMap[appointmentId].push({
          ds,
          processedData,
          copStats,
          timeChartData,
          avgWeights,
          avgSymmetry,
          verticalData
        });

      } catch (e) {
        console.error('Error processing data for measurement', ds.id, e);
      }
    });

    setMeasurementsMap(newMeasurementsMap);
  }, [dataSense, calculateSessionStatistics, resetLength]);

  // Función auxiliar para parsear arrays JSON
  const parseJSONArray = (data: any): any[] => {
    if (!data) return [];
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  };

  // Filtrar dataSense por tipo (ahora filtramos las mediciones)
  const getFilteredMeasurements = (appointmentId: number) => {
    const measurements = measurementsMap[appointmentId] || [];
    if (dataTypeFilter === 'todos') return measurements;
    return measurements.filter(m => m.ds.type === dataTypeFilter);
  };

  const toggleDataSense = (id: number) => {
    setExpandedDataSense(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleDeleteAppointment = async (appointmentId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Evitar que se active el onClick del contenedor
    
    if (window.confirm('¿Estás seguro de eliminar esta cita? También se eliminarán todas las mediciones asociadas.')) {
      const result = await deleteAppointment(appointmentId);
      if (result) {
        setRefreshTrigger(prev => prev + 1);
        // Si la cita eliminada era la seleccionada, cerrarla
        if (selectedAppointment === appointmentId) {
          setSelectedAppointment(null);
        }
      }
    }
  };

  const handleDeleteDataSense = async (dataSenseId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Evitar que se active el onClick del contenedor
    
    if (window.confirm('¿Estás seguro de eliminar esta medición?')) {
      const result = await deleteDataSense(dataSenseId);
      if (result) {
        setRefreshTrigger(prev => prev + 1);
        setExpandedDataSense(prev => {
          const newState = { ...prev };
          delete newState[dataSenseId];
          return newState;
        });
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No registrada';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGenderText = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male':
      case 'macho':
        return 'Macho';
      case 'female':
      case 'hembra':
        return 'Hembra';
      default:
        return gender || 'No especificado';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'static':
        return <Moon size={16} className="text-purple-600" />;
      case 'dynamic':
        return <Sunrise size={16} className="text-orange-600" />;
      default:
        return <Activity size={16} className="text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'static':
        return 'bg-purple-100 text-purple-800';
      case 'dynamic':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLamenessLevel = (level: number) => {
    if (!level && level !== 0) return 'No evaluado';
    const levels = ['Normal', 'Leve', 'Moderado', 'Severo', 'Muy severo'];
    return levels[level] || `Nivel ${level}`;
  };

  const getBodyConditionText = (condition: number) => {
    if (!condition && condition !== 0) return 'No evaluado';
    if (condition < 3) return 'Bajo peso';
    if (condition <= 5) return 'Ideal';
    if (condition <= 7) return 'Sobrepeso';
    return 'Obeso';
  };

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

  if (petLoading || appointmentsLoading || dataSenseLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Cargando información de la mascota...</div>
      </div>
    );
  }

  if (petError || !pet) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ArrowLeft size={20} />
            Volver al panel
          </button>
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            Error: {petError || 'No se encontró la mascota'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Cabecera con botón de regreso */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver al panel
          </button>
        </div>

        {/* Información básica de la mascota - Tarjeta principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          {/* Foto y nombre */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
            <div className="flex items-center gap-6">
              {pet.image ? (
                <img 
                  src={pet.image} 
                  alt={pet.name}
                  className="w-24 h-24 rounded-full border-4 border-white object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white bg-blue-400 flex items-center justify-center">
                  <Dog size={40} className="text-white" />
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold">{pet.name}</h1>
                <p className="text-blue-100 mt-1">ID: {pet.id} • {pet.owner}</p>
              </div>
            </div>
          </div>

          {/* Grid de información detallada */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Identificación */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Tag size={18} className="text-blue-600" />
                  Identificación
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">ID:</span>
                    <span className="font-medium">{pet.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Nombre:</span>
                    <span className="font-medium">{pet.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Color:</span>
                    <span className="font-medium">{pet.color || 'No especificado'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Género:</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${
                      pet.gender?.toLowerCase() === 'male' || pet.gender?.toLowerCase() === 'macho'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-pink-100 text-pink-800'
                    }`}>
                      {getGenderText(pet.gender)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dueño */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <User size={18} className="text-green-600" />
                  Dueño
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Nombre:</span>
                    <span className="font-medium">{pet.owner}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Control:</span>
                    <span className="font-medium">{pet.control || 'No especificado'}</span>
                  </div>
                </div>
              </div>

              {/* Características físicas */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Bone size={18} className="text-amber-600" />
                  Características
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Grupo:</span>
                    <span className="font-medium">{pet.group || 'No especificado'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Raza:</span>
                    <span className="font-medium">{pet.race || 'No especificada'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Edad:</span>
                    <span className="font-medium">{pet.age ? `${pet.age} años` : 'No especificada'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Peso:</span>
                    <span className="font-medium">{pet.weight ? `${pet.weight} kg` : 'No registrado'}</span>
                  </div>
                </div>
              </div>

              {/* Condición corporal */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Scale size={18} className="text-purple-600" />
                  Condición Corporal
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Índice (1-9):</span>
                    <span className="font-medium">{pet.bodyCondition || 'No evaluado'}</span>
                  </div>
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <FileText size={18} className="text-red-600" />
                  Diagnóstico
                </h3>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-slate-600 block mb-1">Diagnóstico:</span>
                    <span className="font-medium bg-slate-50 p-2 rounded block">
                      {pet.diagnosis || 'Sin diagnóstico registrado'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Grado de cojera:</span>
                    <span className="font-medium">{getLamenessLevel(pet.degreeLameness)} ({pet.degreeLameness || 'No evaluado'})</span>
                  </div>
                </div>
              </div>

              {/* Tiempos */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                  <Clock size={18} className="text-indigo-600" />
                  Tiempos
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Inicio síntomas:</span>
                    <span className="font-medium">{formatDate(pet.onsetTimeSymptoms) || 'No especificado'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Última visita:</span>
                    <span className="font-medium">{formatDate(pet.lastAppointment)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros de tipo de dataSense */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Datos de sensores</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setDataTypeFilter('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dataTypeFilter === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDataTypeFilter('static')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                dataTypeFilter === 'static'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Moon size={16} />
              Estáticos
            </button>
            <button
              onClick={() => setDataTypeFilter('dynamic')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                dataTypeFilter === 'dynamic'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Sunrise size={16} />
              Dinámicos
            </button>
          </div>
        </div>

        {/* Lista de citas con sus mediciones */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-800">Historial de citas</h2>
          
          {appointments.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
              No hay citas registradas para esta mascota
            </div>
          ) : (
            appointments.map((appointment) => {
              const filteredMeasurements = getFilteredMeasurements(appointment.id);

              return (
                <div key={appointment.id} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Cabecera de la cita - CON BOTÓN DE ELIMINAR */}
                  <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => setSelectedAppointment(
                        selectedAppointment === appointment.id ? null : appointment.id
                      )}
                    >
                      <Calendar size={20} className="text-blue-600" />
                      <span className="font-medium">{formatDate(appointment.date)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">
                        {filteredMeasurements.length} mediciones
                      </span>
                      <button
                        onClick={(e) => handleDeleteAppointment(appointment.id, e)}
                        disabled={deletingAppointment}
                        className="p-1 hover:bg-red-100 rounded-full transition-colors group"
                        title="Eliminar cita"
                      >
                        <Trash2 size={18} className="text-red-500 group-hover:text-red-700" />
                      </button>
                      <span className="text-xs text-slate-400">
                        {selectedAppointment === appointment.id ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido de la cita - Mediciones individuales */}
                  {selectedAppointment === appointment.id && (
                    <div className="p-6">
                      {filteredMeasurements.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">
                          No hay mediciones para esta cita con el filtro seleccionado
                        </p>
                      ) : (
                        <div className="space-y-6">
                          {filteredMeasurements.map((measurement) => (
                            <div key={measurement.ds.id} className="border rounded-lg overflow-hidden">
                              {/* Cabecera de la medición - CON BOTÓN DE ELIMINAR */}
                              <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                                <div 
                                  className="flex items-center gap-3 cursor-pointer flex-1"
                                  onClick={() => toggleDataSense(measurement.ds.id)}
                                >
                                  {getTypeIcon(measurement.ds.type)}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(measurement.ds.type)}`}>
                                    {measurement.ds.type === 'static' ? 'Estático' : 'Dinámico'}
                                  </span>
                                  <span className="text-sm text-slate-600">ID: {measurement.ds.id}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">
                                    {measurement.processedData.length} puntos
                                  </span>
                                  <button
                                    onClick={(e) => handleDeleteDataSense(measurement.ds.id, e)}
                                    disabled={deletingDataSense}
                                    className="p-1 hover:bg-red-100 rounded-full transition-colors group"
                                    title="Eliminar medición"
                                  >
                                    <Trash2 size={16} className="text-red-500 group-hover:text-red-700" />
                                  </button>
                                  {expandedDataSense[measurement.ds.id] ? (
                                    <ChevronUp size={16} className="text-slate-400" />
                                  ) : (
                                    <ChevronDown size={16} className="text-slate-400" />
                                  )}
                                </div>
                              </div>

                              {/* Contenido expandible de la medición */}
                              {expandedDataSense[measurement.ds.id] && (
                                <div className="p-4 space-y-6">
                                  {/* ... (todo el contenido de gráficas igual que antes) ... */}
                                  {/* Tabla de Estadísticas COP */}
                                  {measurement.copStats && (
                                    <div className="bg-white rounded-lg border p-4">
                                      <h3 className="font-semibold text-lg mb-3">Estadísticas del Centro de Presiones (COP)</h3>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead className="bg-slate-50">
                                            <tr>
                                              <th className="p-2 text-left">Parámetro</th>
                                              <th className="p-2 text-left">Media ± SE</th>
                                              <th className="p-2 text-left">Desviación Estándar</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y">
                                            <tr>
                                              <td className="p-2 font-medium">COP-MedLat (mm)</td>
                                              <td className="p-2">{measurement.copStats.medLat.mean.toFixed(2)} ± {measurement.copStats.medLat.se.toFixed(2)}</td>
                                              <td className="p-2">{measurement.copStats.medLat.std.toFixed(2)}</td>
                                            </tr>
                                            <tr className="bg-slate-50">
                                              <td className="p-2 font-medium">COP-CranCaud (mm)</td>
                                              <td className="p-2">{measurement.copStats.cranCaud.mean.toFixed(2)} ± {measurement.copStats.cranCaud.se.toFixed(2)}</td>
                                              <td className="p-2">{measurement.copStats.cranCaud.std.toFixed(2)}</td>
                                            </tr>
                                            <tr>
                                              <td className="p-2 font-medium">Longitud Estatokinesiograma (mm)</td>
                                              <td className="p-2" colSpan={2}>{measurement.copStats.statokinesiogramLength.toFixed(2)}</td>
                                            </tr>
                                            <tr className="bg-slate-50">
                                              <td className="p-2 font-medium">Muestras</td>
                                              <td className="p-2" colSpan={2}>{measurement.copStats.sampleSize}</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Gráficas de Giroscopio y Acelerómetro */}
                                  {measurement.processedData.length > 0 && (
                                    <>
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {/* Giroscopio */}
                                        <div className="bg-white rounded-lg border p-4">
                                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <Activity size={18} className="text-purple-600" />
                                            Giroscopio (rad/s)
                                          </h3>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <RechartsLineChart data={measurement.timeChartData}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="name" hide />
                                              <YAxis />
                                              <Tooltip />
                                              <Legend />
                                              <Line type="monotone" dataKey="gyroX" stroke="#ef4444" name="X" dot={false} />
                                              <Line type="monotone" dataKey="gyroY" stroke="#3b82f6" name="Y" dot={false} />
                                              <Line type="monotone" dataKey="gyroZ" stroke="#10b981" name="Z" dot={false} />
                                            </RechartsLineChart>
                                          </ResponsiveContainer>
                                        </div>

                                        {/* Acelerómetro */}
                                        <div className="bg-white rounded-lg border p-4">
                                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <Activity size={18} className="text-green-600" />
                                            Acelerómetro (g)
                                          </h3>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <RechartsLineChart data={measurement.timeChartData}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="name" hide />
                                              <YAxis />
                                              <Tooltip />
                                              <Legend />
                                              <Line type="monotone" dataKey="accelX" stroke="#ef4444" name="X" dot={false} />
                                              <Line type="monotone" dataKey="accelY" stroke="#3b82f6" name="Y" dot={false} />
                                              <Line type="monotone" dataKey="accelZ" stroke="#10b981" name="Z" dot={false} />
                                            </RechartsLineChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>

                                      {/* Gráficas de Pesos */}
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className="bg-white rounded-lg border p-4">
                                          <h3 className="font-semibold mb-3">Evolución de Pesos</h3>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <RechartsLineChart data={measurement.timeChartData}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="name" hide />
                                              <YAxis />
                                              <Tooltip />
                                              <Legend />
                                              <Line type="monotone" dataKey="weightLF" stroke="#8b5cf6" name="LF" dot={false} />
                                              <Line type="monotone" dataKey="weightRF" stroke="#3b82f6" name="RF" dot={false} />
                                              <Line type="monotone" dataKey="weightLB" stroke="#10b981" name="LB" dot={false} />
                                              <Line type="monotone" dataKey="weightRB" stroke="#f59e0b" name="RB" dot={false} />
                                            </RechartsLineChart>
                                          </ResponsiveContainer>
                                        </div>

                                        <div className="bg-white rounded-lg border p-4">
                                          <h3 className="font-semibold mb-3">Promedios de Peso</h3>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <RechartsBarChart data={measurement.avgWeights}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="name" />
                                              <YAxis />
                                              <Tooltip />
                                              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                                {measurement.avgWeights.map((_, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                              </Bar>
                                            </RechartsBarChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>

                                      {/* Gráficas de Simetría */}
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className="bg-white rounded-lg border p-4">
                                          <h3 className="font-semibold mb-3">Evolución de Simetría (%)</h3>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <RechartsLineChart data={measurement.timeChartData}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="name" hide />
                                              <YAxis domain={[0, 100]} />
                                              <Tooltip />
                                              <Legend />
                                              <Line type="monotone" dataKey="symLF" stroke="#8b5cf6" name="LF" dot={false} />
                                              <Line type="monotone" dataKey="symRF" stroke="#3b82f6" name="RF" dot={false} />
                                              <Line type="monotone" dataKey="symLB" stroke="#10b981" name="LB" dot={false} />
                                              <Line type="monotone" dataKey="symRB" stroke="#f59e0b" name="RB" dot={false} />
                                            </RechartsLineChart>
                                          </ResponsiveContainer>
                                        </div>

                                        <div className="bg-white rounded-lg border p-4">
                                          <h3 className="font-semibold mb-3">Promedios de Simetría (%)</h3>
                                          <ResponsiveContainer width="100%" height={200}>
                                            <RechartsBarChart data={measurement.avgSymmetry}>
                                              <CartesianGrid strokeDasharray="3 3" />
                                              <XAxis dataKey="name" />
                                              <YAxis domain={[0, 100]} />
                                              <Tooltip />
                                              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                                                {measurement.avgSymmetry.map((_, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                              </Bar>
                                            </RechartsBarChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>

                                      {/* Gráfica de Fuerza Vertical e Impulso Vertical */}
                                      <div className="bg-white rounded-lg border p-4">
                                        <h3 className="font-semibold mb-3">Fuerza e Impulso Vertical</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                          <div>
                                            <h4 className="text-sm font-medium text-slate-600 mb-2">Evolución Temporal</h4>
                                            <ResponsiveContainer width="100%" height={200}>
                                              <RechartsLineChart data={measurement.verticalData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" hide />
                                                <YAxis yAxisId="left" />
                                                <YAxis yAxisId="right" orientation="right" />
                                                <Tooltip />
                                                <Legend />
                                                <Line yAxisId="left" type="monotone" dataKey="fuerza" stroke="#3b82f6" name="Fuerza (N)" dot={false} />
                                                <Line yAxisId="right" type="monotone" dataKey="impulso" stroke="#f59e0b" name="Impulso" dot={false} />
                                              </RechartsLineChart>
                                            </ResponsiveContainer>
                                          </div>
                                          <div>
                                            <h4 className="text-sm font-medium text-slate-600 mb-2">Estadísticos</h4>
                                            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Fuerza promedio:</span>
                                                <span className="font-medium">
                                                  {(measurement.processedData.reduce((sum, p) => sum + p.verticalForce, 0) / measurement.processedData.length || 0).toFixed(2)} N
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Fuerza máxima:</span>
                                                <span className="font-medium">
                                                  {Math.max(...measurement.processedData.map(p => p.verticalForce)).toFixed(2)} N
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Fuerza mínima:</span>
                                                <span className="font-medium">
                                                  {Math.min(...measurement.processedData.map(p => p.verticalForce)).toFixed(2)} N
                                                </span>
                                              </div>
                                              <div className="border-t my-2"></div>
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Impulso promedio:</span>
                                                <span className="font-medium">
                                                  {(measurement.processedData.reduce((sum, p) => sum + p.verticalImpulse, 0) / measurement.processedData.length || 0).toFixed(2)}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Impulso máximo:</span>
                                                <span className="font-medium">
                                                  {Math.max(...measurement.processedData.map(p => p.verticalImpulse)).toFixed(2)}
                                                </span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Impulso mínimo:</span>
                                                <span className="font-medium">
                                                  {Math.min(...measurement.processedData.map(p => p.verticalImpulse)).toFixed(2)}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}