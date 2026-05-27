import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { auth } from './src/firebase/config';
import { C } from './src/theme';
import { WorkspaceProvider } from './src/contexts/WorkspaceContext';
import LoginScreen    from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AppShell from './src/components/AppShell';

export default function App() {
  const [user,         setUser]         = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authScreen,   setAuthScreen]   = useState<'login' | 'register'>('login');
  const [inviteCode,   setInviteCode]   = useState<string | undefined>(undefined);

  useEffect(() => {
    // Read invite code from URL query param on initial load
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('invite');
      if (code) {
        setInviteCode(code);
        setAuthScreen('register');
      }
    }
    return onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setInitializing(false);
    });
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <WorkspaceProvider userId={user?.uid ?? null}>
      <View style={styles.root}>
        <StatusBar style="light" />
        {user ? (
          <AppShell userEmail={user.email} userId={user.uid} />
        ) : authScreen === 'login' ? (
          <LoginScreen onRegister={() => setAuthScreen('register')} />
        ) : (
          <RegisterScreen
            onBackToLogin={() => setAuthScreen('login')}
            prefillInviteCode={inviteCode}
          />
        )}
      </View>
    </WorkspaceProvider>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bgBase },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgBase },
});
