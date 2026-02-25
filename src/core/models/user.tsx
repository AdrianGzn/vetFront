export interface User {
  id: number;
  name: string;
}

export interface LoginRequest {
  name: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  name: string;
  token: string;
}

export interface CreateUserDto {
  name: string;
  password: string;
}

export interface UpdateUserDto extends Partial<CreateUserDto> {}