// App.tsx

import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './core/components/Sidebar';
import { PanelPacientes } from './features/mascotas/PanelPacientes';
import { ChecklistVerificacion } from './features/verificación/ChecklistVerificacion';
import { EstadoSistema } from './features/estadoSistema/EstadoSistema';
import { Resultados } from './features/resultados/Resultados';
import { InfoMascota } from './features/mascotas/InfoMascota';
import { Login } from './features/login/Login';
import { WebSocketProvider } from './core/services/contexts/WebSocketContext';
import { useAuth } from './core/services/hooks/useApi';


function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function MainLayout() {
  const [currentView, setCurrentView] = useState('pacientes');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/mascota/')) setCurrentView('info');
    else if (path === '/' || path === '') setCurrentView('pacientes');
    else if (path.startsWith('/checklist')) setCurrentView('checklist');
    else if (path.startsWith('/sistema')) setCurrentView('sistema');
    else if (path.startsWith('/resultados')) setCurrentView('resultados');
    else setCurrentView('pacientes');
  }, [location.pathname]);

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    switch (view) {
      case 'pacientes':
        navigate('/');
        break;
      case 'checklist':
        navigate('/checklist');
        break;
      case 'sistema':
        navigate('/sistema');
        break;
      case 'resultados':
        navigate('/resultados');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      <main className="flex-1 overflow-y-auto p-6">
        <Routes>
          <Route path="/" element={<PanelPacientes />} />
          <Route path="/mascota/:id" element={<InfoMascota />} />
          <Route path="/checklist" element={<ChecklistVerificacion />} />
          <Route path="/sistema" element={<EstadoSistema />} />
          <Route path="/resultados" element={<Resultados />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <WebSocketProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </WebSocketProvider>
  );
}