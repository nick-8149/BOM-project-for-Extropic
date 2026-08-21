import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { loginRequest, apiRequest } from '../api/client';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  // On mount or token change, fetch the current user profile
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiRequest<User>('/api/v1/users/me', { token })
      .then(setUser)
      .catch(() => {
        // Token is invalid or expired — clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const login = async (username: string, password: string) => {
    const data = await loginRequest(username, password);
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
