import { 
  ClipboardList, 
  Activity, 
  BarChart3, 
  FileText, 
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Save,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUpdateUser } from '../services/hooks/useApi';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { updateUser, loading: updatingUser } = useUpdateUser();

  const menuItems = [
    { id: 'pacientes', label: 'Panel de Información', icon: Users },
    { id: 'checklist', label: 'Checklist Pre-medición', icon: ClipboardList },
    { id: 'sistema', label: 'Estado del Sistema', icon: Activity },
    { id: 'resultados', label: 'Resultados', icon: BarChart3 },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openEditModal = () => {
    setEditName(user?.name || '');
    setEditPassword('');
    setEditConfirmPassword('');
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditError('');
    setEditSuccess('');
  };

  const handleUpdateUser = async () => {
    // Validaciones
    if (!editName.trim()) {
      setEditError('El nombre es requerido');
      return;
    }

    if (!editPassword.trim()) {
      setEditError('La contraseña es requerida');
      return;
    }

    if (editPassword !== editConfirmPassword) {
      setEditError('Las contraseñas no coinciden');
      return;
    }

    if (editPassword.length < 4) {
      setEditError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setEditError('');

    try {
      const result = await updateUser(user?.id || 0, {
        name: editName,
        password: editPassword,
      });

      if (result) {
        setEditSuccess('Usuario actualizado correctamente');
        
        const updatedUser = { id: user?.id || 0, name: editName };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        
        setTimeout(() => {
          closeEditModal();
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Error al actualizar usuario');
    }
  };

  return (
    <>
      <div 
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-slate-900 text-white h-screen flex flex-col transition-all duration-300 relative`}
      >
        
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-blue-600 text-white p-1 rounded-full hover:bg-blue-700 transition-colors z-10"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className={`p-6 border-b border-slate-700 ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? (
            <h1 className="font-semibold text-xl">SV</h1>
          ) : (
            <>
              <h1 className="font-semibold text-xl">Sistema Veterinario</h1>
              <p className="text-slate-400 text-sm mt-1">Monitoreo de Pacientes</p>
            </>
          )}
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={20} />
                    {!isCollapsed && <span className="text-sm">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className={`p-4 border-t border-slate-700 ${isCollapsed ? 'text-center' : ''}`}>
          
          {!isCollapsed && user && (
            <div className="mb-4 px-4 py-2 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-400">Usuario:</p>
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
            </div>
          )}

          <button
            onClick={openEditModal}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-slate-300 hover:bg-blue-600/10 hover:text-blue-400 mb-2 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Editar usuario' : undefined}
          >
            <Settings size={20} />
            {!isCollapsed && <span className="text-sm">Editar usuario</span>}
          </button>
          
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-slate-300 hover:bg-red-600/10 hover:text-red-400 mb-3 ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="text-sm">Cerrar sesión</span>}
          </button>

          {isCollapsed ? (
            <div className="text-sm text-slate-400">
              <p>v1.0</p>
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              <p>Sistema v1.0</p>
              <p className="mt-1">30 de Enero, 2026</p>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Editar Usuario</h2>
              <button
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {editError}
              </div>
            )}

            {editSuccess && (
              <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                {editSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nuevo nombre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 4 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={editConfirmPassword}
                  onChange={(e) => setEditConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={updatingUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {updatingUser ? (
                  <>Actualizando...</>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}