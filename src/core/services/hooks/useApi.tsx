import { useState, useEffect, useCallback } from 'react';
import type { Pet } from '../../models/pet';
import type { Appointment } from '../../models/appointment';
import type { DataSense } from '../../models/dataSense';
import type { ApiError } from '../../models/apiResponses';
import type { ApiSuccess } from '../../models/apiResponses';
import type { LoginResponse, User } from '../../models/user';

const API_BASE = 'http://127.0.0.1:8080';

// ======================
// PET HOOKS
// ======================

export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPets = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}/pet/getPets`)
      .then(res => res.json())
      .then((data: Pet[] | ApiError) => {
        if (Array.isArray(data)) {
          setPets(data);
        } else {
          setError(data.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  return { pets, loading, error, refetch: fetchPets };
}

export function usePet(id: number) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    fetch(`${API_BASE}/pet/getPetById/${id}`)
      .then(res => res.json())
      .then((data: Pet | ApiError) => {
        if ('id' in data) {
          setPet(data);
        } else {
          setError(data.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return { pet, loading, error };
}

export function useCreatePet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPet = useCallback(async (petData: Omit<Pet, 'id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/pet/createPet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error creating pet');
      }
      
      return data as Pet;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createPet, loading, error };
}

export function useUpdatePet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePet = useCallback(async (id: number, petData: Partial<Pet>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/pet/updatePet/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error updating pet');
      }
      
      return data as Pet;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updatePet, loading, error };
}

export function useDeletePet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePet = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/pet/deletePet/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error deleting pet');
      }
      
      return data as ApiSuccess;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deletePet, loading, error };
}

// ======================
// APPOINTMENT HOOKS
// ======================

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/appointment/getAppointments`)
      .then(res => res.json())
      .then((data: Appointment[] | ApiError) => {
        if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          setError(data.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { appointments, loading, error };
}

export function usePetAppointments(petId: number) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(() => {
    if (!petId) return;
    
    setLoading(true);
    fetch(`${API_BASE}/appointment/getAppointmentsByPet/${petId}`)
      .then(res => res.json())
      .then((data: Appointment[] | ApiError) => {
        if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          setError(data.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [petId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
}

export function useCreateAppointment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAppointment = useCallback(async (appointmentData: Omit<Appointment, 'id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/appointment/createAppointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error creating appointment');
      }
      
      return data as Appointment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createAppointment, loading, error };
}

// ======================
// NUEVOS HOOKS PARA ELIMINAR CITAS
// ======================

export function useDeleteAppointment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAppointment = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/appointment/deleteAppointment/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error deleting appointment');
      }
      
      return data as ApiSuccess;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteAppointment, loading, error };
}

// ======================
// DATASENSE HOOKS
// ======================

export function usePetDataSense(petId: number) {
  const [dataSense, setDataSense] = useState<DataSense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDataSense = useCallback(() => {
    if (!petId) return;
    
    setLoading(true);
    fetch(`${API_BASE}/dataSense/getDataSenseByPetId/${petId}`)
      .then(res => res.json())
      .then((data: DataSense[] | ApiError) => {
        if (Array.isArray(data)) {
          setDataSense(data);
        } else {
          setError(data.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [petId]);

  useEffect(() => {
    fetchDataSense();
  }, [fetchDataSense]);

  return { dataSense, loading, error, refetch: fetchDataSense };
}

export function usePetDataSenseByType(petId: number, type: string) {
  const [dataSense, setDataSense] = useState<DataSense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId || !type) return;
    
    fetch(`${API_BASE}/dataSense/getDataSenseByPetIdAndType/${petId}/${type}`)
      .then(res => res.json())
      .then((data: DataSense[] | ApiError) => {
        if (Array.isArray(data)) {
          setDataSense(data);
        } else {
          setError(data.error);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [petId, type]);

  return { dataSense, loading, error };
}

export function useCreateDataSense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDataSense = useCallback(async (dataSenseData: Omit<DataSense, 'id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/dataSense/createDataSense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataSenseData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error creating dataSense');
      }
      
      return data as DataSense;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createDataSense, loading, error };
}

export function useDeleteDataSense() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteDataSense = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/dataSense/deleteDataSense/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error deleting dataSense');
      }
      
      return data as ApiSuccess;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteDataSense, loading, error };
}

// ======================
// NUEVO HOOK PARA ELIMINAR SENSORES POR CITA
// ======================

export function useDeleteDataSenseByAppointment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteDataSenseByAppointment = useCallback(async (appointmentId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/dataSense/deleteDataSenseByAppointment/${appointmentId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error deleting dataSense for appointment');
      }
      
      return data as ApiSuccess;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteDataSenseByAppointment, loading, error };
}

// ======================
// HOOK COMBINADO
// ======================

export function useFullPetData(petId: number) {
  const pet = usePet(petId);
  const appointments = usePetAppointments(petId);
  const dataSense = usePetDataSense(petId);
  
  const loading = pet.loading || appointments.loading || dataSense.loading;
  const error = pet.error || appointments.error || dataSense.error;

  return {
    pet: pet.pet,
    appointments: appointments.appointments,
    dataSense: dataSense.dataSense,
    loading,
    error
  };
}

// ======================
// USER / AUTH HOOKS
// ======================

export interface LoginCredentials {
  name: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface UpdateUserCredentials {
  name: string;
  password: string;
}

// Hook para actualizar usuario
export function useUpdateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUser = useCallback(async (userId: number, credentials: UpdateUserCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/user/update/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(credentials),
      });
      
      const text = await response.text();
      
      console.log('Respuesta del backend (update):', text);
      console.log('Status:', response.status);
      
      try {
        const data = JSON.parse(text);
        
        if (!response.ok) {
          throw new Error(data.error || 'Error al actualizar usuario');
        }
        
        return data;
      } catch (parseError) {
        console.error('Error parseando JSON:', parseError);
        throw new Error(`Respuesta inválida del servidor: ${text.substring(0, 100)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateUser, loading, error };
}

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      const text = await response.text();
      
      console.log('Respuesta del backend:', text);
      console.log('Status:', response.status);
      
      try {
        const data = JSON.parse(text);
        
        if (!response.ok) {
          throw new Error(data.error || 'Error al iniciar sesión');
        }
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ id: data.id, name: data.name }));

        return data as LoginResponse;
      } catch (parseError) {
        console.error('Error parseando JSON:', parseError);
        throw new Error(`Respuesta inválida del servidor: ${text.substring(0, 100)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { login, loading, error };
}

export function useLogout() {
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return { logout };
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    return {
      user,
      token,
      isAuthenticated: !!token && !!user,
    };
  });

  const login = useCallback((response: LoginResponse) => {
    const user = { id: response.id, name: response.name };
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuth({
      user,
      token: response.token,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  }, []);

  return { ...auth, login, logout };
}