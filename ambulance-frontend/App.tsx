import React, { useState } from 'react';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [userLoggedIn, setUserLoggedIn] = useState(false); // simulate login state

  return <AppNavigator userLoggedIn={userLoggedIn} />;
}
