import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, LoginResponse, JwtPayload } from '../types/auth.types';
import apiService from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeJwt(token: string): JwtPayload {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload)) as JwtPayload;
}

function tokenToUser(token: string): User {
  const { sub, email, role } = decodeJwt(token);
  return { id: sub, email, role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt silent refresh on mount — restores session if cookie is still valid
    const init = async () => {
      try {
        const res = await apiService.axios.post<{ accessToken: string }>('/api/auth/refresh');
        const token = res.data.accessToken;
        setAccessToken(token);
        setUser(tokenToUser(token));
        apiService.setAccessToken(token);
      } catch {
        // Not authenticated — leave user as null
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await apiService.axios.post<LoginResponse>('/api/auth/login', {
      email: email.trim(),
      password,
    });
    const { user: userData, accessToken: token } = res.data;
    setUser(userData);
    setAccessToken(token);
    apiService.setAccessToken(token);
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.axios.post('/api/auth/logout');
    } catch {
      // Non-fatal — clear state regardless
    }
    setUser(null);
    setAccessToken(null);
    apiService.setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
