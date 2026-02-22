/**
 * Finance Shadow App - Componente Principal
 * 
 * Este é o ponto de entrada da aplicação. Ele gerencia:
 * - Autenticação do usuário com Firebase
 * - Estados de carregamento
 * - Navegação entre telas (Login, Registro, Dashboard)
 * 
 * Fluxo:
 * 1. Ao iniciar, (initializing = true) mostra um loading
 * 2. Verifica autenticação com onAuthStateChanged
 * 3. Se não autenticado: mostra LoginScreen ou RegisterScreen
 * 4. Se autenticado: mostra DashboardScreen
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { StatusBar } from 'expo-status-bar';
import { auth } from './src/firebase/config';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RegisterScreen from './src/screens/RegisterScreen';

export default function App() {
  // Estado do usuário autenticado (null = não autenticado)
  const [user, setUser] = useState<User | null>(null);
  
  // Controla se a app está ainda verificando autenticação
  const [initializing, setInitializing] = useState(true);
  
  // Controla qual tela de autenticação exibir
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  // Hook: Verificar autenticação ao montar o componente
  useEffect(() => {
    // Listener de mudanças de autenticação - chamado quando o usuário faz login/logout
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false); // Marca fim do carregamento inicial
    });

    // Cleanup: desinscrever do listener quando o componente desmontar
    return unsubscribe;
  }, []);

  // Enquanto carrega autenticação, mostrar spinner
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
        // Usuário autenticado - mostrar Dashboard
        <DashboardScreen 
          userEmail={user.email} 
          userId={user.uid}
        />
      ) : (
        // Usuário não autenticado - mostrar Login ou Registro
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
