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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { SimpleButton, SimpleInput } from '../components';

type Props = {
  onBackToLogin: () => void;
};

export default function RegisterScreen({ onBackToLogin }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getRegisterErrorMessage = (err: unknown) => {
    const code =
      typeof err === 'object' && err ? (err as { code?: string }).code : undefined;

    switch (code) {
      case 'auth/email-already-in-use':
        return 'Email já está em uso.';
      case 'auth/invalid-email':
        return 'Email inválido.';
      case 'auth/weak-password':
        return 'Senha fraca. Use ao menos 6 caracteres.';
      case 'auth/operation-not-allowed':
        return 'Habilite login por email/senha no Firebase.';
      case 'auth/network-request-failed':
        return 'Sem conexão. Verifique sua internet.';
      case 'auth/invalid-api-key':
      case 'auth/app-not-authorized':
      case 'auth/invalid-credential':
        return 'Firebase não configurado. Revise as credenciais.';
      case 'permission-denied':
        return 'Firestore sem permissão. Ajuste as regras de users/{uid}.';
      case 'unavailable':
        return 'Firestore indisponível no momento. Tente novamente.';
      default:
        return code
          ? `Falha no cadastro. Código: ${code}`
          : 'Falha no cadastro. Verifique os dados e tente novamente.';
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      setError('Preencha usuário, email e senha.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      await updateProfile(credential.user, {
        displayName: username.trim(),
      });

      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        username: username.trim(),
        email: email.trim(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      setError(getRegisterErrorMessage(err));
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
            {/* Título */}
            <Text style={styles.title}>👤 Criar Conta</Text>
            <Text style={styles.subtitle}>Cadastre-se no sistema</Text>

            {/* Formulário */}
            <View style={styles.form}>
              <SimpleInput
                label="Usuário"
                placeholder="Seu nome"
                value={username}
                onChangeText={setUsername}
                editable={!loading}
              />

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
                label={loading ? "Cadastrando..." : "✓ Cadastrar"}
                onPress={handleRegister}
                disabled={loading}
                loading={loading}
                size="large"
              />

              <Pressable
                style={({ pressed }) => [styles.loginLink, pressed && styles.loginLinkPressed]}
                onPress={onBackToLogin}
                disabled={loading}
              >
                <Text style={styles.loginLinkText}>
                  Já tem conta? <Text style={styles.loginLinkBold}>Fazer login</Text>
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
  loginLink: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  loginLinkPressed: {
    opacity: 0.7,
  },
  loginLinkText: {
    color: '#A9ACD9',
    fontSize: 14,
  },
  loginLinkBold: {
    color: '#7C5CFF',
    fontWeight: '700',
  },
});
