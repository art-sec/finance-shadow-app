import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { C } from '../theme';
import type { Model } from './ModelsScreen';

type KPIs = { views?: number; ppvsSold?: number; conversionRate?: number; goldenRatio?: number };

type TeamMember = {
  id: string; name: string; startDate: string; role: string; monthlyPay: number;
  performance: number; managerId: string; assignedModelId: string; kpis: KPIs;
};

const EMPTY: Omit<TeamMember, 'id'> = {
  name: '', startDate: '', role: 'va', monthlyPay: 0, performance: 3,
  managerId: '', assignedModelId: '', kpis: {},
};

const ROLES: [string, string, string][] = [
  ['va', 'VA', '🤝'], ['chatter', 'Chatter', '💬'],
  ['content_manager', 'Content Manager', '🎬'],
  ['account_manager', 'Account Manager', '📋'],
  ['manager', 'Gerente', '👑'],
];

const ROLE_COLORS: Record<string, string> = {
  va: C.cyan, chatter: C.green, content_manager: C.violet,
  account_manager: C.amber, manager: C.primary,
};

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

type Props = { userId?: string | null };

export default function TeamScreen({ userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  const [items,   setItems]   = useState<TeamMember[]>([]);
  const [models,  setModels]  = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form,    setForm]    = useState<Omit<TeamMember, 'id'>>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  const [kpiStr,  setKpiStr]  = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getDocs(collection(db, 'users', userId, 'team')),
      getDocs(collection(db, 'users', userId, 'models')),
    ]).then(([t, m]) => {
      setItems(t.docs.map(d => ({ id: d.id, ...d.data() } as TeamMember)));
      setModels(m.docs.map(d => ({ id: d.id, ...d.data() } as Model)));
    }).finally(() => setLoading(false));
  }, [userId]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setKpiStr({}); setModal(true); };
  const openEdit = (item: TeamMember) => {
    setEditing(item);
    const k = item.kpis ?? {};
    setKpiStr({
      views: k.views != null ? String(k.views) : '',
      ppvsSold: k.ppvsSold != null ? String(k.ppvsSold) : '',
      conversionRate: k.conversionRate != null ? String(k.conversionRate) : '',
      goldenRatio: k.goldenRatio != null ? String(k.goldenRatio) : '',
    });
    setForm({ ...item } as any);
    setModal(true);
  };
  const closeModal = () => { setModal(false); setMsg(''); };
  const flash = (m: string, t: 'ok' | 'err') => { setMsgType(t); setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const set = (k: keyof Omit<TeamMember, 'id' | 'kpis'>, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const buildKpis = (): KPIs => {
    const kpis: KPIs = {};
    if (kpiStr.views)          kpis.views          = Number(kpiStr.views);
    if (kpiStr.ppvsSold)       kpis.ppvsSold       = Number(kpiStr.ppvsSold);
    if (kpiStr.conversionRate) kpis.conversionRate = Number(kpiStr.conversionRate);
    if (kpiStr.goldenRatio)    kpis.goldenRatio    = Number(kpiStr.goldenRatio);
    return kpis;
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!form.name.trim()) { flash('Nome é obrigatório.', 'err'); return; }
    const data = { ...form, kpis: buildKpis() };
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'users', userId, 'team', editing.id), { ...data, updatedAt: serverTimestamp() });
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...data } : i));
      } else {
        const ref = await addDoc(collection(db, 'users', userId, 'team'), { ...data, createdAt: serverTimestamp() });
        setItems(prev => [...prev, { id: ref.id, ...data }]);
      }
      flash(editing ? 'Membro atualizado.' : 'Membro adicionado.', 'ok');
      setTimeout(closeModal, 800);
    } catch (e: any) { flash(e.message, 'err'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: TeamMember) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'team', item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {}
  };

  const getMemberName = (id: string) => items.find(i => i.id === id)?.name ?? '—';
  const getModelName  = (id: string) => models.find(m => m.id === id)?.name ?? '—';
  const totalPayroll  = items.reduce((s, i) => s + (Number(i.monthlyPay) || 0), 0);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={s.headerContent}>
          <View>
            <Text style={s.pageTitle}>👥 Equipe</Text>
            <Text style={s.pageSub}>{items.length} membros · Folha: {fmt(totalPayroll)}/mês</Text>
          </View>
          <Pressable style={({ pressed }) => [s.addBtn, pressed && s.addBtnPressed]} onPress={openAdd}>
            <Text style={s.addBtnText}>+ Novo Membro</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={s.listContent}>
          {items.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyText}>Nenhum membro cadastrado</Text>
              <Text style={s.emptySub}>Adicione VAs, chatters e gerentes</Text>
            </View>
          ) : (
            items.map(item => {
              const rc = ROLE_COLORS[item.role] ?? C.text2;
              const role = ROLES.find(r => r[0] === item.role);
              const kpis = item.kpis ?? {};
              return (
                <View key={item.id} style={[s.card, isWide && s.cardWide]}>
                  <View style={[s.cardAccent, { backgroundColor: rc }]} />
                  <View style={[s.avatar, { backgroundColor: rc + '22' }]}>
                    <Text style={s.avatarIcon}>{role?.[2] ?? '👤'}</Text>
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.cardRow}>
                      <Text style={s.cardName}>{item.name}</Text>
                      <View style={[s.roleBadge, { backgroundColor: rc + '22' }]}>
                        <Text style={[s.roleText, { color: rc }]}>{role?.[1] ?? item.role}</Text>
                      </View>
                    </View>
                    <Text style={s.cardMeta}>
                      💰 {fmt(Number(item.monthlyPay) || 0)}/mês
                      {item.assignedModelId ? `  ·  👤 ${getModelName(item.assignedModelId)}` : ''}
                      {item.managerId ? `  ·  👑 ${getMemberName(item.managerId)}` : ''}
                    </Text>
                    {/* KPI badges */}
                    {(kpis.ppvsSold != null || kpis.views != null || kpis.conversionRate != null || kpis.goldenRatio != null) && (
                      <View style={s.kpisRow}>
                        {kpis.views           != null && <KpiBadge label="Views"  value={String(kpis.views)}         color={C.cyan}   />}
                        {kpis.ppvsSold        != null && <KpiBadge label="PPVs"   value={String(kpis.ppvsSold)}      color={C.green}  />}
                        {kpis.conversionRate  != null && <KpiBadge label="Conv."  value={`${kpis.conversionRate}%`}  color={C.amber}  />}
                        {kpis.goldenRatio     != null && <KpiBadge label="Golden" value={`${kpis.goldenRatio}x`}     color={C.violet} />}
                      </View>
                    )}
                    <Text style={s.stars}>
                      {Array.from({ length: 5 }, (_, i) => i < (item.performance ?? 0) ? '★' : '☆').join('')}
                    </Text>
                  </View>
                  <View style={s.cardActions}>
                    <Pressable style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]} onPress={() => openEdit(item)}>
                      <Text style={s.iconBtnText}>✏️</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]} onPress={() => handleDelete(item)}>
                      <Text style={s.iconBtnText}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={modal} transparent animationType="fade">
        <View style={mo.overlay}>
          <View style={mo.box}>
            <View style={mo.headerAccent} />
            <View style={mo.header}>
              <Text style={mo.title}>{editing ? '✏️ Editar Membro' : '➕ Novo Membro'}</Text>
              <Pressable onPress={closeModal} style={mo.closeBtn}>
                <Text style={mo.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={mo.body} keyboardShouldPersistTaps="handled">

              <Text style={mo.sectionLabel}>Dados Pessoais</Text>
              <View style={mo.grid}>
                <TF label="Nome *"         value={form.name}      onChange={(v: string) => set('name', v)}      placeholder="Ex: London R." />
                <TF label="Data de Início" value={form.startDate} onChange={(v: string) => set('startDate', v)} placeholder="DD/MM/AAAA" />
              </View>

              <Text style={mo.sectionLabel}>Cargo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {ROLES.map(([val, lbl, icon]) => (
                    <Pressable key={val} style={[mo.chip, form.role === val && mo.chipActive]} onPress={() => set('role', val)}>
                      <Text style={[mo.chipText, form.role === val && mo.chipTextActive]}>{icon} {lbl}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={mo.sectionLabel}>Compensação & Avaliação</Text>
              <View style={mo.grid}>
                <TF label="Pagamento Mensal (R$)"
                  value={form.monthlyPay > 0 ? String(form.monthlyPay) : ''}
                  onChange={(v: string) => set('monthlyPay', Number(v.replace(/\D/g, '')) || 0)}
                  placeholder="0" numeric />
                <View style={mo.fieldWrap}>
                  <Text style={mo.fieldLabel}>Avaliação (1-5)</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    {[1,2,3,4,5].map(n => (
                      <Pressable key={n} style={[mo.starBtn, form.performance >= n && mo.starBtnActive]} onPress={() => set('performance', n)}>
                        <Text style={[mo.starText, form.performance >= n && mo.starTextActive]}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={mo.sectionLabel}>Vínculos</Text>
              <View style={mo.grid}>
                <View style={mo.fieldWrap}>
                  <Text style={mo.fieldLabel}>Modelo Atribuída</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable style={[mo.chip, !form.assignedModelId && mo.chipActive]} onPress={() => set('assignedModelId', '')}>
                        <Text style={[mo.chipText, !form.assignedModelId && mo.chipTextActive]}>Nenhuma</Text>
                      </Pressable>
                      {models.map(mdl => (
                        <Pressable key={mdl.id} style={[mo.chip, form.assignedModelId === mdl.id && mo.chipActive]} onPress={() => set('assignedModelId', mdl.id)}>
                          <Text style={[mo.chipText, form.assignedModelId === mdl.id && mo.chipTextActive]}>{mdl.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <View style={mo.fieldWrap}>
                  <Text style={mo.fieldLabel}>Gerente</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable style={[mo.chip, !form.managerId && mo.chipActive]} onPress={() => set('managerId', '')}>
                        <Text style={[mo.chipText, !form.managerId && mo.chipTextActive]}>Nenhum</Text>
                      </Pressable>
                      {items.filter(i => i.id !== editing?.id && i.role === 'manager').map(mgr => (
                        <Pressable key={mgr.id} style={[mo.chip, form.managerId === mgr.id && mo.chipActive]} onPress={() => set('managerId', mgr.id)}>
                          <Text style={[mo.chipText, form.managerId === mgr.id && mo.chipTextActive]}>{mgr.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <Text style={mo.sectionLabel}>KPIs</Text>
              <View style={mo.grid}>
                {form.role === 'content_manager' && (
                  <TF label="Visualizações" value={kpiStr.views ?? ''} onChange={(v: string) => setKpiStr(k => ({ ...k, views: v.replace(/\D/g,'') }))} placeholder="0" numeric />
                )}
                {(form.role === 'chatter' || form.role === 'va') && (<>
                  <TF label="PPVs Vendidos"       value={kpiStr.ppvsSold ?? ''}       onChange={(v: string) => setKpiStr(k => ({ ...k, ppvsSold: v.replace(/\D/g,'') }))}       placeholder="0" numeric />
                  <TF label="Taxa de Conversão %" value={kpiStr.conversionRate ?? ''} onChange={(v: string) => setKpiStr(k => ({ ...k, conversionRate: v.replace(/[^0-9.]/g,'') }))} placeholder="0" numeric />
                  <TF label="Golden Ratio"        value={kpiStr.goldenRatio ?? ''}    onChange={(v: string) => setKpiStr(k => ({ ...k, goldenRatio: v.replace(/[^0-9.]/g,'') }))}    placeholder="0" numeric />
                </>)}
                {form.role === 'manager' || form.role === 'account_manager' ? (
                  <Text style={[mo.fieldLabel, { alignSelf: 'center', fontStyle: 'italic' }]}>KPIs serão definidos por relatório</Text>
                ) : null}
              </View>

              {msg ? (
                <View style={[mo.flash, msgType === 'ok' ? mo.flashOk : mo.flashErr]}>
                  <Text style={[mo.flashText, { color: msgType === 'ok' ? C.green : C.red }]}>
                    {msgType === 'ok' ? '✓ ' : '✕ '}{msg}
                  </Text>
                </View>
              ) : null}

              <Pressable style={({ pressed }) => [mo.saveBtn, saving && mo.saveBtnDisabled, pressed && { opacity: 0.85 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={mo.saveBtnText}>{editing ? 'Salvar alterações' : 'Adicionar membro'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function KpiBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: color + '22' }]}>
      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{label}: {value}</Text>
    </View>
  );
}

type TFProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; numeric?: boolean };

function TF({ label, value, onChange, placeholder, numeric }: TFProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={mo.fieldWrap}>
      <Text style={mo.fieldLabel}>{label}</Text>
      <TextInput
        style={[mo.fieldInput, focused && mo.fieldFocused]}
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={C.text3}
        keyboardType={numeric ? 'numeric' : 'default'}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bgBase },
  header: { backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border },
  headerAccent: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #00E5A0 0%, #4EC5FF 100%)',
    backgroundColor: C.green,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: C.text1, letterSpacing: -0.3 },
  pageSub:   { fontSize: 12, color: C.text2, marginTop: 3 },
  addBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  addBtnPressed: { opacity: 0.85 },
  addBtnText:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  list:       { flex: 1 },
  listContent:{ padding: 16, paddingTop: 16, gap: 10, paddingBottom: 48 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon:  { fontSize: 52 },
  emptyText:  { fontSize: 17, fontWeight: '700', color: C.text1 },
  emptySub:   { fontSize: 13, color: C.text2 },
  card:       { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  cardWide:   {},
  cardAccent: { width: 4, alignSelf: 'stretch' },
  avatar:     { width: 48, height: 48, margin: 14, marginRight: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: 22 },
  cardBody:   { flex: 1, padding: 14, gap: 4 },
  cardRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:   { fontSize: 15, fontWeight: '700', color: C.text1 },
  roleBadge:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText:   { fontSize: 11, fontWeight: '700' },
  cardMeta:   { fontSize: 12, color: C.text2 },
  kpisRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  stars:      { fontSize: 14, color: C.amber, letterSpacing: 2, marginTop: 2 },
  cardActions:{ flexDirection: 'row', gap: 6, padding: 12, paddingLeft: 0 },
  iconBtn:    { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgElevated },
  iconBtnPressed: { opacity: 0.6 },
  iconBtnText:{ fontSize: 15 },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box:     { width: '100%', maxWidth: 620, maxHeight: '92%', backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  headerAccent: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #00E5A0 0%, #4EC5FF 100%)',
    backgroundColor: C.green,
  },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title:    { fontSize: 17, fontWeight: '800', color: C.text1 },
  closeBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeText:{ fontSize: 13, color: C.text2, fontWeight: '700' },
  body:     { padding: 22, maxHeight: 620 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.text3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  grid:         { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  fieldWrap:    { flex: 1, minWidth: '44%', gap: 6 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: C.text2, letterSpacing: 0.3 },
  fieldInput:   { height: 42, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 12, fontSize: 14, color: C.text1 },
  fieldFocused: {
    borderColor: C.primary,
    // @ts-ignore
    boxShadow: '0 0 0 3px rgba(124,92,255,0.15)',
  },
  chip:          { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput },
  chipActive:    { backgroundColor: C.primaryBg, borderColor: C.primary },
  chipText:      { fontSize: 12, fontWeight: '600', color: C.text2 },
  chipTextActive:{ color: C.primary },
  starBtn:       { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgInput },
  starBtnActive: { backgroundColor: C.amberBg, borderColor: C.amber },
  starText:      { fontSize: 14, fontWeight: '700', color: C.text3 },
  starTextActive:{ color: C.amber },
  flash:    { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, borderWidth: 1 },
  flashOk:  { backgroundColor: C.greenBg, borderColor: C.green },
  flashErr: { backgroundColor: C.redBg, borderColor: C.red },
  flashText:{ fontSize: 13, fontWeight: '600' },
  saveBtn: {
    height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
