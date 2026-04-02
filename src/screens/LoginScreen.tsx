import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { SimpleButton, SimpleInput } from '../components';

type Props = {
  onRegister: () => void;
};

export default function LoginScreen({ onRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError('Falha no login. Verifique email e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Logo/Título */}
            <Text style={styles.title}>💰 Shadow Finance</Text>
            <Text style={styles.subtitle}>Painel de Finanças</Text>

            {/* Formulário */}
            <View style={styles.form}>
              <SimpleInput
                label="Email"
                placeholder="seu@email.com"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />

              <SimpleInput
                label="Senha"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <SimpleButton
                label={loading ? "Entrando..." : "🔓 Entrar"}
                onPress={handleLogin}
                disabled={loading}
                loading={loading}
                size="large"
              />

              <Pressable
                style={({ pressed }) => [ styles.registerLink, pressed && styles.registerLinkPressed ]}
                onPress={onRegister}
                disabled={loading}
              >
                <Text style={styles.registerLinkText}>
                  Não tem conta? <Text style={styles.registerLinkBold}>Criar agora</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0B1A',
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#141732',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  title: {
    fontSize: 32,
    color: '#F4F2FF',
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#A9ACD9',
    marginBottom: 24,
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  error: {
    backgroundColor: '#3D1A2D',
    color: '#FF9BC2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#FF9BC2',
  },
  registerLink: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerLinkPressed: {
    opacity: 0.7,
  },
  registerLinkText: {
    color: '#A9ACD9',
    fontSize: 14,
  },
  registerLinkBold: {
    color: '#7C5CFF',
    fontWeight: '700',
  },
});
