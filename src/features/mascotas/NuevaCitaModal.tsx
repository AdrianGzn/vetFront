import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCreateAppointment } from '../../core/services/hooks/useApi';
import type { Pet } from '../../core/models/pet';

interface NuevaCitaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pet: Pet | null;
}

export function NuevaCitaModal({ isOpen, onClose, onSuccess, pet }: NuevaCitaModalProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [useCurrentDateTime, setUseCurrentDateTime] = useState(false);

  const { createAppointment, loading, error } = useCreateAppointment();

  // Resetear el formulario cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedDate('');
      setSelectedTime('');
      setUseCurrentDateTime(false);
    }
  }, [isOpen]);

  // Actualizar fecha y hora cuando se selecciona la opción "Ahora"
  useEffect(() => {
    if (useCurrentDateTime) {
      const now = new Date();
      
      // Ajustar a la hora local sin problemas de zona horaria
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
      
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [useCurrentDateTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pet) return;

    // Crear fecha de manera más robusta
    const [year, month, day] = selectedDate.split('-').map(Number);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    
    // Crear fecha en hora local
    const dateTime = new Date(year, month - 1, day, hours, minutes);
    
    // Convertir a ISO string manteniendo la hora local
    const isoString = dateTime.toISOString();
    
    console.log('Fecha seleccionada:', {
      fecha: selectedDate,
      hora: selectedTime,
      isoString: isoString,
      fechaLocal: dateTime.toLocaleString()
    });

    const appointmentData = {
      pet_id: pet.id,
      date: isoString
    };

    const result = await createAppointment(appointmentData);
    
    if (result) {
      // Guardar SOLO la última cita en localStorage
      const lastAppointment = {
        ...appointmentData,
        id: result.id || Date.now(),
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('appointments', JSON.stringify([lastAppointment]));
      
      onSuccess();
      onClose();
    }
  };

  if (!isOpen || !pet) return null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-slate-800">
            Nueva Cita para {pet.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Opción "Ahora" */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="useCurrentDateTime"
              checked={useCurrentDateTime}
              onChange={(e) => setUseCurrentDateTime(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="useCurrentDateTime" className="text-sm font-medium text-blue-800 cursor-pointer">
              Usar fecha y hora actual
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
              required
              disabled={useCurrentDateTime}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Hora *
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              disabled={useCurrentDateTime}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Mostrar la fecha/hora que se enviará */}
          {selectedDate && selectedTime && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Fecha y hora seleccionada:</span>{' '}
                {new Date(`${selectedDate}T${selectedTime}`).toLocaleString()}
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Mascota:</span> {pet.name}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <span className="font-semibold">Dueño:</span> {pet.owner}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? 'Guardando...' : 'Guardar Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}