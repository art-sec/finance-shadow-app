import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { auth } from './src/firebase/config';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RegisterScreen from './src/screens/RegisterScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#E6D46A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {user ? (
        <DashboardScreen 
          userEmail={user.email} 
          userId={user.uid}
        />
      ) : (
        authScreen === 'login' ? (
          <LoginScreen onRegister={() => setAuthScreen('register')} />
        ) : (
          <RegisterScreen onBackToLogin={() => setAuthScreen('login')} />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D10',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0D10',
  },
});
