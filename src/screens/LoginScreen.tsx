import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { C } from '../theme';

type Props = { onRegister: () => void };

export default function LoginScreen({ onRegister }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Preencha email e senha.'); return; }
    setError(''); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch {
      setError('Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Ambient glow */}
      <View style={styles.glowTL} pointerEvents="none" />
      <View style={styles.glowBR} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Brand panel ── */}
          <View style={[styles.brandPanel, isWide && styles.brandPanelWide]}>
            <View style={styles.logoMark}>
              <Text style={styles.logoText}>SO</Text>
            </View>
            <Text style={styles.brandName}>Shadow OFM</Text>
            <Text style={styles.brandTagline}>
              O hub operacional completo{'\n'}para sua agência OFM.
            </Text>

            {isWide && (
              <View style={styles.brandStats}>
                {[
                  { label: 'Gestão de modelos e contas', icon: '👤' },
                  { label: 'Controle de equipe e VAs', icon: '👥' },
                  { label: 'Financeiro integrado em nuvem', icon: '☁️' },
                ].map((item, i) => (
                  <View key={i} style={styles.brandStat}>
                    <Text style={styles.brandStatIcon}>{item.icon}</Text>
                    <Text style={styles.brandStatLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Form card ── */}
          <View style={[styles.card, isWide && styles.cardWide]}>
            {/* Gradient top accent */}
            <View style={styles.cardAccent} />

            <Text style={styles.cardTitle}>Bem-vindo de volta</Text>
            <Text style={styles.cardSub}>Entre na sua conta para continuar</Text>

            <View style={styles.form}>
              <Field label="Email" value={email} onChange={setEmail}
                placeholder="seu@email.com" keyboard="email-address" editable={!loading} />
              <Field label="Senha" value={password} onChange={setPassword}
                placeholder="••••••••" secure editable={!loading} />

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <Pressable
                style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && styles.btnPressed]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.btnText}>{loading ? 'Entrando…' : 'Entrar'}</Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable style={({ pressed }) => [styles.outlineBtn, pressed && styles.outlineBtnPressed]} onPress={onRegister}>
                <Text style={styles.outlineBtnText}>Criar uma conta gratuita</Text>
              </Pressable>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboard, secure, editable = true }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, focused && fieldStyles.inputFocused]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.text3}
        keyboardType={keyboard || 'default'}
        secureTextEntry={!!secure}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: C.text2, letterSpacing: 0.3 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgInput,
    paddingHorizontal: 16,
    fontSize: 15,
    color: C.text1,
  },
  inputFocused: {
    borderColor: C.primary,
    // @ts-ignore
    boxShadow: `0 0 0 3px rgba(124,92,255,0.15)`,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgBase },
  glowTL: {
    position: 'absolute', top: -160, left: -160,
    width: 480, height: 480, borderRadius: 240,
    backgroundColor: 'rgba(124,92,255,0.07)',
    // @ts-ignore
    filter: 'blur(80px)',
  },
  glowBR: {
    position: 'absolute', bottom: -120, right: -120,
    width: 360, height: 360, borderRadius: 180,
    backgroundColor: 'rgba(78,197,255,0.05)',
    // @ts-ignore
    filter: 'blur(70px)',
  },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    gap: 32,
  },
  scrollWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 64 },

  // Brand
  brandPanel: { alignItems: 'center', maxWidth: 340 },
  brandPanelWide: { alignItems: 'flex-start', flex: 1 },
  logoMark: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  logoText: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  brandName: { fontSize: 28, fontWeight: '800', color: C.text1, letterSpacing: -0.5, marginBottom: 8 },
  brandTagline: { fontSize: 16, color: C.text2, lineHeight: 24, marginBottom: 32 },
  brandStats: { gap: 16 },
  brandStat: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandStatIcon: { fontSize: 18 },
  brandStatLabel: { fontSize: 14, color: C.text2, fontWeight: '500' },

  // Card
  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: C.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    // @ts-ignore
    boxShadow: '0 24px 64px rgba(0,0,0,0.40)',
  },
  cardWide: { flex: 1, maxWidth: 460 },
  cardAccent: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #7C5CFF 0%, #4EC5FF 100%)',
    backgroundColor: C.primary,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: C.text1, paddingHorizontal: 28, paddingTop: 28, marginBottom: 4, letterSpacing: -0.3 },
  cardSub:   { fontSize: 14, color: C.text2, paddingHorizontal: 28, marginBottom: 24 },

  form: { paddingHorizontal: 28, paddingBottom: 28, gap: 16 },

  errorBox: {
    backgroundColor: C.redBg,
    borderWidth: 1, borderColor: C.red,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { color: C.red, fontSize: 13, fontWeight: '500' },

  btn: {
    height: 50, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  btnDisabled: { opacity: 0.55 },
  btnPressed:  { opacity: 0.85 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.text3, fontWeight: '500' },

  outlineBtn: {
    height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: C.borderLt,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnPressed: { backgroundColor: C.bgElevated },
  outlineBtnText: { color: C.text2, fontSize: 15, fontWeight: '600' },
});
