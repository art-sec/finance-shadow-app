import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { C } from '../theme';
import { generatePassword } from '../utils/password';
import type { Model } from './ModelsScreen';

export type ModelAccount = {
  id: string;
  modelId: string;       // referência ao perfil da modelo
  modelName: string;     // desnormalizado para exibição
  username: string;
  password: string;
  email: string;
  createdDate: string;
  status: string;
  virtualNumber: string;
  spoofLocation: string;
  platform: string;
  emailProvider: string;
  hostDeviceId: string;
  notes: string;
};

const EMPTY: Omit<ModelAccount, 'id'> = {
  modelId: '', modelName: '', username: '', password: '', email: '', createdDate: '',
  status: 'warming', virtualNumber: '', spoofLocation: '', platform: 'instagram',
  emailProvider: 'gmail', hostDeviceId: '', notes: '',
};

const STATUS_COLORS: Record<string, string> = {
  active: C.green, warming: C.amber, shadowbanned: C.red, suspended: C.red, inactive: C.text3,
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa', warming: 'Aquecendo', shadowbanned: 'Shadowban', suspended: 'Suspensa', inactive: 'Inativa',
};
const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', reddit: '🟠', onlyfans: '💎', tiktok: '🎵', twitter: '🐦', other: '🌐',
};

type Props = { userId?: string | null };

