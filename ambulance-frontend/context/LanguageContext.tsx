import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t, setLocale, currentLocale } from '../src/i18n';
import { translateHospitalName } from '../src/services/translationService';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
  t: (key: string) => string;
  translateHospitalName: (name: string, lang?: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(currentLocale);

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage) {
        setLocale(savedLanguage);
        setCurrentLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading saved language:', error);
    }
  };

  const changeLanguage = async (lang: string) => {
    try {
      await AsyncStorage.setItem('selectedLanguage', lang);
      setLocale(lang);
      setCurrentLanguage(lang);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const translateHospital = (name: string, lang?: string) => {
    return translateHospitalName(name, lang || currentLanguage);
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t, translateHospitalName: translateHospital }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};