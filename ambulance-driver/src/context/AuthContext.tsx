import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Driver } from '../types';

interface AuthContextType {
  driver: Driver | null;
  login: (driver: Driver) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredDriver();
  }, []);

  const loadStoredDriver = async () => {
    try {
      const storedDriver = await AsyncStorage.getItem('driver');
      if (storedDriver) {
        setDriver(JSON.parse(storedDriver));
      }
    } catch (error) {
      console.error('Error loading stored driver:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (driverData: Driver) => {
    try {
      await AsyncStorage.setItem('driver', JSON.stringify(driverData));
      setDriver(driverData);
    } catch (error) {
      console.error('Error storing driver data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('driver');
      setDriver(null);
    } catch (error) {
      console.error('Error removing driver data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ driver, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};