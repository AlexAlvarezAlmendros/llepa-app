import '@azure/core-asynciterator-polyfill';
import 'expo-crypto';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged, type Auth } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { useAuthStore } from './src/store/authStore';
import { paperTheme } from './src/config/paperTheme';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Listener de autenticación de Firebase
    const unsubscribe = onAuthStateChanged(auth as Auth, (user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || undefined,
          photoURL: user.photoURL || undefined,
          createdAt: user.metadata.creationTime as any,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <StatusBar style="auto" />
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
