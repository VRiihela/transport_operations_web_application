// Matches backend Prisma UserRole enum (PascalCase)
export type UserRole = 'Admin' | 'Dispatcher' | 'Driver';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

// Minimal shape decoded from JWT payload (not validated — server handles that)
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
}
