import type { Pet } from './pet';
import type { Appointment } from './appointment';
import type { DataSense } from './dataSense';


export interface PetsResponse extends Array<Pet> {}
export interface PetResponse extends Pet {}
export interface AppointmentsResponse extends Array<Appointment> {}
export interface DataSenseResponse extends Array<DataSense> {}
export interface DataSenseByTypeResponse extends Array<DataSense> {}


export interface ApiError {
  error: string;
}

// Mensajes de éxito (delete)
export interface ApiSuccess {
  message: string;
}