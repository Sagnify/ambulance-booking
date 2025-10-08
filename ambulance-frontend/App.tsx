import React, { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BookingProvider } from './context/BookingContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [userLoggedIn, setUserLoggedIn] = useState(false); // simulate login state

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <BookingProvider>
            <AppNavigator />
          </BookingProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
