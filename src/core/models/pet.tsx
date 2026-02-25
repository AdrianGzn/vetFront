export interface Pet {
  id: number;
  group: string;
  control: string;
  race: string;
  age: number;
  gender: string;
  weight: string;
  bodyCondition: number;
  diagnosis: string;
  degreeLameness: number;
  onsetTimeSymptoms: string;
  name: string;
  owner: string;
  color: string;
  lastAppointment: string;
  image: string;
}


export interface CreatePetDto {
  group?: string;
  control?: string;
  race?: string;
  age?: number;
  gender?: string;
  weight?: string;
  bodyCondition?: number;
  diagnosis?: string;
  degreeLameness?: number;
  onsetTimeSymptoms?: string;
  name?: string;
  owner?: string;
  color?: string;
  lastAppointment?: string;
  image?: string;
}

export interface UpdatePetDto extends Partial<CreatePetDto> {}