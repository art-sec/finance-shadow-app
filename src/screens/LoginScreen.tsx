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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';

type Props = {
  onRegister: () => void;
};

export default function LoginScreen({ onRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />

      <Animated.View
        style={[
          styles.card,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>Finance Ops</Text>
        <Text style={styles.subtitle}>Acesse o painel da operacao</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#8A9099"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Senha"
          placeholderTextColor="#8A9099"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed ? styles.buttonPressed : null,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#F4F2FF" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>

        <Pressable style={styles.link} onPress={onRegister}>
          <Text style={styles.linkText}>Criar conta</Text>
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
