import { Search, Plus, Pencil, Trash2, NotebookPen, CircleAlert } from 'lucide-react'; // Añadimos CircleAlert
import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importamos useNavigate
import { usePets, useDeletePet } from '../../core/services/hooks/useApi';
import { PacienteModal } from './NuevoPacienteModal';
import { EditarPacienteModal } from './EditarPacienteModal';
import { NuevaCitaModal } from './NuevaCitaModal';
import type { Pet } from '../../core/models/pet';

export function PanelPacientes() {
  const navigate = useNavigate(); // Hook para navegación
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const { pets, loading, error, refetch } = usePets();
  const { deletePet, loading: deletingPet } = useDeletePet();

  const filteredPets = pets.filter(
    (pet) =>
      pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.race.toLowerCase().includes(searchTerm.toLowerCase())
  );
 
  const getGenderColor = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male':
      case 'macho':
        return 'bg-blue-100 text-blue-800';
      case 'female':
      case 'hembra':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGenderText = (gender: string) => {
    switch (gender.toLowerCase()) {
      case 'male':
      case 'macho':
        return 'Macho';
      case 'female':
      case 'hembra':
        return 'Hembra';
      default:
        return gender;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewDetails = (petId: number) => {
    navigate(`/mascota/${petId}`); // Navegar a la vista de detalles
  };

  const handleEdit = (pet: Pet) => {
    setSelectedPet(pet);
    setIsEditModalOpen(true);
  };

  const handleNewAppointment = (pet: Pet) => {
    setSelectedPet(pet);
    setIsAppointmentModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      const result = await deletePet(deleteConfirmId);
      if (result) {
        refetch();
        setDeleteConfirmId(null);
      }
    }
  };

  const handleSuccess = () => {
    refetch();
  };

  if (loading) {
    return <div className="p-8 text-slate-500">Cargando mascotas...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-semibold">Panel de Información</h2>
            <p className="text-slate-600 mt-1">Gestión de pacientes y mascotas</p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nuevo Paciente
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Buscar por nombre, dueño o raza..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Especie</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Raza</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Dueño</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Última Visita</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Género</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPets.map((pet) => (
                <tr
                  key={pet.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-600">{pet.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{pet.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{pet.group}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{pet.race}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{pet.owner}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(pet.lastAppointment)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getGenderColor(
                        pet.gender
                      )}`}
                    >
                      {getGenderText(pet.gender)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {/* Nuevo botón para ver detalles */}
                      <button
                        onClick={() => handleViewDetails(pet.id)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                        title="Ver detalles de la mascota"
                      >
                        <CircleAlert size={18} />
                      </button>
                      <button
                        onClick={() => handleNewAppointment(pet)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Nueva cita"
                      >
                        <NotebookPen size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(pet)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Editar paciente"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(pet.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Eliminar paciente"
                        disabled={deletingPet}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPets.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No se encontraron pacientes que coincidan con la búsqueda.
          </div>
        )}
      </div>

      {/* Modal de confirmación para eliminar */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Confirmar eliminación</h3>
            <p className="text-slate-600 mb-6">
              ¿Estás seguro de que deseas eliminar este paciente? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingPet}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400"
              >
                {deletingPet ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PacienteModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleSuccess}
      />

      <EditarPacienteModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPet(null);
        }}
        onSuccess={handleSuccess}
        pet={selectedPet}
      />

      <NuevaCitaModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setSelectedPet(null);
        }}
        onSuccess={handleSuccess}
        pet={selectedPet}
      />
    </>
  );
}