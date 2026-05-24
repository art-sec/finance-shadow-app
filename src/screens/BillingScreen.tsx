import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { collection, doc, getDocs, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import SectionBlock from '../components/SectionBlock';
import { C } from '../theme';

type Subscription = {
  id:           string;
  name:         string;
  cost:         number;
  category:     string;
  storagePath?: 'monthly' | 'legacy';
};

type Props = { selectedMonth?: string; userId?: string | null; onDataChanged?: () => void };

const CATEGORIES = ['software', 'marketing', 'infra', 'ferramentas', 'outro'];

const CAT_ICONS: Record<string, string> = {
  software: '💻', marketing: '📢', infra: '🔧', ferramentas: '🛠️', outro: '📦',
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export default function BillingScreen({ selectedMonth = 'Jan', userId, onDataChanged }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [subMsg,        setSubMsg]        = useState('');
  const [subMsgType,    setSubMsgType]    = useState<'ok' | 'err'>('ok');
  const [loadErr,       setLoadErr]       = useState('');

  const [subName,    setSubName]    = useState('');
  const [subCost,    setSubCost]    = useState('');
  const [subCat,     setSubCat]     = useState('software');
  const [savingSub,  setSavingSub]  = useState(false);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    setLoading(true);
    setLoadErr('');
    const load = async () => {
      try {
        const monthSnap = await getDocs(collection(db, 'users', userId, 'billing', selectedMonth, 'subscriptions'));
        if (!mounted) return;
        if (!monthSnap.empty) {
          setSubscriptions(monthSnap.docs.map(d => ({ id: d.id, ...d.data(), storagePath: 'monthly' } as Subscription)));
        } else {
          const legacySnap = await getDocs(collection(db, 'users', userId, 'subscriptions'));
          setSubscriptions(legacySnap.docs.map(d => ({ id: d.id, ...d.data(), storagePath: 'legacy' } as Subscription)));
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied') setLoadErr('Sem permissão para ler assinaturas.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [userId, selectedMonth]);

  const totalSub = subscriptions.reduce((s, sub) => s + (sub.cost || 0), 0);

  const flashSub = (msg: string, type: 'ok' | 'err') => {
    setSubMsgType(type); setSubMsg(msg);
    setTimeout(() => setSubMsg(''), 3000);
  };

  const handleAddSub = async () => {
    if (!userId) return;
    if (!subName.trim())                           { flashSub('Nome é obrigatório.', 'err'); return; }
    if (!Number(subCost) || Number(subCost) <= 0) { flashSub('Custo deve ser maior que zero.', 'err'); return; }
    setSavingSub(true);
    try {
      const id = String(Date.now());
      await setDoc(doc(db, 'users', userId, 'billing', selectedMonth, 'subscriptions', id), {
        name: subName.trim(), cost: Number(subCost), category: subCat, createdAt: serverTimestamp(),
      });
      setSubscriptions(prev => [...prev, { id, name: subName.trim(), cost: Number(subCost), category: subCat, storagePath: 'monthly' }]);
      setSubName(''); setSubCost(''); setSubCat('software');
      flashSub('Assinatura adicionada.', 'ok');
      onDataChanged?.();
    } catch (err: any) { flashSub(err.message, 'err'); }
    finally { setSavingSub(false); }
  };

  const handleDeleteSub = async (subId: string) => {
    if (!userId) return;
    const sub = subscriptions.find(s => s.id === subId);
    const path = sub?.storagePath === 'legacy'
      ? doc(db, 'users', userId, 'subscriptions', subId)
      : doc(db, 'users', userId, 'billing', selectedMonth, 'subscriptions', subId);
    try {
      await deleteDoc(path);
      setSubscriptions(prev => prev.filter(s => s.id !== subId));
      onDataChanged?.();
    } catch (err: any) { flashSub(err.message, 'err'); }
  };

  const byCategory = CATEGORIES.filter(cat => subscriptions.some(s => s.category === cat));

  return (
    <ScrollView style={s.root} contentContainerStyle={[s.content, isWide && s.contentWide]} keyboardShouldPersistTaps="handled">

      {loading && (
        <View style={s.loadingBar}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={s.loadingText}>Carregando assinaturas…</Text>
        </View>
      )}

      {loadErr ? (
        <View style={[s.flash, s.flashErr]}>
          <Text style={[s.flashText, { color: C.red }]}>✕ {loadErr}</Text>
        </View>
      ) : null}

      {/* Header card */}
      <View style={s.headerCard}>
        <View style={s.headerAccent} />
        <View style={s.headerBody}>
          <View>
            <Text style={s.headerTitle}>🔄 Assinaturas Mensais</Text>
            <Text style={s.headerSub}>{subscriptions.length} ativas · Custo fixo recorrente</Text>
          </View>
          <View style={s.totalBadge}>
            <Text style={s.totalLabel}>Total/mês</Text>
            <Text style={s.totalValue}>{fmt(totalSub)}</Text>
          </View>
        </View>
      </View>

      {/* Subscription list grouped by category */}
      {subscriptions.length > 0 && (
        <SectionBlock title={`Assinaturas (${subscriptions.length})`} noPad>
          {byCategory.map(cat => {
            const catSubs = subscriptions.filter(s => s.category === cat);
            const catTotal = catSubs.reduce((s, sub) => s + sub.cost, 0);
            return (
              <View key={cat}>
                <View style={s.catHeader}>
                  <Text style={s.catIcon}>{CAT_ICONS[cat] ?? '📦'}</Text>
                  <Text style={s.catLabel}>{cat}</Text>
                  <Text style={s.catTotal}>{fmt(catTotal)}</Text>
                </View>
                {catSubs.map((sub, i) => (
                  <View key={sub.id} style={[s.listRow, i < catSubs.length - 1 && s.listSep]}>
                    <View style={s.listBody}>
                      <Text style={s.listName}>{sub.name}</Text>
                    </View>
                    <Text style={s.listCost}>{fmt(sub.cost)}</Text>
                    <Pressable
                      style={({ pressed }) => [s.delBtn, pressed && { opacity: 0.6 }]}
                      onPress={() => handleDeleteSub(sub.id)}
                    >
                      <Text style={s.delBtnText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            );
          })}
          {/* Uncategorized */}
          {subscriptions.filter(s => !CATEGORIES.includes(s.category)).map((sub, i, arr) => (
            <View key={sub.id} style={[s.listRow, i < arr.length - 1 && s.listSep]}>
              <View style={s.listBody}>
                <Text style={s.listName}>{sub.name}</Text>
                <Text style={s.listCat}>{sub.category}</Text>
              </View>
              <Text style={s.listCost}>{fmt(sub.cost)}</Text>
              <Pressable style={({ pressed }) => [s.delBtn, pressed && { opacity: 0.6 }]} onPress={() => handleDeleteSub(sub.id)}>
                <Text style={s.delBtnText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </SectionBlock>
      )}

      {/* Add subscription form */}
      <SectionBlock title="Adicionar Assinatura" subtitle="Ferramentas, software e serviços recorrentes">
        <View style={[s.formGrid, isWide && s.formGridWide]}>
          <BField label="Nome *"         value={subName} onChange={setSubName} placeholder="Ex: Adobe, Shopify, Notion" />
          <BField label="Custo Mensal *" value={subCost} onChange={setSubCost} placeholder="0" numeric prefix="R$" />
        </View>

        <Text style={s.catPickLabel}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
          <View style={s.catRow}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                style={[s.catChip, subCat === cat && s.catChipActive]}
                onPress={() => setSubCat(cat)}
              >
                <Text style={s.catChipIcon}>{CAT_ICONS[cat]}</Text>
                <Text style={[s.catChipText, subCat === cat && s.catChipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {subMsg ? (
          <View style={[s.flash, subMsgType === 'ok' ? s.flashOk : s.flashErr, { marginBottom: 12 }]}>
            <Text style={[s.flashText, { color: subMsgType === 'ok' ? C.green : C.red }]}>
              {subMsgType === 'ok' ? '✓ ' : '✕ '}{subMsg}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [s.btn, savingSub && s.btnDisabled, pressed && { opacity: 0.85 }]}
          onPress={handleAddSub}
          disabled={savingSub}
        >
          {savingSub
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.btnText}>+ Adicionar assinatura</Text>
          }
        </Pressable>
      </SectionBlock>

    </ScrollView>
  );
}

type BFProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; numeric?: boolean; prefix?: string };

function BField({ label, value, onChange, placeholder, numeric, prefix }: BFProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={bf.wrap}>
      <Text style={bf.label}>{label}</Text>
      <View style={[bf.row, focused && bf.focused]}>
        {prefix ? <Text style={bf.prefix}>{prefix}</Text> : null}
        <TextInput
          style={bf.input}
          value={value}
          onChangeText={v => onChange(numeric ? v.replace(/[^0-9]/g, '') : v)}
          placeholder={placeholder}
          placeholderTextColor={C.text3}
          keyboardType={numeric ? 'numeric' : 'default'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

const bf = StyleSheet.create({
  wrap:   { flex: 1, minWidth: '45%', gap: 6 },
  label:  { fontSize: 12, fontWeight: '600', color: C.text2, letterSpacing: 0.3 },
  row:    { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 12, gap: 6 },
  focused: {
    borderColor: C.primary,
    // @ts-ignore
    boxShadow: '0 0 0 3px rgba(124,92,255,0.12)',
  },
  prefix: { fontSize: 13, color: C.text3, fontWeight: '600' },
  input:  { flex: 1, fontSize: 15, color: C.text1 },
});

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bgBase },
  content:     { padding: 16, gap: 16, paddingBottom: 48, maxWidth: 900, width: '100%', alignSelf: 'center' },
  contentWide: { paddingHorizontal: 24 },

  loadingBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bgCard, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 10 },
  loadingText: { fontSize: 13, color: C.text2 },

  flash:    { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  flashOk:  { backgroundColor: C.greenBg, borderColor: C.green },
  flashErr: { backgroundColor: C.redBg,   borderColor: C.red   },
  flashText:{ fontSize: 13, fontWeight: '600' },

  headerCard:  { backgroundColor: C.bgCard, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  headerAccent: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #7C5CFF 0%, #4EC5FF 100%)',
    backgroundColor: C.primary,
  },
  headerBody:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.text1 },
  headerSub:   { fontSize: 12, color: C.text2, marginTop: 3 },
  totalBadge:  { alignItems: 'flex-end' },
  totalLabel:  { fontSize: 11, color: C.text3, fontWeight: '600' },
  totalValue:  { fontSize: 22, fontWeight: '800', color: C.violet },

  catHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.bgElevated, gap: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  catIcon:   { fontSize: 14 },
  catLabel:  { flex: 1, fontSize: 11, fontWeight: '800', color: C.text3, letterSpacing: 0.8, textTransform: 'uppercase' },
  catTotal:  { fontSize: 13, fontWeight: '700', color: C.text2 },

  listRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  listSep:   { borderBottomWidth: 1, borderBottomColor: C.border },
  listBody:  { flex: 1 },
  listName:  { fontSize: 14, fontWeight: '600', color: C.text1 },
  listCat:   { fontSize: 11, color: C.text3 },
  listCost:  { fontSize: 14, fontWeight: '700', color: C.red },
  delBtn:    { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  delBtnText:{ fontSize: 11, color: C.text3, fontWeight: '700' },

  formGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  formGridWide:{},

  catPickLabel: { fontSize: 11, fontWeight: '700', color: C.text2, letterSpacing: 0.3, marginBottom: 8 },
  catScroll:    { flexGrow: 0, marginBottom: 16 },
  catRow:       { flexDirection: 'row', gap: 8, alignItems: 'center' },
  catChip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput },
  catChipActive:{ backgroundColor: C.primaryBg, borderColor: C.primary },
  catChipIcon:  { fontSize: 14 },
  catChipText:  { fontSize: 12, fontWeight: '600', color: C.text2 },
  catChipTextActive: { color: C.primary },

  btn: {
    height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  btnDisabled: { opacity: 0.55 },
  btnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },
});
