import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [userLoggedIn, setUserLoggedIn] = useState(false); // simulate login state

  return(
    <AuthProvider>
      <AppNavigator userLoggedIn={userLoggedIn} />
   </AuthProvider>
  );
}
