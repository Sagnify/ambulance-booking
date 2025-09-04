import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  userLoggedIn: boolean;
  setUserLoggedIn: (value: boolean) => void;
  loading: boolean;
  logout: () => void;
  userId: string | null;
  userToken: string | null;
  userName: string | null;
  setUserData: (userId: string, token: string, name?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userLoggedIn, setUserLoggedInState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const loadLoginState = async () => {
      try {
        const [storedLoginState, storedUserId, storedToken, storedUserName] = await Promise.all([
          AsyncStorage.getItem('userLoggedIn'),
          AsyncStorage.getItem('userId'),
          AsyncStorage.getItem('userToken'),
          AsyncStorage.getItem('userName')
        ]);
        
        if (storedLoginState !== null) {
          setUserLoggedInState(JSON.parse(storedLoginState));
        }
        if (storedUserId !== null) {
          setUserId(storedUserId);
        }
        if (storedToken !== null) {
          setUserToken(storedToken);
        }
        if (storedUserName !== null) {
          setUserName(storedUserName);
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
  
  const setUserData = async (userId: string, token: string, name?: string) => {
    try {
      const promises = [
        AsyncStorage.setItem('userId', userId),
        AsyncStorage.setItem('userToken', token),
        AsyncStorage.setItem('userLoggedIn', JSON.stringify(true))
      ];
      
      if (name) {
        promises.push(AsyncStorage.setItem('userName', name));
      }
      
      await Promise.all(promises);
      setUserId(userId);
      setUserToken(token);
      if (name) setUserName(name);
      setUserLoggedInState(true);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };
  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('userLoggedIn'),
        AsyncStorage.removeItem('userId'),
        AsyncStorage.removeItem('userToken'),
        AsyncStorage.removeItem('userName')
      ]);
      setUserLoggedInState(false);
      setUserId(null);
      setUserToken(null);
      setUserName(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ userLoggedIn, setUserLoggedIn, loading, logout, userId, userToken, userName, setUserData }}>
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
