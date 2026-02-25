export interface Appointment {
  id: number;
  pet_id: number;
  date: string;
}

export interface CreateAppointmentDto {
  pet_id: number;
  date: string;
}

export interface UpdateAppointmentDto extends Partial<CreateAppointmentDto> {}