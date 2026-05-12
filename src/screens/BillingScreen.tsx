import React, { useEffect, useMemo, useState } from 'react';
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
import { LineChart } from '../components';
import SectionBlock from '../components/SectionBlock';
import MetricCard   from '../components/MetricCard';
import { C } from '../theme';

type DailyExpense = {
  date: string;
  receivedAmount: number;
  employeeCost:   number;
  adsCost:        number;
  adsReturn:      number;
  notes?:         string;
};

type Subscription = {
  id:           string;
  name:         string;
  cost:         number;
  category:     string;
  createdAt?:   any;
  storagePath?: 'monthly' | 'legacy';
};

type Props = { selectedMonth?: string; userId?: string | null };

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

export default function BillingScreen({ selectedMonth = 'Jan', userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  const [expenses,      setExpenses]      = useState<DailyExpense[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [dailyMsg,      setDailyMsg]      = useState('');
  const [dailyMsgType,  setDailyMsgType]  = useState<'ok'|'err'>('ok');
  const [subMsg,        setSubMsg]        = useState('');
  const [subMsgType,    setSubMsgType]    = useState<'ok'|'err'>('ok');
  const [loadErr,       setLoadErr]       = useState('');
  const [reload,        setReload]        = useState(0);

  // Daily form
  const [day,      setDay]      = useState('01');
  const [received, setReceived] = useState('');
  const [empCost,  setEmpCost]  = useState('');
  const [adsCost,  setAdsCost]  = useState('');
  const [adsRet,   setAdsRet]   = useState('');
  const [notes,    setNotes]    = useState('');
  const [saving,   setSaving]   = useState(false);

  // Subscription form
  const [subName, setSubName]   = useState('');
  const [subCost, setSubCost]   = useState('');
  const [subCat,  setSubCat]    = useState('software');
  const [savingSub, setSavingSub] = useState(false);

  useEffect(() => {
    if (!userId || !selectedMonth) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setLoadErr('');
      try {
        const [dailySnap, subSnap] = await Promise.all([
          getDocs(collection(db, 'users', userId, 'billing', selectedMonth, 'daily')),
          getDocs(collection(db, 'users', userId, 'billing', selectedMonth, 'subscriptions')),
        ]);
        if (!mounted) return;

        setExpenses(
          dailySnap.docs
            .map(d => ({ date: d.id, ...d.data() } as DailyExpense))
            .sort((a, b) => parseInt(a.date) - parseInt(b.date))
        );

        if (!subSnap.empty) {
          setSubscriptions(subSnap.docs.map(d => ({ id: d.id, ...d.data(), storagePath: 'monthly' } as Subscription)));
        } else {
          const legacySnap = await getDocs(collection(db, 'users', userId, 'subscriptions'));
          setSubscriptions(legacySnap.docs.map(d => ({ id: d.id, ...d.data(), storagePath: 'legacy' } as Subscription)));
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied') setLoadErr('Sem permissão para ler dados de billing.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [userId, selectedMonth, reload]);

  const totals = useMemo(() => {
    const r  = expenses.reduce((s, e) => s + (e.receivedAmount || 0), 0);
    const ec = expenses.reduce((s, e) => s + (e.employeeCost  || 0), 0);
    const ac = expenses.reduce((s, e) => s + (e.adsCost       || 0), 0);
    const ar = expenses.reduce((s, e) => s + (e.adsReturn     || 0), 0);
    const sc = subscriptions.reduce((s, sub) => s + (sub.cost || 0), 0);
    const tc = ec + ac + sc;
    const np = r - tc;
    return {
      revenue: r, empCost: ec, adsCost: ac, adsReturn: ar,
      subCost: sc, totalCost: tc, netProfit: np,
      empPct:  r > 0 ? (ec / r) * 100 : 0,
      profPct: r > 0 ? (np / r) * 100 : 0,
      roas:    ac > 0 ? ar / ac : 0,
    };
  }, [expenses, subscriptions]);

  const flashDaily = (msg: string, type: 'ok'|'err') => {
    setDailyMsgType(type); setDailyMsg(msg);
    setTimeout(() => setDailyMsg(''), 3000);
  };

  const flashSub = (msg: string, type: 'ok'|'err') => {
    setSubMsgType(type); setSubMsg(msg);
    setTimeout(() => setSubMsg(''), 3000);
  };

  const handleAddDaily = async () => {
    if (!userId) return;
    const dayNum = parseInt(day);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) { flashDaily('Dia inválido (01-31).', 'err'); return; }
    const exp: DailyExpense = {
      date:           String(dayNum).padStart(2, '0'),
      receivedAmount: Number(received) || 0,
      employeeCost:   Number(empCost)  || 0,
      adsCost:        Number(adsCost)  || 0,
      adsReturn:      Number(adsRet)   || 0,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', userId, 'billing', selectedMonth, 'daily', exp.date), { ...exp, updatedAt: serverTimestamp() }, { merge: true });
      setDay('01'); setReceived(''); setEmpCost(''); setAdsCost(''); setAdsRet(''); setNotes('');
      flashDaily('Gasto registrado.', 'ok');
      setTimeout(() => setReload(r => r + 1), 800);
    } catch (err: any) { flashDaily(err.message, 'err'); }
    finally { setSaving(false); }
  };

  const handleDeleteDaily = async (date: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'billing', selectedMonth, 'daily', date));
      flashDaily('Gasto removido.', 'ok');
      setTimeout(() => setReload(r => r + 1), 800);
    } catch (err: any) { flashDaily(err.message, 'err'); }
  };

  const handleAddSub = async () => {
    if (!userId) return;
    if (!subName.trim()) { flashSub('Nome da assinatura é obrigatório.', 'err'); return; }
    if (!Number(subCost) || Number(subCost) <= 0) { flashSub('Custo deve ser maior que zero.', 'err'); return; }
    setSavingSub(true);
    try {
      const id = String(Date.now());
      await setDoc(doc(db, 'users', userId, 'billing', selectedMonth, 'subscriptions', id), {
        name: subName.trim(), cost: Number(subCost), category: subCat, createdAt: serverTimestamp(),
      });
      setSubName(''); setSubCost(''); setSubCat('software');
      flashSub('Assinatura adicionada.', 'ok');
      setTimeout(() => setReload(r => r + 1), 800);
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
      flashSub('Assinatura removida.', 'ok');
      setTimeout(() => setReload(r => r + 1), 800);
    } catch (err: any) { flashSub(err.message, 'err'); }
  };

  const metrics = [
    { label: 'Faturamento',    value: fmt(totals.revenue),   icon: '💰', color: C.primary },
    { label: 'Lucro Líquido',  value: fmt(totals.netProfit), icon: '📈', color: totals.netProfit >= 0 ? C.green : C.red },
    { label: '% Lucro',        value: `${totals.profPct.toFixed(1)}%`, icon: '🎯', color: C.cyan },
    { label: 'Custo Total',    value: fmt(totals.totalCost), icon: '💸', color: C.red },
    { label: 'Assinaturas',    value: fmt(totals.subCost),   icon: '🔄', color: C.amber },
    { label: 'ROAS',           value: `${totals.roas.toFixed(2)}x`, icon: '📢', color: C.violet },
  ];

  const receivedSeries = expenses.map(e => ({ label: `D${e.date}`, value: e.receivedAmount || 0 }));
  const expenseSeries  = expenses.map(e => ({ label: `D${e.date}`, value: (e.employeeCost || 0) + (e.adsCost || 0) }));
  const profitSeries   = expenses.map(e => ({ label: `D${e.date}`, value: (e.receivedAmount || 0) - ((e.employeeCost || 0) + (e.adsCost || 0)) }));

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, isWide && styles.contentWide]} keyboardShouldPersistTaps="handled">

      {/* Loading */}
      {loading && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={styles.loadingText}>Carregando dados de {selectedMonth}…</Text>
        </View>
      )}

      {/* Load error */}
      {loadErr ? (
        <View style={[styles.flash, styles.flashErr]}>
          <Text style={[styles.flashText, { color: C.red }]}>✕ {loadErr}</Text>
        </View>
      ) : null}

      {/* Metrics */}
      <SectionBlock title={`Sumário — ${selectedMonth}`} subtitle="Baseado nos gastos diários registrados">
        <View style={styles.metricsGrid}>
          {metrics.map((m, i) => <MetricCard key={i} {...m} />)}
        </View>
      </SectionBlock>

      {/* Charts */}
      {expenses.length > 0 && (
        <SectionBlock title="Tendências Diárias" subtitle="Evolução ao longo do mês" noPad>
          <View style={[styles.chartsGrid, isWide && styles.chartsGridWide]}>
            {[
              { title: 'Faturamento Diário', points: receivedSeries, color: C.primary },
              { title: 'Gastos Diários',     points: expenseSeries,  color: C.red     },
              { title: 'Lucro Diário',       points: profitSeries,   color: C.green   },
            ].map((c, i) => (
              <View key={i} style={[styles.chartCell, isWide && styles.chartCellWide]}>
                <LineChart {...c} />
              </View>
            ))}
          </View>
        </SectionBlock>
      )}

      {/* Daily expense form */}
      <SectionBlock title="Registrar Gasto Diário" subtitle="Dados do dia específico">
        <View style={[styles.formGrid, isWide && styles.formGridWide]}>
          <BField label="Dia (01-31)"            value={day}      onChange={setDay}      placeholder="01" numeric />
          <BField label="Faturamento"             value={received} onChange={setReceived} placeholder="0"  numeric prefix="R$" />
          <BField label="Custo Funcionários"      value={empCost}  onChange={setEmpCost}  placeholder="0"  numeric prefix="R$" />
          <BField label="Custo Anúncios"          value={adsCost}  onChange={setAdsCost}  placeholder="0"  numeric prefix="R$" />
          <BField label="Retorno dos Anúncios"    value={adsRet}   onChange={setAdsRet}   placeholder="0"  numeric prefix="R$" />
          <BField label="Observações (opcional)"  value={notes}    onChange={setNotes}    placeholder="Ex: promoção"  />
        </View>
        {dailyMsg ? (
          <View style={[styles.flash, dailyMsgType === 'ok' ? styles.flashOk : styles.flashErr, styles.flashInline]}>
            <Text style={[styles.flashText, { color: dailyMsgType === 'ok' ? C.green : C.red }]}>
              {dailyMsgType === 'ok' ? '✓ ' : '✕ '}{dailyMsg}
            </Text>
          </View>
        ) : null}
        <Pressable style={({ pressed }) => [styles.btn, saving && styles.btnDisabled, pressed && { opacity: 0.85 }]} onPress={handleAddDaily} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>+ Registrar dia</Text>}
        </Pressable>
      </SectionBlock>

      {/* Daily list */}
      {expenses.length > 0 && (
        <SectionBlock title={`Gastos Registrados (${expenses.length})`} noPad>
          {expenses.map((exp, i) => (
            <View key={exp.date} style={[styles.listRow, i < expenses.length - 1 && styles.listSep]}>
              <View style={styles.listDayBadge}>
                <Text style={styles.listDayText}>{exp.date}</Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{fmt(exp.receivedAmount)}</Text>
                <Text style={styles.listSub}>
                  👥 {fmt(exp.employeeCost)}  ·  📢 {fmt(exp.adsCost)}
                  {exp.notes ? `  ·  ${exp.notes}` : ''}
                </Text>
              </View>
              <Pressable style={({ pressed }) => [styles.delBtn, pressed && { opacity: 0.6 }]} onPress={() => handleDeleteDaily(exp.date)}>
                <Text style={styles.delBtnText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </SectionBlock>
      )}

      {/* Subscription form */}
      <SectionBlock title="Assinaturas Mensais" subtitle="Custos fixos recorrentes">
        <View style={[styles.formGrid, isWide && styles.formGridWide]}>
          <BField label="Nome" value={subName} onChange={setSubName} placeholder="Ex: Adobe, Shopify" />
          <BField label="Custo Mensal" value={subCost} onChange={setSubCost} placeholder="0" numeric prefix="R$" />
          <BField label="Categoria" value={subCat} onChange={setSubCat} placeholder="software" />
        </View>
        {subMsg ? (
          <View style={[styles.flash, subMsgType === 'ok' ? styles.flashOk : styles.flashErr, styles.flashInline]}>
            <Text style={[styles.flashText, { color: subMsgType === 'ok' ? C.green : C.red }]}>
              {subMsgType === 'ok' ? '✓ ' : '✕ '}{subMsg}
            </Text>
          </View>
        ) : null}
        <Pressable style={({ pressed }) => [styles.btn, savingSub && styles.btnDisabled, pressed && { opacity: 0.85 }]} onPress={handleAddSub} disabled={savingSub}>
          {savingSub ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnText}>+ Adicionar assinatura</Text>}
        </Pressable>
      </SectionBlock>

      {/* Subscription list */}
      {subscriptions.length > 0 && (
        <SectionBlock title={`Assinaturas Ativas (${subscriptions.length})`} noPad>
          {subscriptions.map((sub, i) => (
            <View key={sub.id} style={[styles.listRow, i < subscriptions.length - 1 && styles.listSep]}>
              <View style={[styles.listDayBadge, { backgroundColor: C.violetBg }]}>
                <Text style={[styles.listDayText, { color: C.violet }]}>🔄</Text>
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{sub.name}</Text>
                <Text style={styles.listSub}>{sub.category}</Text>
              </View>
              <Text style={[styles.listTitle, { color: C.red, marginRight: 12 }]}>{fmt(sub.cost)}</Text>
              <Pressable style={({ pressed }) => [styles.delBtn, pressed && { opacity: 0.6 }]} onPress={() => handleDeleteSub(sub.id)}>
                <Text style={styles.delBtnText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </SectionBlock>
      )}

    </ScrollView>
  );
}

function BField({ label, value, onChange, placeholder, numeric, prefix }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={bfS.wrap}>
      <Text style={bfS.label}>{label}</Text>
      <View style={[bfS.row, focused && bfS.focused]}>
        {prefix ? <Text style={bfS.prefix}>{prefix}</Text> : null}
        <TextInput
          style={bfS.input}
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

const bfS = StyleSheet.create({
  wrap:    { flex: 1, minWidth: '45%', gap: 6 },
  label:   { fontSize: 12, fontWeight: '600', color: C.text2, letterSpacing: 0.3 },
  row:     { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 12, gap: 6 },
  focused: { borderColor: C.primary, /* @ts-ignore */ boxShadow: '0 0 0 3px rgba(124,92,255,0.12)' },
  prefix:  { fontSize: 13, color: C.text3, fontWeight: '600' },
  input:   { flex: 1, fontSize: 15, color: C.text1 },
});

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: C.bgBase },
  content: { padding: 16, gap: 16, paddingBottom: 48, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  contentWide: { paddingHorizontal: 24 },

  loadingBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bgCard, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 10 },
  loadingText: { fontSize: 13, color: C.text2 },

  flash:       { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  flashInline: { marginBottom: 12 },
  flashOk:  { backgroundColor: C.greenBg, borderColor: C.green },
  flashErr: { backgroundColor: C.redBg,   borderColor: C.red   },
  flashText: { fontSize: 13, fontWeight: '600' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  chartsGrid:     { gap: 0 },
  chartsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  chartCell:      { borderBottomWidth: 1, borderBottomColor: C.border },
  chartCellWide:  { width: '33.33%', borderRightWidth: 1, borderRightColor: C.border, borderBottomWidth: 0 },

  formGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  formGridWide: {},

  btn: {
    height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  btnDisabled: { opacity: 0.55 },
  btnText:     { color: '#fff', fontSize: 14, fontWeight: '700' },

  listRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  listSep:     { borderBottomWidth: 1, borderBottomColor: C.border },
  listDayBadge:{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.primaryBg, alignItems: 'center', justifyContent: 'center' },
  listDayText: { fontSize: 13, fontWeight: '700', color: C.primary },
  listBody:    { flex: 1 },
  listTitle:   { fontSize: 14, fontWeight: '700', color: C.text1, marginBottom: 2 },
  listSub:     { fontSize: 12, color: C.text2 },
  delBtn:      { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  delBtnText:  { fontSize: 11, color: C.text3, fontWeight: '700' },
});
