import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

type User = {
  id: string;
  name: string;
  email: string;
  referralCode?: string;
  level?: number;
  wallet?: {
    normal: number;
    benefit: number;
    game: number;
  };
};

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    // Clear the token from localStorage
    localStorage.removeItem('token');
    // Clear the user data from localStorage
    localStorage.removeItem('user');
    // Remove the token from axios headers
    delete axios.defaults.headers.common['Authorization'];
    // Clear the user state
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};