import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { C } from '../theme';

type TodoItem = {
  id: string; title: string; category: string; dueDate: string;
  priority: string; completed: boolean; notes: string;
};

const EMPTY: Omit<TodoItem, 'id'> = {
  title: '', category: 'agency', dueDate: '', priority: 'medium', completed: false, notes: '',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: C.text3, medium: C.cyan, high: C.amber, urgent: C.red,
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
};
const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

type Props = { userId?: string | null };

export default function TodoScreen({ userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  const [items,     setItems]     = useState<TodoItem[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState<TodoItem | null>(null);
  const [form,      setForm]      = useState<Omit<TodoItem, 'id'>>(EMPTY);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState('');
  const [msgType,   setMsgType]   = useState<'ok' | 'err'>('ok');
  const [filterCat, setFilterCat] = useState<'all' | 'agency' | 'client'>('all');
  const [showDone,  setShowDone]  = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getDocs(collection(db, 'users', userId, 'todos'))
      .then(snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as TodoItem))))
      .finally(() => setLoading(false));
  }, [userId]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item: TodoItem) => { setEditing(item); setForm({ ...item } as any); setModal(true); };
  const closeModal = () => { setModal(false); setMsg(''); };
  const flash = (m: string, t: 'ok' | 'err') => { setMsgType(t); setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const set = (k: keyof Omit<TodoItem, 'id'>, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!userId) return;
    if (!form.title.trim()) { flash('Título é obrigatório.', 'err'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'users', userId, 'todos', editing.id), { ...form, updatedAt: serverTimestamp() });
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
      } else {
        const ref = await addDoc(collection(db, 'users', userId, 'todos'), { ...form, createdAt: serverTimestamp() });
        setItems(prev => [...prev, { id: ref.id, ...form }]);
      }
      flash(editing ? 'Tarefa atualizada.' : 'Tarefa adicionada.', 'ok');
      setTimeout(closeModal, 800);
    } catch (e: any) { flash(e.message, 'err'); }
    finally { setSaving(false); }
  };

  const toggleComplete = async (item: TodoItem) => {
    if (!userId) return;
    const completed = !item.completed;
    try {
      await updateDoc(doc(db, 'users', userId, 'todos', item.id), { completed });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed } : i));
    } catch {}
  };

  const handleDelete = async (item: TodoItem) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'todos', item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {}
  };

  const filtered = items
    .filter(i => (showDone ? true : !i.completed))
    .filter(i => filterCat === 'all' || i.category === filterCat)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4));

  const pending = items.filter(i => !i.completed).length;
  const urgent  = items.filter(i => !i.completed && i.priority === 'urgent').length;
  const done    = items.filter(i => i.completed).length;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={s.headerContent}>
          <View>
            <Text style={s.pageTitle}>✅ Tarefas</Text>
            <Text style={s.pageSub}>
              {pending} pendentes{urgent > 0 ? <Text style={{ color: C.red }}> · {urgent} urgentes</Text> : ''} · {done} concluídas
            </Text>
          </View>
          <Pressable style={({ pressed }) => [s.addBtn, pressed && s.addBtnPressed]} onPress={openAdd}>
            <Text style={s.addBtnText}>+ Nova Tarefa</Text>
          </Pressable>
        </View>
      </View>

      {/* Filter bar */}
      <View style={s.filterBar}>
        {([['all','Todas'],['agency','🏢 Agência'],['client','👤 Cliente']] as [string,string][]).map(([id, lbl]) => (
          <Pressable key={id} style={[s.filterChip, filterCat === id && s.filterChipActive]} onPress={() => setFilterCat(id as any)}>
            <Text style={[s.filterText, filterCat === id && s.filterTextActive]}>{lbl}</Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable style={[s.filterChip, showDone && s.filterChipActive]} onPress={() => setShowDone(v => !v)}>
          <Text style={[s.filterText, showDone && s.filterTextActive]}>✓ Concluídas</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={[s.listContent, isWide && s.listContentWide]}>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>{pending === 0 && !showDone ? '🎉' : '✅'}</Text>
              <Text style={s.emptyText}>{pending === 0 && !showDone ? 'Tudo em dia!' : 'Nenhuma tarefa aqui'}</Text>
              <Text style={s.emptySub}>{pending === 0 && !showDone ? 'Que ótimo! Crie uma nova tarefa quando precisar.' : 'Tente mudar o filtro'}</Text>
            </View>
          ) : (
            filtered.map(item => {
              const pc = PRIORITY_COLORS[item.priority] ?? C.text3;
              return (
                <Pressable key={item.id} style={[s.card, item.completed && s.cardDone]} onPress={() => toggleComplete(item)}>
                  <View style={[s.cardAccentBar, { backgroundColor: pc }]} />
                  <View style={[s.checkbox, item.completed && s.checkboxDone]}>
                    {item.completed && <Text style={s.checkmark}>✓</Text>}
                  </View>
                  <View style={s.cardBody}>
                    <View style={s.cardRow}>
                      <Text style={[s.cardTitle, item.completed && s.titleDone]} numberOfLines={2}>{item.title}</Text>
                      <View style={[s.priorityBadge, { backgroundColor: pc + '22' }]}>
                        <Text style={[s.priorityText, { color: pc }]}>{PRIORITY_LABELS[item.priority] ?? item.priority}</Text>
                      </View>
                    </View>
                    <View style={s.metaRow}>
                      {item.category === 'agency' && <Text style={s.metaChip}>🏢 Agência</Text>}
                      {item.category === 'client'  && <Text style={s.metaChip}>👤 Cliente</Text>}
                      {item.dueDate && <Text style={s.metaChip}>📅 {item.dueDate}</Text>}
                    </View>
                    {item.notes ? <Text style={s.cardNotes} numberOfLines={2}>{item.notes}</Text> : null}
                  </View>
                  <View style={s.cardActions}>
                    <Pressable style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]} onPress={() => openEdit(item)}>
                      <Text style={s.iconBtnText}>✏️</Text>
                    </Pressable>
                    <Pressable style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]} onPress={() => handleDelete(item)}>
                      <Text style={s.iconBtnText}>🗑️</Text>
                    </Pressable>
                  </View>
                </Pressable>
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
              <Text style={mo.title}>{editing ? '✏️ Editar Tarefa' : '➕ Nova Tarefa'}</Text>
              <Pressable onPress={closeModal} style={mo.closeBtn}>
                <Text style={mo.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={mo.body} keyboardShouldPersistTaps="handled">

              <TdF label="Título *" value={form.title} onChange={(v: string) => set('title', v)} placeholder="O que precisa ser feito?" full />

              <Text style={mo.sectionLabel}>Categoria & Prazo</Text>
              <View style={mo.grid}>
                <View style={mo.fieldWrap}>
                  <Text style={mo.fieldLabel}>Categoria</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    {([['agency','🏢 Agência'],['client','👤 Cliente']] as [string,string][]).map(([val, lbl]) => (
                      <Pressable key={val} style={[mo.chip, form.category === val && mo.chipActive]} onPress={() => set('category', val)}>
                        <Text style={[mo.chipText, form.category === val && mo.chipTextActive]}>{lbl}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <TdF label="Data de Vencimento" value={form.dueDate} onChange={(v: string) => set('dueDate', v)} placeholder="DD/MM/AAAA" />
              </View>

              <Text style={mo.sectionLabel}>Prioridade</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {([['low','Baixa'],['medium','Média'],['high','Alta'],['urgent','🔥 Urgente']] as [string,string][]).map(([val, lbl]) => {
                  const pc = PRIORITY_COLORS[val];
                  const active = form.priority === val;
                  return (
                    <Pressable key={val} style={[mo.chip, active && { backgroundColor: pc + '22', borderColor: pc }]} onPress={() => set('priority', val)}>
                      <Text style={[mo.chipText, active && { color: pc, fontWeight: '700' }]}>{lbl}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={mo.sectionLabel}>Notas</Text>
              <TdF label="Notas / Instruções" value={form.notes} onChange={(v: string) => set('notes', v)} placeholder="Links, SOPs, referências…" full multiline />

              {msg ? (
                <View style={[mo.flash, msgType === 'ok' ? mo.flashOk : mo.flashErr]}>
                  <Text style={[mo.flashText, { color: msgType === 'ok' ? C.green : C.red }]}>
                    {msgType === 'ok' ? '✓ ' : '✕ '}{msg}
                  </Text>
                </View>
              ) : null}

              <Pressable style={({ pressed }) => [mo.saveBtn, saving && mo.saveBtnDisabled, pressed && { opacity: 0.85 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={mo.saveBtnText}>{editing ? 'Salvar alterações' : 'Adicionar tarefa'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type TdFProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean; multiline?: boolean };

function TdF({ label, value, onChange, placeholder, full, multiline }: TdFProps) {
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
    background: 'linear-gradient(90deg, #FFB038 0%, #FF4F6A 100%)',
    backgroundColor: C.amber,
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
  filterBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, flexWrap: 'wrap' },
  filterChip:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  filterChipActive:{ backgroundColor: C.primaryBg, borderColor: C.primary },
  filterText:    { fontSize: 12, fontWeight: '600', color: C.text2 },
  filterTextActive:{ color: C.primary },
  list:          { flex: 1 },
  listContent:   { padding: 16, paddingTop: 0, gap: 8, paddingBottom: 48 },
  listContentWide:{},
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:         { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon:     { fontSize: 52 },
  emptyText:     { fontSize: 17, fontWeight: '700', color: C.text1 },
  emptySub:      { fontSize: 13, color: C.text2, textAlign: 'center', paddingHorizontal: 32 },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', gap: 0 },
  cardDone:      { opacity: 0.55 },
  cardAccentBar: { width: 4, alignSelf: 'stretch' },
  checkbox:      { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', margin: 14, marginRight: 0, flexShrink: 0 },
  checkboxDone:  { backgroundColor: C.green, borderColor: C.green },
  checkmark:     { color: '#fff', fontSize: 12, fontWeight: '900' },
  cardBody:      { flex: 1, padding: 14, gap: 5 },
  cardRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle:     { flex: 1, fontSize: 14, fontWeight: '700', color: C.text1, lineHeight: 20 },
  titleDone:     { textDecorationLine: 'line-through', color: C.text3 },
  priorityBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  priorityText:  { fontSize: 10, fontWeight: '800' },
  metaRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip:      { fontSize: 11, color: C.text3, fontWeight: '500' },
  cardNotes:     { fontSize: 12, color: C.text3, fontStyle: 'italic', lineHeight: 17 },
  cardActions:   { flexDirection: 'row', gap: 6, padding: 12, paddingLeft: 0, alignSelf: 'flex-start' },
  iconBtn:       { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgElevated },
  iconBtnPressed:{ opacity: 0.6 },
  iconBtnText:   { fontSize: 14 },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box:     { width: '100%', maxWidth: 540, maxHeight: '92%', backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  headerAccent: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #FFB038 0%, #FF4F6A 100%)',
    backgroundColor: C.amber,
  },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title:    { fontSize: 17, fontWeight: '800', color: C.text1 },
  closeBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeText:{ fontSize: 13, color: C.text2, fontWeight: '700' },
  body:     { padding: 22, maxHeight: 560 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.text3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  grid:         { flexDirection: 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  fieldWrap:    { flex: 1, minWidth: '44%', gap: 6 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: C.text2, letterSpacing: 0.3 },
  fieldInput:   { height: 42, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 12, fontSize: 14, color: C.text1 },
  fieldFocused: { borderColor: C.primary, /* @ts-ignore */ boxShadow: '0 0 0 3px rgba(124,92,255,0.15)' },
  chip:          { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput },
  chipActive:    { backgroundColor: C.primaryBg, borderColor: C.primary },
  chipText:      { fontSize: 12, fontWeight: '600', color: C.text2 },
  chipTextActive:{ color: C.primary, fontWeight: '700' },
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
