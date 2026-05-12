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
import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { LineChart } from '../components';
import AppNav       from '../components/AppNav';
import MetricCard   from '../components/MetricCard';
import SectionBlock from '../components/SectionBlock';
import YearSummary  from '../components/YearSummary';
import BillingScreen from './BillingScreen';
import {
  formatCurrency, formatRatio,
  calcCustoTotal, calcLucroLiquido, calcRoas,
  calcPercentualFuncionarios, calcPercentualLucro,
  validateMonthlyData,
  type MonthlyData,
} from '../utils/finance';
import { C } from '../theme';

const DATA_EMPTY: MonthlyData[] = [
  'Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'
].map(month => ({ month, faturamento: 0, anuncios: 0, funcionarios: 0, retornoAnuncios: 0 }));

const trend = (curr: number, prev: number | null): number | null =>
  prev === null || prev === 0 ? null : ((curr - prev) / prev) * 100;

type Props = { userEmail?: string | null; userId?: string | null };

export default function DashboardScreen({ userEmail, userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide    = width >= 780;

  const [selectedTab,   setSelectedTab]   = useState<'dashboard' | 'billing'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('Jan');
  const [monthlyData,   setMonthlyData]   = useState<MonthlyData[]>(DATA_EMPTY);
  const [loadingData,   setLoadingData]   = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [saveMessage,   setSaveMessage]   = useState('');
  const [saveMsgType,   setSaveMsgType]   = useState<'ok' | 'err'>('ok');
  const [formErrors,    setFormErrors]    = useState<Partial<Record<keyof MonthlyData, string>>>({});
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Form state (string inputs for currency fields)
  const [fField, setFField] = useState('');
  const [aField, setAField] = useState('');
  const [rField, setRField] = useState('');
  const [fnField, setFnField] = useState('');

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const load = async () => {
      setLoadingData(true);
      try {
        const snap = await getDocs(collection(db, 'users', userId, 'finance'));
        if (!mounted) return;
        if (snap.empty) { setMonthlyData(DATA_EMPTY); return; }
        const map = new Map(snap.docs.map(d => [d.id, d.data()]));
        setMonthlyData(prev => prev.map(item => {
          const raw = map.get(item.month) as Partial<MonthlyData> | undefined;
          if (!raw) return item;
          const n = (v: any, fb: number) => { const x = Number(v ?? fb); return Number.isFinite(x) ? x : fb; };
          return {
            ...item,
            faturamento:    n(raw.faturamento,    item.faturamento),
            anuncios:       n(raw.anuncios,        item.anuncios),
            funcionarios:   n(raw.funcionarios,    item.funcionarios),
            retornoAnuncios:n(raw.retornoAnuncios, item.retornoAnuncios),
          };
        }));
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingData(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [userId, reloadTrigger]);

  const monthIdx   = useMemo(() => monthlyData.findIndex(d => d.month === selectedMonth), [monthlyData, selectedMonth]);
  const current    = useMemo(() => monthlyData[monthIdx] ?? monthlyData[0], [monthlyData, monthIdx]);
  const previous   = useMemo(() => monthIdx > 0 ? monthlyData[monthIdx - 1] : null, [monthlyData, monthIdx]);

  // Sync form fields when month changes
  useEffect(() => {
    setFField(current.faturamento   > 0 ? String(current.faturamento)    : '');
    setAField(current.anuncios      > 0 ? String(current.anuncios)       : '');
    setRField(current.retornoAnuncios > 0 ? String(current.retornoAnuncios) : '');
    setFnField(current.funcionarios > 0 ? String(current.funcionarios)   : '');
    setFormErrors({});
    setSaveMessage('');
  }, [selectedMonth]);

  const custoTotal           = calcCustoTotal(current);
  const lucroLiquido         = calcLucroLiquido(current);
  const roas                 = calcRoas(current);
  const pctFunc              = calcPercentualFuncionarios(current);
  const pctLucro             = calcPercentualLucro(current);

  const prevCusto   = previous ? calcCustoTotal(previous)           : null;
  const prevLucro   = previous ? calcLucroLiquido(previous)         : null;
  const prevRoas    = previous ? calcRoas(previous)                 : null;
  const prevPctFunc = previous ? calcPercentualFuncionarios(previous): null;

  const metrics = [
    { label: 'Faturamento',     value: formatCurrency(current.faturamento), icon: '💰', color: C.primary, trend: trend(current.faturamento, previous?.faturamento ?? null) },
    { label: 'Lucro Líquido',   value: formatCurrency(lucroLiquido),        icon: '📈', color: C.green,   trend: trend(lucroLiquido, prevLucro) },
    { label: '% Lucro',         value: `${pctLucro.toFixed(1)}%`,          icon: '🎯', color: C.cyan,    trend: trend(pctLucro, previous ? calcPercentualLucro(previous) : null) },
    { label: 'Custo Total',     value: formatCurrency(custoTotal),          icon: '💸', color: C.red,     trend: trend(custoTotal, prevCusto) },
    { label: '% Funcionários',  value: `${pctFunc.toFixed(1)}%`,           icon: '👥', color: C.amber,   trend: trend(pctFunc, prevPctFunc) },
    { label: 'ROAS',            value: formatRatio(roas),                   icon: '📢', color: C.violet,  trend: trend(roas, prevRoas) },
  ];

  const handleSave = async () => {
    if (!userId) return;
    const updated: MonthlyData = {
      ...current,
      faturamento:    Number(fField)  || 0,
      anuncios:       Number(aField)  || 0,
      retornoAnuncios:Number(rField)  || 0,
      funcionarios:   Number(fnField) || 0,
    };
    const errors = validateMonthlyData(updated);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) { setSaveMsgType('err'); setSaveMessage('Corrija os campos antes de salvar.'); return; }

    setSaving(true); setSaveMessage('');
    try {
      await Promise.race([
        setDoc(doc(db, 'users', userId, 'finance', updated.month), { ...updated, updatedAt: serverTimestamp() }, { merge: true }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000)),
      ]);
      setMonthlyData(prev => prev.map(d => d.month === updated.month ? updated : d));
      setSaveMsgType('ok');
      setSaveMessage('Dados salvos com sucesso.');
      setTimeout(() => { setReloadTrigger(t => t + 1); setSaveMessage(''); }, 1200);
    } catch (err: any) {
      setSaveMsgType('err');
      setSaveMessage(err.code === 'permission-denied' ? 'Sem permissão. Faça login novamente.' : `Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const makeSeries = (fn: (d: MonthlyData) => number) =>
    monthlyData.map(d => ({ label: d.month, value: Number.isFinite(fn(d)) ? fn(d) : 0 }));

  const series = {
    faturamento: makeSeries(d => d.faturamento),
    custo:       makeSeries(d => d.anuncios + d.funcionarios),
    lucro:       makeSeries(d => d.faturamento - d.anuncios - d.funcionarios),
    roas:        makeSeries(d => d.anuncios > 0 ? d.retornoAnuncios / d.anuncios : 0),
  };

  return (
    <View style={styles.root}>
      <AppNav
        tabs={[
          { id: 'dashboard', label: 'Dashboard',   icon: '📊' },
          { id: 'billing',   label: 'Faturamento', icon: '💳' },
        ]}
        activeTab={selectedTab}
        onTabChange={id => setSelectedTab(id as any)}
        userEmail={userEmail}
        onSignOut={() => signOut(auth)}
      />

      {selectedTab === 'dashboard' ? (
        <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isWide && styles.contentWide]} keyboardShouldPersistTaps="handled">

          {/* Loading overlay */}
          {loadingData && (
            <View style={styles.loadingBar}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={styles.loadingText}>Sincronizando dados…</Text>
            </View>
          )}

          {/* YTD Summary */}
          <YearSummary data={monthlyData} />

          {/* Month selector */}
          <SectionBlock title="Período" subtitle={`Mês selecionado: ${selectedMonth}`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
              {monthlyData.map(item => {
                const hasData = item.faturamento > 0;
                const active  = item.month === selectedMonth;
                return (
                  <Pressable
                    key={item.month}
                    style={[styles.monthChip, active && styles.monthChipActive, !hasData && !active && styles.monthChipEmpty]}
                    onPress={() => setSelectedMonth(item.month)}
                  >
                    <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>{item.month}</Text>
                    {hasData && !active && <View style={styles.monthDot} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </SectionBlock>

          {/* KPI Metrics */}
          <SectionBlock
            title={`Métricas — ${selectedMonth}`}
            subtitle={previous ? `vs ${previous.month} anterior` : 'Sem mês anterior para comparar'}
          >
            <View style={styles.metricsGrid}>
              {metrics.map((m, i) => (
                <MetricCard key={i} {...m} />
              ))}
            </View>
          </SectionBlock>

          {/* Charts */}
          <SectionBlock title="Tendências Anuais" subtitle="Evolução mês a mês" noPad>
            <View style={[styles.chartsGrid, isWide && styles.chartsGridWide]}>
              {[
                { title: 'Faturamento',  points: series.faturamento, color: C.primary },
                { title: 'Custo Total',  points: series.custo,       color: C.red     },
                { title: 'Lucro Líquido',points: series.lucro,       color: C.green   },
                { title: 'ROAS',         points: series.roas,        color: C.amber   },
              ].map((c, i) => (
                <View key={i} style={[styles.chartCell, isWide && styles.chartCellWide]}>
                  <LineChart {...c} />
                </View>
              ))}
            </View>
          </SectionBlock>

          {/* Data form */}
          <SectionBlock
            title={`Editar dados — ${selectedMonth}`}
            subtitle="Valores em Reais (R$)"
          >
            <View style={[styles.formGrid, isWide && styles.formGridWide]}>
              <FormField label="Faturamento" value={fField} onChange={setFField} error={formErrors.faturamento} />
              <FormField label="Gasto com Anúncios" value={aField} onChange={setAField} error={formErrors.anuncios} />
              <FormField label="Retorno dos Anúncios" value={rField} onChange={setRField} error={formErrors.retornoAnuncios} />
              <FormField label="Gasto com Funcionários" value={fnField} onChange={setFnField} error={formErrors.funcionarios} />
            </View>

            {saveMessage ? (
              <View style={[styles.msgBanner, saveMsgType === 'ok' ? styles.msgOk : styles.msgErr]}>
                <Text style={[styles.msgText, { color: saveMsgType === 'ok' ? C.green : C.red }]}>
                  {saveMsgType === 'ok' ? '✓ ' : '✕ '}{saveMessage}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.saveBtn, saving && styles.saveBtnDisabled, pressed && { opacity: 0.85 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveBtnText}>Salvar {selectedMonth}</Text>
              }
            </Pressable>
          </SectionBlock>

        </ScrollView>
      ) : (
        <BillingScreen selectedMonth={selectedMonth} userId={userId} />
      )}
    </View>
  );
}

function FormField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={ffS.wrap}>
      <Text style={ffS.label}>{label}</Text>
      <View style={[ffS.inputWrap, focused && ffS.focused, !!error && ffS.errored]}>
        <Text style={ffS.prefix}>R$</Text>
        <TextInput
          style={ffS.input}
          value={value}
          onChangeText={v => onChange(v.replace(/[^0-9]/g, ''))}
          placeholder="0"
          placeholderTextColor={C.text3}
          keyboardType="numeric"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {error ? <Text style={ffS.error}>{error}</Text> : null}
    </View>
  );
}

const ffS = StyleSheet.create({
  wrap:     { flex: 1, minWidth: '45%', gap: 6 },
  label:    { fontSize: 12, fontWeight: '600', color: C.text2, letterSpacing: 0.3 },
  inputWrap:{ flexDirection: 'row', alignItems: 'center', height: 46, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 12, gap: 6 },
  focused:  { borderColor: C.primary, /* @ts-ignore */ boxShadow: '0 0 0 3px rgba(124,92,255,0.12)' },
  errored:  { borderColor: C.red },
  prefix:   { fontSize: 13, color: C.text3, fontWeight: '600' },
  input:    { flex: 1, fontSize: 15, color: C.text1, fontWeight: '600' },
  error:    { fontSize: 11, color: C.red, fontWeight: '500' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgBase },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 48, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  contentWide: { paddingHorizontal: 24 },

  loadingBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.bgCard, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 10 },
  loadingText: { fontSize: 13, color: C.text2 },

  monthScroll: { marginTop: 4 },
  monthChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginRight: 8, alignItems: 'center', gap: 4 },
  monthChipActive: { backgroundColor: C.primaryBg, borderColor: C.primary },
  monthChipEmpty:  { opacity: 0.45 },
  monthChipText:   { fontSize: 13, fontWeight: '600', color: C.text2 },
  monthChipTextActive: { color: C.primary },
  monthDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.green },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  chartsGrid:     { gap: 0 },
  chartsGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  chartCell:      { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: C.border },
  chartCellWide:  { width: '50%', borderRightWidth: 1, borderRightColor: C.border, borderBottomWidth: 1, borderBottomColor: C.border },

  formGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 16 },
  formGridWide: {},

  msgBanner: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, borderWidth: 1 },
  msgOk:  { backgroundColor: C.greenBg, borderColor: C.green },
  msgErr: { backgroundColor: C.redBg,   borderColor: C.red   },
  msgText: { fontSize: 13, fontWeight: '600' },

  saveBtn: {
    height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
