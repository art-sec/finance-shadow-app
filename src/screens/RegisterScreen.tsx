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
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { acceptInvite } from '../contexts/WorkspaceContext';
import { C } from '../theme';

type Props = {
  onBackToLogin: () => void;
  prefillInviteCode?: string;
};

const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': 'Email já está em uso.',
  'auth/invalid-email':        'Email inválido.',
  'auth/weak-password':        'Senha fraca. Use ao menos 6 caracteres.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
};

export default function RegisterScreen({ onBackToLogin, prefillInviteCode }: Props) {
  const [username,    setUsername]    = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [inviteCode,  setInviteCode]  = useState(prefillInviteCode ?? '');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const hasInvite = inviteCode.trim().length > 0;

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos.'); return;
    }
    setError(''); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: username.trim() });

      if (hasInvite) {
        // Register as a workspace member via invite
        const result = await acceptInvite(
          inviteCode.trim().toUpperCase(),
          cred.user.uid,
          email.trim(),
          username.trim(),
        );
        if (!result.success) {
          // Still created the auth account; show warning but don't block
          setError(`Conta criada, mas convite inválido: ${result.error ?? 'código não encontrado'}`);
        }
        // Don't write to /users — member data lives under workspace
      } else {
        // Register as workspace owner
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          username: username.trim(),
          email: email.trim(),
          createdAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      setError(ERROR_MAP[err?.code] ?? `Falha no cadastro. (${err?.code ?? 'erro desconhecido'})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.glowTL} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.card}>
            <View style={styles.cardAccent} />

            <View style={styles.header}>
              <View style={styles.logoMark}>
                <Text style={styles.logoText}>SO</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Criar conta</Text>
                <Text style={styles.cardSub}>
                  {hasInvite ? '🔗 Entrando via convite de equipe' : 'Junte-se ao Shadow OFM'}
                </Text>
              </View>
            </View>

            <View style={styles.form}>
              <Field label="Nome / Empresa" value={username} onChange={setUsername} placeholder="Seu nome" editable={!loading} />
              <Field label="Email" value={email} onChange={setEmail} placeholder="seu@email.com" keyboard="email-address" editable={!loading} />
              <Field label="Senha" value={password} onChange={setPassword} placeholder="Mínimo 6 caracteres" secure editable={!loading} />

              {/* Invite code field */}
              <View style={styles.inviteSection}>
                <Field
                  label="Código de convite (opcional)"
                  value={inviteCode}
                  onChange={(v: string) => setInviteCode(v.toUpperCase())}
                  placeholder="Ex: AB12CD34"
                  editable={!loading}
                />
                {hasInvite && (
                  <View style={styles.inviteHint}>
                    <Text style={styles.inviteHintText}>
                      🔗 Você entrará como membro da equipe
                    </Text>
                  </View>
                )}
              </View>

              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              <Pressable
                style={({ pressed }) => [styles.btn, loading && styles.btnDisabled, pressed && styles.btnPressed]}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.btnText}>{loading ? 'Criando conta…' : 'Criar conta'}</Text>
              </Pressable>

              <Pressable style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]} onPress={onBackToLogin}>
                <Text style={styles.linkText}>
                  Já tem conta?{'  '}
                  <Text style={styles.linkBold}>Fazer login</Text>
                </Text>
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
    <View style={fieldS.wrap}>
      <Text style={fieldS.label}>{label}</Text>
      <TextInput
        style={[fieldS.input, focused && fieldS.focused]}
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={C.text3}
        keyboardType={keyboard || 'default'}
        secureTextEntry={!!secure}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const fieldS = StyleSheet.create({
  wrap:    { gap: 6 },
  label:   { fontSize: 13, fontWeight: '600', color: C.text2, letterSpacing: 0.3 },
  input:   { height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 16, fontSize: 15, color: C.text1 },
  focused: { borderColor: C.primary, /* @ts-ignore */ boxShadow: '0 0 0 3px rgba(124,92,255,0.15)' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgBase },
  glowTL: { position: 'absolute', top: -160, left: -160, width: 480, height: 480, borderRadius: 240, backgroundColor: 'rgba(124,92,255,0.07)', /* @ts-ignore */ filter: 'blur(80px)' },
  kav:    { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  card:   { width: '100%', maxWidth: 440, backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', /* @ts-ignore */ boxShadow: '0 24px 64px rgba(0,0,0,0.40)' },
  cardAccent: { height: 3, /* @ts-ignore */ background: 'linear-gradient(90deg, #7C5CFF 0%, #4EC5FF 100%)', backgroundColor: C.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 8 },
  logoMark: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', /* @ts-ignore */ background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)', backgroundColor: C.primary },
  logoText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: C.text1, letterSpacing: -0.3 },
  cardSub:   { fontSize: 13, color: C.text2 },
  form: { paddingHorizontal: 28, paddingBottom: 28, paddingTop: 16, gap: 16 },
  inviteSection: { gap: 6 },
  inviteHint:    { backgroundColor: C.primaryBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: C.borderLt },
  inviteHintText:{ fontSize: 12, color: C.primary, fontWeight: '600' },
  errorBox: { backgroundColor: C.redBg, borderWidth: 1, borderColor: C.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  errorText: { color: C.red, fontSize: 13, fontWeight: '500' },
  btn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', /* @ts-ignore */ background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)', backgroundColor: C.primary },
  btnDisabled: { opacity: 0.55 },
  btnPressed:  { opacity: 0.85 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingVertical: 4 },
  linkText: { fontSize: 14, color: C.text2 },
  linkBold: { color: C.primary, fontWeight: '700' },
});
