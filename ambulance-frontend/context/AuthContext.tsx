import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  userLoggedIn: boolean;
  setUserLoggedIn: (value: boolean) => void;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userLoggedIn, setUserLoggedInState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLoginState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem('userLoggedIn');
        if (storedValue !== null) {
          setUserLoggedInState(JSON.parse(storedValue));
        }
      } catch (error) {
        console.error('Error loading login state:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLoginState();
  }, []);

  const setUserLoggedIn = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('userLoggedIn', JSON.stringify(value));
      setUserLoggedInState(value);
    } catch (error) {
      console.error('Error saving login state:', error);
    }
  };
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userLoggedIn');
      setUserLoggedInState(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ userLoggedIn, setUserLoggedIn, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
