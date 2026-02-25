// components/PacienteModal.tsx
import { X } from 'lucide-react';
import { useState } from 'react';
import { useCreatePet } from '../../core/services/hooks/useApi';
import type { Pet } from '../../core/models/pet';

interface PacienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PacienteModal({ isOpen, onClose, onSuccess }: PacienteModalProps) {
  const { createPet, loading: creatingPet, error: createError } = useCreatePet();
  
  const [formData, setFormData] = useState({
    group: '',
    control: '',
    race: '',
    age: 0,
    gender: '',
    weight: '',
    bodyCondition: 0,
    diagnosis: '',
    degreeLameness: 0,
    onsetTimeSymptoms: '', // Guardamos como string para el input datetime-local
    name: '',
    owner: '',
    color: '',
    lastAppointment: '', // Guardamos como string para el input date
    image: '',
    // Extremidades afectadas (las manejamos aparte para incluirlas en diagnosis)
    affectedLimbs: {
      AI: false,
      AD: false,
      PI: false,
      PD: false
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        affectedLimbs: {
          ...prev.affectedLimbs,
          [name]: checkbox.checked
        }
      }));
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : Number(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convertir las extremidades afectadas a string
    const affectedLimbsStr = Object.entries(formData.affectedLimbs)
      .filter(([_, checked]) => checked)
      .map(([limb]) => limb)
      .join(', ');
    
    // Combinar diagnóstico con extremidades afectadas si es necesario
    const fullDiagnosis = affectedLimbsStr 
      ? `${formData.diagnosis} (Extremidades afectadas: ${affectedLimbsStr})`
      : formData.diagnosis;

    // Formatear las fechas correctamente
    // Para onsetTimeSymptoms (datetime-local) necesitamos convertir a ISO string
    let onsetTimeSymptomsDate = new Date();
    if (formData.onsetTimeSymptoms) {
      onsetTimeSymptomsDate = new Date(formData.onsetTimeSymptoms);
    }

    // Para lastAppointment (date) necesitamos convertir a ISO string
    let lastAppointmentDate = new Date();
    if (formData.lastAppointment) {
      lastAppointmentDate = new Date(formData.lastAppointment);
    }

    // Preparar los datos exactamente como los espera el backend
    const petData: Omit<Pet, 'id'> = {
      group: formData.group,
      control: formData.control,
      race: formData.race,
      age: formData.age,
      gender: formData.gender,
      weight: formData.weight,
      bodyCondition: formData.bodyCondition,
      diagnosis: fullDiagnosis,
      degreeLameness: formData.degreeLameness,
      onsetTimeSymptoms: onsetTimeSymptomsDate.toISOString(),
      name: formData.name,
      owner: formData.owner,
      color: formData.color,
      lastAppointment: lastAppointmentDate.toISOString(),
      image: formData.image
    };

    console.log('Enviando datos:', petData);
    
    const result = await createPet(petData);
    
    if (result) {
      // Reset form
      setFormData({
        group: '',
        control: '',
        race: '',
        age: 0,
        gender: '',
        weight: '',
        bodyCondition: 0,
        diagnosis: '',
        degreeLameness: 0,
        onsetTimeSymptoms: '',
        name: '',
        owner: '',
        color: '',
        lastAppointment: '',
        image: '',
        affectedLimbs: { AI: false, AD: false, PI: false, PD: false }
      });
      
      onSuccess?.();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-slate-800">REGISTRO DE INFORMACIÓN DEL PACIENTE</h2>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {createError && (
          <div className="mx-6 mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            Error: {createError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* SECCIÓN 1: DATOS CLÍNICOS */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Datos Clínicos</h3>
            
            {/* Grupo y Control */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grupo</label>
                <input
                  type="text"
                  name="group"
                  value={formData.group}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Control</label>
                <input
                  type="text"
                  name="control"
                  value={formData.control}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Raza, Edad, Sexo */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Raza</label>
                <input
                  type="text"
                  name="race"
                  value={formData.race}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Edad</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="age"
                    value={formData.age || ''}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-slate-600 self-center">años</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sexo</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="Macho"
                      checked={formData.gender === 'Macho'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                      required
                    />
                    <span className="text-sm text-slate-700">M</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="gender"
                      value="Hembra"
                      checked={formData.gender === 'Hembra'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                      required
                    />
                    <span className="text-sm text-slate-700">H</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Peso y Condición Corporal */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Peso</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-slate-600 self-center">kg</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Condición corporal</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="bodyCondition"
                    value={formData.bodyCondition || ''}
                    onChange={handleChange}
                    min="1"
                    max="5"
                    step="0.5"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="text-sm text-slate-600 self-center">/5</span>
                </div>
              </div>
            </div>

            {/* Extremidad afectada */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Extremidad afectada (si aplica)</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="AI"
                    checked={formData.affectedLimbs.AI}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">AI</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="AD"
                    checked={formData.affectedLimbs.AD}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">AD</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="PI"
                    checked={formData.affectedLimbs.PI}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">PI</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="PD"
                    checked={formData.affectedLimbs.PD}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">PD</span>
                </label>
              </div>
            </div>

            {/* Diagnóstico */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico</label>
              <textarea
                name="diagnosis"
                value={formData.diagnosis}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Grado de cojera y Tiempo desde inicio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grado de cojera (1-5)</label>
                <input
                  type="number"
                  name="degreeLameness"
                  value={formData.degreeLameness || ''}
                  onChange={handleChange}
                  min="1"
                  max="5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha inicio de síntomas</label>
                <input
                  type="datetime-local"
                  name="onsetTimeSymptoms"
                  value={formData.onsetTimeSymptoms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Línea divisoria */}
          <hr className="border-t-2 border-slate-200 my-6" />

          {/* SECCIÓN 2: DATOS GENERALES */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Datos Generales</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Mascota</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Dueño</label>
                <input
                  type="text"
                  name="owner"
                  value={formData.owner}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Color/Pelaje</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Última Visita</label>
                <input
                  type="date"
                  name="lastAppointment"
                  value={formData.lastAppointment}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">URL de la Imagen</label>
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={creatingPet}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingPet}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {creatingPet ? 'Guardando...' : 'Guardar Paciente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}