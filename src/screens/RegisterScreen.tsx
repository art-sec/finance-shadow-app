import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

type Props = {
  onBackToLogin: () => void;
};

export default function RegisterScreen({ onBackToLogin }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const getRegisterErrorMessage = (err: unknown) => {
    const code =
      typeof err === 'object' && err ? (err as { code?: string }).code : undefined;

    switch (code) {
      case 'auth/email-already-in-use':
        return 'Email ja esta em uso.';
      case 'auth/invalid-email':
        return 'Email invalido.';
      case 'auth/weak-password':
        return 'Senha fraca. Use ao menos 6 caracteres.';
      case 'auth/operation-not-allowed':
        return 'Habilite login por email/senha no Firebase.';
      case 'auth/network-request-failed':
        return 'Sem conexao. Verifique sua internet.';
      case 'auth/invalid-api-key':
      case 'auth/app-not-authorized':
      case 'auth/invalid-credential':
        return 'Firebase nao configurado. Revise as credenciais.';
      case 'permission-denied':
        return 'Firestore sem permissao. Ajuste as regras de users/{uid}.';
      case 'unavailable':
        return 'Firestore indisponivel no momento. Tente novamente.';
      default:
        return code
          ? `Falha no cadastro. Codigo: ${code}`
          : 'Falha no cadastro. Verifique os dados e tente novamente.';
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      setError('Preencha usuario, email e senha.');
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
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />

      <Animated.View
        style={[
          styles.card,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Cadastre sua equipe no sistema</Text>

        <TextInput
          autoCapitalize="none"
          placeholder="Usuario"
          placeholderTextColor="#8A9099"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#8A9099"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Senha"
            placeholderTextColor="#8A9099"
            secureTextEntry={!showPassword}
            style={[styles.input, styles.inputFlex]}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            style={styles.toggle}
            onPress={() => setShowPassword((prev) => !prev)}
          >
            <Text style={styles.toggleText}>
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed ? styles.buttonPressed : null,
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#F4F2FF" />
          ) : (
            <Text style={styles.buttonText}>Cadastrar</Text>
          )}
        </Pressable>

        <Pressable style={styles.link} onPress={onBackToLogin}>
          <Text style={styles.linkText}>Ja tenho conta</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0B0B1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bgBlobTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#2C2F7A',
    top: -60,
    left: -40,
    opacity: 0.6,
  },
  bgBlobBottom: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4C1D95',
    bottom: -120,
    right: -60,
    opacity: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#141732',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  title: {
    fontSize: 28,
    color: '#F4F2FF',
    fontFamily: 'Avenir Next',
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#C7C9E6',
    marginBottom: 20,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#0E1026',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B2F63',
    padding: 14,
    color: '#F4F2FF',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputFlex: {
    flex: 1,
    marginBottom: 0,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B2F63',
    backgroundColor: '#0E1026',
  },
  toggleText: {
    color: '#C7C9E6',
    fontSize: 12,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#7C5CFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#F4F2FF',
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#C7C9E6',
  },
  error: {
    color: '#FF9BC2',
    marginBottom: 8,
  },
});
