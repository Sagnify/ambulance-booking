import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Theme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
  border: string;
  shadow: string;
}

export const lightTheme: Theme = {
  background: '#f8f9fa',
  surface: '#fff',
  text: '#333',
  textSecondary: '#666',
  primary: '#007AFF',
  border: '#e1e5e9',
  shadow: '#000',
};

export const darkTheme: Theme = {
  background: '#1a1a1a',
  surface: '#2d2d2d',
  text: '#fff',
  textSecondary: '#aaa',
  primary: '#0A84FF',
  border: '#404040',
  shadow: '#000',
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};