import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { C } from '../theme';

export type Model = {
  id: string;
  name: string;        // nome artístico
  realName: string;    // nome real
  birthDate: string;
  nationality: string;
  notes: string;
};

const EMPTY: Omit<Model, 'id'> = {
  name: '', realName: '', birthDate: '', nationality: '', notes: '',
};

type Props = { userId?: string | null };

export default function ModelsScreen({ userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  const [items,   setItems]   = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [editing, setEditing] = useState<Model | null>(null);
  const [form,    setForm]    = useState<Omit<Model, 'id'>>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  const [filter,  setFilter]  = useState('');

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'models'));
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as Model)));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item: Model) => { setEditing(item); setForm({ ...item }); setModal(true); };
  const closeModal = () => { setModal(false); setMsg(''); };
  const flash = (m: string, t: 'ok' | 'err') => { setMsgType(t); setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const set = (k: keyof Omit<Model, 'id'>, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!userId) return;
    if (!form.name.trim()) { flash('Nome artístico é obrigatório.', 'err'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'users', userId, 'models', editing.id), { ...form, updatedAt: serverTimestamp() });
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
      } else {
        const ref = await addDoc(collection(db, 'users', userId, 'models'), { ...form, createdAt: serverTimestamp() });
        setItems(prev => [...prev, { id: ref.id, ...form }]);
      }
      flash(editing ? 'Modelo atualizada.' : 'Modelo adicionada.', 'ok');
      setTimeout(closeModal, 800);
    } catch (e: any) { flash(e.message, 'err'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: Model) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'models', item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {}
  };

  const filtered = items.filter(i =>
    !filter ||
    i.name.toLowerCase().includes(filter.toLowerCase()) ||
    i.realName.toLowerCase().includes(filter.toLowerCase()) ||
    i.nationality.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={s.headerContent}>
          <View>
            <Text style={s.pageTitle}>👤 Modelos</Text>
            <Text style={s.pageSub}>{items.length} modelos cadastradas</Text>
          </View>
          <Pressable style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]} onPress={openAdd}>
            <Text style={s.addBtnText}>+ Nova Modelo</Text>
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.search}
          value={filter}
          onChangeText={setFilter}
          placeholder="Buscar por nome artístico, nome real ou nacionalidade…"
          placeholderTextColor={C.text3}
        />
        {filter ? (
          <Pressable onPress={() => setFilter('')} style={s.clearBtn}>
            <Text style={s.clearBtnText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={[s.listContent, isWide && s.listContentWide]}>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>👤</Text>
              <Text style={s.emptyText}>Nenhuma modelo cadastrada</Text>
              <Text style={s.emptySub}>{filter ? 'Tente outro termo' : 'Clique em "+ Nova Modelo" para começar'}</Text>
            </View>
          ) : (
            filtered.map(item => (
              <View key={item.id} style={[s.card, isWide && s.cardWide]}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardName}>{item.name}</Text>
                  {item.realName ? <Text style={s.cardMeta}>Nome real: {item.realName}</Text> : null}
                  <View style={s.tagRow}>
                    {item.birthDate ? <View style={s.tag}><Text style={s.tagText}>🎂 {item.birthDate}</Text></View> : null}
                    {item.nationality ? <View style={s.tag}><Text style={s.tagText}>🌍 {item.nationality}</Text></View> : null}
                  </View>
                  {item.notes ? <Text style={s.cardNote} numberOfLines={2}>{item.notes}</Text> : null}
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
            ))
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modal} transparent animationType="fade">
        <View style={mo.overlay}>
          <View style={mo.box}>
            <View style={mo.headerAccent} />
            <View style={mo.header}>
              <Text style={mo.title}>{editing ? '✏️ Editar Modelo' : '➕ Nova Modelo'}</Text>
              <Pressable onPress={closeModal} style={mo.closeBtn}>
                <Text style={mo.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={mo.body} keyboardShouldPersistTaps="handled">
              <Text style={mo.sectionLabel}>Identificação</Text>
              <View style={mo.grid}>
                <MF label="Nome Artístico *" value={form.name}     onChange={(v: string) => set('name', v)}     placeholder="Ex: Sarah" />
                <MF label="Nome Real"        value={form.realName} onChange={(v: string) => set('realName', v)} placeholder="Ex: Jessica Williams" />
              </View>

              <Text style={mo.sectionLabel}>Dados Pessoais</Text>
              <View style={mo.grid}>
                <MF label="Data de Nascimento" value={form.birthDate}   onChange={(v: string) => set('birthDate', v)}   placeholder="DD/MM/AAAA" />
                <MF label="Nacionalidade"      value={form.nationality} onChange={(v: string) => set('nationality', v)} placeholder="Ex: Brasileira, Americana" />
              </View>

              <Text style={mo.sectionLabel}>Notas</Text>
              <MF label="Observações" value={form.notes} onChange={(v: string) => set('notes', v)} placeholder="Informações relevantes sobre a modelo…" full multiline />

              {msg ? (
                <View style={[mo.flash, msgType === 'ok' ? mo.flashOk : mo.flashErr]}>
                  <Text style={[mo.flashText, { color: msgType === 'ok' ? C.green : C.red }]}>
                    {msgType === 'ok' ? '✓ ' : '✕ '}{msg}
                  </Text>
                </View>
              ) : null}

              <Pressable style={({ pressed }) => [mo.saveBtn, saving && mo.saveBtnDisabled, pressed && { opacity: 0.85 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={mo.saveBtnText}>{editing ? 'Salvar alterações' : 'Adicionar modelo'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type MFProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean; multiline?: boolean };

function MF({ label, value, onChange, placeholder, full, multiline }: MFProps) {
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

  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard, paddingHorizontal: 12, gap: 8 },
  searchIcon: { fontSize: 14 },
  search:     { flex: 1, height: 42, fontSize: 14, color: C.text1 },
  clearBtn:   { padding: 4 },
  clearBtnText: { fontSize: 13, color: C.text3, fontWeight: '700' },

  list:            { flex: 1 },
  listContent:     { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 48 },
  listContentWide: {},

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:  { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyText: { fontSize: 17, fontWeight: '700', color: C.text1 },
  emptySub:  { fontSize: 13, color: C.text2, textAlign: 'center' },

  card:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, gap: 14 },
  cardWide: {},
  avatar:   { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primaryMid, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 20, fontWeight: '800', color: C.primary },
  cardBody:  { flex: 1, gap: 4 },
  cardName:  { fontSize: 15, fontWeight: '700', color: C.text1 },
  cardMeta:  { fontSize: 12, color: C.text2 },
  tagRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border },
  tagText:   { fontSize: 11, color: C.text2, fontWeight: '600' },
  cardNote:  { fontSize: 12, color: C.text3, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  iconBtn:     { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgElevated },
  iconBtnText: { fontSize: 15 },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box:     { width: '100%', maxWidth: 540, maxHeight: '90%', backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
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
  body:     { padding: 22 },

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