export default function AccountsScreen({ userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  const [items,   setItems]   = useState<ModelAccount[]>([]);
  const [models,  setModels]  = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<ModelAccount | null>(null);
  const [form,    setForm]    = useState<Omit<ModelAccount, 'id'>>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  const [filter,  setFilter]  = useState('');
  const [filterModel, setFilterModel] = useState('');

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [accSnap, modSnap] = await Promise.all([
        getDocs(collection(db, 'users', userId, 'accounts')),
        getDocs(collection(db, 'users', userId, 'models')),
      ]);
      setItems(accSnap.docs.map(d => ({ id: d.id, ...d.data() } as ModelAccount)));
      setModels(modSnap.docs.map(d => ({ id: d.id, ...d.data() } as Model)));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item: ModelAccount) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const closeModal = () => { setModal(false); setMsg(''); };
  const flash = (m: string, t: 'ok' | 'err') => { setMsgType(t); setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const set = (k: keyof Omit<ModelAccount, 'id'>, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectModel = (m: Model) => {
    setForm(f => ({ ...f, modelId: m.id, modelName: m.name }));
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!form.modelId) { flash('Selecione uma modelo para vincular esta conta.', 'err'); return; }
    if (!form.username.trim()) { flash('Username é obrigatório.', 'err'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'users', userId, 'accounts', editing.id), { ...form, updatedAt: serverTimestamp() });
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
      } else {
        const ref = await addDoc(collection(db, 'users', userId, 'accounts'), { ...form, createdAt: serverTimestamp() });
        setItems(prev => [...prev, { id: ref.id, ...form }]);
      }
      flash(editing ? 'Conta atualizada.' : 'Conta adicionada.', 'ok');
      setTimeout(closeModal, 800);
    } catch (e: any) { flash(e.message, 'err'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: ModelAccount) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'accounts', item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {}
  };

  const byStatus = (s: string) => items.filter(i => i.status === s).length;

  const filtered = items.filter(i => {
    const matchText = !filter ||
      i.username.toLowerCase().includes(filter.toLowerCase()) ||
      i.modelName.toLowerCase().includes(filter.toLowerCase()) ||
      i.platform.toLowerCase().includes(filter.toLowerCase());
    const matchModel = !filterModel || i.modelId === filterModel;
    return matchText && matchModel;
  });

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={s.headerContent}>
          <View>
            <Text style={s.pageTitle}>📱 Contas</Text>
            <Text style={s.pageSub}>{items.length} contas · {byStatus('active')} ativas · {byStatus('warming')} aquecendo</Text>
          </View>
          <Pressable style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]} onPress={openAdd}>
            <Text style={s.addBtnText}>+ Nova Conta</Text>
          </Pressable>
        </View>
      </View>

      {/* Filters */}
      <View style={s.filtersRow}>
        <View style={s.searchWrap}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.search}
            value={filter}
            onChangeText={setFilter}
            placeholder="Buscar por username, modelo ou plataforma…"
            placeholderTextColor={C.text3}
          />
          {filter ? <Pressable onPress={() => setFilter('')}><Text style={s.clearText}>✕</Text></Pressable> : null}
        </View>
      </View>

      {/* Model filter chips */}
      {models.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chipRow}>
          <Pressable
            style={[s.chip, !filterModel && s.chipActive]}
            onPress={() => setFilterModel('')}
          >
            <Text style={[s.chipText, !filterModel && s.chipTextActive]}>Todas</Text>
          </Pressable>
          {models.map(m => (
            <Pressable
              key={m.id}
              style={[s.chip, filterModel === m.id && s.chipActive]}
              onPress={() => setFilterModel(filterModel === m.id ? '' : m.id)}
            >
              <Text style={[s.chipText, filterModel === m.id && s.chipTextActive]}>{m.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={[s.listContent, isWide && s.listContentWide]}>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📱</Text>
              <Text style={s.emptyText}>Nenhuma conta encontrada</Text>
              <Text style={s.emptySub}>
                {models.length === 0
                  ? 'Cadastre uma modelo primeiro no menu "Modelos"'
                  : filter ? 'Tente outro termo de busca' : 'Clique em "+ Nova Conta" para começar'}
              </Text>
            </View>
          ) : (
            filtered.map(item => {
              const sc = STATUS_COLORS[item.status] ?? C.text3;
              return (
                <View key={item.id} style={[s.card, isWide && s.cardWide]}>
                  <View style={[s.cardAccent, { backgroundColor: sc }]} />
                  <View style={s.platformBadge}>
                    <Text style={s.platformIcon}>{PLATFORM_ICONS[item.platform] ?? '🌐'}</Text>
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.cardRow}>
                      <Text style={s.cardUsername}>@{item.username}</Text>
                      <View style={[s.statusBadge, { backgroundColor: sc + '22' }]}>
                        <Text style={[s.statusText, { color: sc }]}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                      </View>
                    </View>
                    <Text style={s.cardModel}>👤 {item.modelName || '—'}</Text>
                    {item.email ? <Text style={s.cardMeta}>{item.email}</Text> : null}
                    {item.spoofLocation ? <Text style={s.cardMeta}>📍 {item.spoofLocation}</Text> : null}
                  </View>
                  <View style={s.cardActions}>
                    <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]} onPress={() => openEdit(item)}>
                      <Text style={s.iconBtnText}>✏️</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]} onPress={() => handleDelete(item)}>
                      <Text style={s.iconBtnText}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modal} transparent animationType="fade">
        <View style={mo.overlay}>
          <View style={mo.box}>
            <View style={mo.headerAccent} />
            <View style={mo.header}>
              <Text style={mo.title}>{editing ? '✏️ Editar Conta' : '➕ Nova Conta'}</Text>
              <Pressable onPress={closeModal} style={mo.closeBtn}>
                <Text style={mo.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={mo.body} keyboardShouldPersistTaps="handled">

              {/* Model picker */}
              <Text style={mo.sectionLabel}>Modelo Vinculada *</Text>
              {models.length === 0 ? (
                <View style={mo.noModels}>
                  <Text style={mo.noModelsText}>⚠️ Nenhuma modelo cadastrada. Vá em "Modelos" e adicione uma primeiro.</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {models.map(m => (
                      <Pressable
                        key={m.id}
                        style={[mo.modelChip, form.modelId === m.id && mo.modelChipActive]}
                        onPress={() => selectModel(m)}
                      >
                        <Text style={[mo.modelChipText, form.modelId === m.id && mo.modelChipTextActive]}>{m.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}

              <Text style={mo.sectionLabel}>Plataforma & Status</Text>
              <View style={mo.grid}>
                <Sel label="Plataforma" value={form.platform} onChange={(v: string) => set('platform', v)}
                  options={[['instagram','Instagram'],['reddit','Reddit'],['onlyfans','OnlyFans'],['tiktok','TikTok'],['twitter','Twitter'],['other','Outra']]} />
                <Sel label="Status" value={form.status} onChange={(v: string) => set('status', v)}
                  options={[['active','Ativa'],['warming','Aquecendo'],['shadowbanned','Shadowban'],['suspended','Suspensa'],['inactive','Inativa']]} />
              </View>

              <Text style={mo.sectionLabel}>Credenciais</Text>
              <View style={mo.grid}>
                <AF label="Username" value={form.username} onChange={(v: string) => set('username', v)} placeholder="@username" />
                <View style={{ flex: 1, minWidth: '44%', gap: 6 }}>
                  <Text style={mo.fieldLabel}>Senha</Text>
                  <View style={mo.passRow}>
                    <TextInput
                      style={[mo.fieldInput, { flex: 1 }]}
                      value={form.password}
                      onChangeText={(v: string) => set('password', v)}
                      placeholder="••••••••"
                      placeholderTextColor={C.text3}
                    />
                    <Pressable style={({ pressed }) => [mo.genBtn, pressed && { opacity: 0.8 }]} onPress={() => set('password', generatePassword())}>
                      <Text style={mo.genBtnText}>⚡ Gerar</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
              <View style={mo.grid}>
                <AF label="E-mail Associado" value={form.email} onChange={(v: string) => set('email', v)} placeholder="Ex: conta@gmail.com" />
                <Sel label="Provedor de E-mail" value={form.emailProvider} onChange={(v: string) => set('emailProvider', v)}
                  options={[['gmail','Gmail'],['apple','Apple ID'],['other','Outro']]} />
              </View>

              <Text style={mo.sectionLabel}>Localização & Hardware</Text>
              <View style={mo.grid}>
                <AF label="Número Virtual"    value={form.virtualNumber} onChange={(v: string) => set('virtualNumber', v)} placeholder="+55 11 9..." />
                <AF label="Localização Spoof" value={form.spoofLocation} onChange={(v: string) => set('spoofLocation', v)} placeholder="Ex: Miami, FL" />
              </View>
              <View style={mo.grid}>
                <AF label="Data de Criação da Conta" value={form.createdDate} onChange={(v: string) => set('createdDate', v)} placeholder="DD/MM/AAAA" />
                <AF label="ID do Dispositivo (iPhone)" value={form.hostDeviceId} onChange={(v: string) => set('hostDeviceId', v)} placeholder="ID do iPhone vinculado" />
              </View>

              <Text style={mo.sectionLabel}>Notas & SOPs</Text>
              <AF label="Observações / Procedimentos" value={form.notes} onChange={(v: string) => set('notes', v)} placeholder="Processo de aquecimento, regras específicas…" full multiline />

              {msg ? (
                <View style={[mo.flash, msgType === 'ok' ? mo.flashOk : mo.flashErr]}>
                  <Text style={[mo.flashText, { color: msgType === 'ok' ? C.green : C.red }]}>
                    {msgType === 'ok' ? '✓ ' : '✕ '}{msg}
                  </Text>
                </View>
              ) : null}

              <Pressable style={({ pressed }) => [mo.saveBtn, saving && mo.saveBtnDisabled, pressed && { opacity: 0.85 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={mo.saveBtnText}>{editing ? 'Salvar alterações' : 'Adicionar conta'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────

type AFProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean; multiline?: boolean };

function AF({ label, value, onChange, placeholder, full, multiline }: AFProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[mo.fieldWrap, full && { flex: undefined, width: '100%' }]}>
      <Text style={mo.fieldLabel}>{label}</Text>
      <TextInput
        style={[mo.fieldInput, focused && mo.fieldFocused, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={C.text3}
        multiline={!!multiline}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
    </View>
  );
}

type SelProps = { label: string; value: string; onChange: (v: string) => void; options: [string, string][] };

function Sel({ label, value, onChange, options }: SelProps) {
  return (
    <View style={[mo.fieldWrap, { minWidth: '44%' }]}>
      <Text style={mo.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {options.map(([val, lbl]) => (
            <Pressable key={val} style={[mo.chip, value === val && mo.chipActive]} onPress={() => onChange(val)}>
              <Text style={[mo.chipText, value === val && mo.chipTextActive]}>{lbl}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bgBase },
  header: { backgroundColor: C.bgCard, borderBottomWidth: 1, borderBottomColor: C.border },
  headerAccent: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #7C5CFF 0%, #4EC5FF 100%)',
    backgroundColor: C.primary,
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
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard, paddingHorizontal: 12, gap: 8 },
  searchIcon: { fontSize: 14 },
  search:     { flex: 1, height: 42, fontSize: 14, color: C.text1 },
  clearText:  { fontSize: 13, color: C.text3, fontWeight: '700', padding: 4 },

  chipScroll: { paddingHorizontal: 16, marginTop: 10 },
  chipRow:    { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  chipActive: { backgroundColor: C.primaryBg, borderColor: C.primary },
  chipText:   { fontSize: 12, fontWeight: '600', color: C.text2 },
  chipTextActive: { color: C.primary },

  list:            { flex: 1 },
  listContent:     { padding: 16, paddingTop: 10, gap: 10, paddingBottom: 48 },
  listContentWide: {},

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyText: { fontSize: 17, fontWeight: '700', color: C.text1 },
  emptySub:  { fontSize: 13, color: C.text2, textAlign: 'center', maxWidth: 260 },

  card:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', gap: 0 },
  cardWide: {},
  cardAccent:    { width: 4, alignSelf: 'stretch' },
  platformBadge: { width: 46, height: 46, margin: 12, marginRight: 0, borderRadius: 12, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' },
  platformIcon:  { fontSize: 22 },
  cardBody:      { flex: 1, padding: 12, gap: 3 },
  cardRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardUsername:  { fontSize: 14, fontWeight: '700', color: C.text1 },
  statusBadge:   { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText:    { fontSize: 11, fontWeight: '700' },
  cardModel:     { fontSize: 12, color: C.primary, fontWeight: '600' },
  cardMeta:      { fontSize: 11, color: C.text3 },
  cardActions:   { flexDirection: 'row', gap: 6, paddingRight: 12 },
  iconBtn:       { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgElevated },
  iconBtnText:   { fontSize: 15 },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box:     { width: '100%', maxWidth: 640, maxHeight: '92%', backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  headerAccent: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #7C5CFF 0%, #4EC5FF 100%)',
    backgroundColor: C.primary,
  },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title:    { fontSize: 17, fontWeight: '800', color: C.text1 },
  closeBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeText:{ fontSize: 13, color: C.text2, fontWeight: '700' },
  body:     { padding: 22, maxHeight: 640 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.text3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },

  noModels:    { backgroundColor: C.amberBg, borderWidth: 1, borderColor: C.amber, borderRadius: 10, padding: 12, marginBottom: 16 },
  noModelsText:{ fontSize: 13, color: C.amber, fontWeight: '600' },

  modelChip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput },
  modelChipActive:   { backgroundColor: C.primaryBg, borderColor: C.primary },
  modelChipText:     { fontSize: 13, fontWeight: '600', color: C.text2 },
  modelChipTextActive:{ color: C.primary, fontWeight: '700' },

  grid:      { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  fieldWrap: { flex: 1, minWidth: '44%', gap: 6 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: C.text2, letterSpacing: 0.3 },
  fieldInput:   { height: 42, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 12, fontSize: 14, color: C.text1 },
  fieldFocused: {
    borderColor: C.primary,
    // @ts-ignore
    boxShadow: '0 0 0 3px rgba(124,92,255,0.15)',
  },

  passRow: { flexDirection: 'row', gap: 8 },
  genBtn:  { paddingHorizontal: 12, height: 42, borderRadius: 10, borderWidth: 1, borderColor: C.primaryMid, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primaryBg },
  genBtnText: { fontSize: 12, fontWeight: '700', color: C.primary },

  chip:          { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput },
  chipActive:    { backgroundColor: C.primaryBg, borderColor: C.primary },
  chipText:      { fontSize: 12, fontWeight: '600', color: C.text2 },
  chipTextActive:{ color: C.primary },

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
