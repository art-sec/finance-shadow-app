import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { C } from '../theme';
import type { Model } from './ModelsScreen';

type ContentPlan = {
  id: string; modelId: string; title: string; sprintType: string;
  startDate: string; endDate: string; views: number; status: string; notes: string;
};

const EMPTY: Omit<ContentPlan, 'id'> = {
  modelId: '', title: '', sprintType: '30days', startDate: '', endDate: '', views: 0, status: 'planned', notes: '',
};

const SPRINT_LABELS: Record<string, string> = {
  '14days': '⚡ 14 dias', '30days': '📅 30 dias', '90days': '🚀 90 dias', '120days': '🏆 120 dias',
};
const STATUS_COLORS: Record<string, string> = {
  planned: C.cyan, active: C.green, completed: C.text3,
};
const STATUS_LABELS: Record<string, string> = {
  planned: 'Planejado', active: 'Ativo', completed: 'Concluído',
};

type Props = { userId?: string | null };

export default function ContentScreen({ userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  const [items,      setItems]      = useState<ContentPlan[]>([]);
  const [models,     setModels]     = useState<Model[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState<ContentPlan | null>(null);
  const [form,       setForm]       = useState<Omit<ContentPlan, 'id'>>(EMPTY);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');
  const [msgType,    setMsgType]    = useState<'ok' | 'err'>('ok');
  const [filterModel,setFilterModel]= useState('');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getDocs(collection(db, 'users', userId, 'content')),
      getDocs(collection(db, 'users', userId, 'models')),
    ]).then(([c, m]) => {
      setItems(c.docs.map(d => ({ id: d.id, ...d.data() } as ContentPlan)));
      setModels(m.docs.map(d => ({ id: d.id, ...d.data() } as Model)));
    }).finally(() => setLoading(false));
  }, [userId]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item: ContentPlan) => { setEditing(item); setForm({ ...item } as any); setModal(true); };
  const closeModal = () => { setModal(false); setMsg(''); };
  const flash = (m: string, t: 'ok' | 'err') => { setMsgType(t); setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const set = (k: keyof Omit<ContentPlan, 'id'>, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!userId) return;
    if (!form.title.trim()) { flash('Título é obrigatório.', 'err'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'users', userId, 'content', editing.id), { ...form, updatedAt: serverTimestamp() });
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
      } else {
        const ref = await addDoc(collection(db, 'users', userId, 'content'), { ...form, createdAt: serverTimestamp() });
        setItems(prev => [...prev, { id: ref.id, ...form }]);
      }
      flash(editing ? 'Sprint atualizado.' : 'Sprint criado.', 'ok');
      setTimeout(closeModal, 800);
    } catch (e: any) { flash(e.message, 'err'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: ContentPlan) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'content', item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {}
  };

  const getModelName = (id: string) => models.find(m => m.id === id)?.name ?? '—';

  const filtered = filterModel ? items.filter(i => i.modelId === filterModel) : items;
  const active   = items.filter(i => i.status === 'active').length;
  const planned  = items.filter(i => i.status === 'planned').length;
  const totalViews = items.reduce((s, i) => s + (Number(i.views) || 0), 0);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerAccent} />
        <View style={s.headerContent}>
          <View>
            <Text style={s.pageTitle}>🎬 Conteúdo</Text>
            <Text style={s.pageSub}>{active} ativos · {planned} planejados · {totalViews.toLocaleString('pt-BR')} views</Text>
          </View>
          <Pressable style={({ pressed }) => [s.addBtn, pressed && s.addBtnPressed]} onPress={openAdd}>
            <Text style={s.addBtnText}>+ Novo Sprint</Text>
          </Pressable>
        </View>
      </View>

      {models.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterContent}>
          <Pressable style={[s.filterChip, !filterModel && s.filterChipActive]} onPress={() => setFilterModel('')}>
            <Text style={[s.filterText, !filterModel && s.filterTextActive]}>Todas</Text>
          </Pressable>
          {models.map(mdl => (
            <Pressable key={mdl.id} style={[s.filterChip, filterModel === mdl.id && s.filterChipActive]} onPress={() => setFilterModel(mdl.id)}>
              <Text style={[s.filterText, filterModel === mdl.id && s.filterTextActive]}>{mdl.name}</Text>
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
              <Text style={s.emptyIcon}>🎬</Text>
              <Text style={s.emptyText}>Nenhum sprint de conteúdo</Text>
              <Text style={s.emptySub}>Planeje campanhas de 14, 30, 90 ou 120 dias</Text>
            </View>
          ) : (
            filtered.map(item => {
              const sc = STATUS_COLORS[item.status] ?? C.text3;
              return (
                <View key={item.id} style={[s.card, isWide && s.cardWide]}>
                  <View style={[s.cardAccent, { backgroundColor: sc }]} />
                  <View style={s.cardBody}>
                    <View style={s.cardTop}>
                      <View style={s.sprintBadge}>
                        <Text style={s.sprintText}>{SPRINT_LABELS[item.sprintType] ?? item.sprintType}</Text>
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: sc + '22' }]}>
                        <Text style={[s.statusText, { color: sc }]}>{STATUS_LABELS[item.status] ?? item.status}</Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <Pressable style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]} onPress={() => openEdit(item)}>
                        <Text style={s.iconBtnText}>✏️</Text>
                      </Pressable>
                      <Pressable style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]} onPress={() => handleDelete(item)}>
                        <Text style={s.iconBtnText}>🗑️</Text>
                      </Pressable>
                    </View>
                    <Text style={s.cardTitle}>{item.title}</Text>
                    <View style={s.metaRow}>
                      {item.modelId && <Text style={s.metaChip}>👤 {getModelName(item.modelId)}</Text>}
                      {item.startDate && <Text style={s.metaChip}>📅 {item.startDate}{item.endDate ? ` → ${item.endDate}` : ''}</Text>}
                    </View>
                    {Number(item.views) > 0 && (
                      <Text style={s.viewsText}>👁 {Number(item.views).toLocaleString('pt-BR')} views</Text>
                    )}
                    {item.notes ? <Text style={s.cardNotes} numberOfLines={2}>{item.notes}</Text> : null}
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
              <Text style={mo.title}>{editing ? '✏️ Editar Sprint' : '➕ Novo Sprint'}</Text>
              <Pressable onPress={closeModal} style={mo.closeBtn}>
                <Text style={mo.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={mo.body} keyboardShouldPersistTaps="handled">
              <CF label="Título *" value={form.title} onChange={(v: string) => set('title', v)} placeholder="Ex: Sprint de Crescimento Julho" full />

              <Text style={mo.sectionLabel}>Modelo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable style={[mo.chip, !form.modelId && mo.chipActive]} onPress={() => set('modelId', '')}>
                    <Text style={[mo.chipText, !form.modelId && mo.chipTextActive]}>Nenhuma</Text>
                  </Pressable>
                  {models.map(mdl => (
                    <Pressable key={mdl.id} style={[mo.chip, form.modelId === mdl.id && mo.chipActive]} onPress={() => set('modelId', mdl.id)}>
                      <Text style={[mo.chipText, form.modelId === mdl.id && mo.chipTextActive]}>{mdl.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={mo.sectionLabel}>Tipo de Sprint</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {Object.entries(SPRINT_LABELS).map(([val, lbl]) => (
                  <Pressable key={val} style={[mo.chip, form.sprintType === val && mo.chipActive]} onPress={() => set('sprintType', val)}>
                    <Text style={[mo.chipText, form.sprintType === val && mo.chipTextActive]}>{lbl}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={mo.sectionLabel}>Período & Resultados</Text>
              <View style={mo.grid}>
                <CF label="Data de Início" value={form.startDate} onChange={(v: string) => set('startDate', v)} placeholder="DD/MM/AAAA" />
                <CF label="Data de Fim"    value={form.endDate}   onChange={(v: string) => set('endDate', v)}   placeholder="DD/MM/AAAA" />
              </View>
              <View style={mo.grid}>
                <CF label="Views" value={form.views > 0 ? String(form.views) : ''} onChange={(v: string) => set('views', Number(v.replace(/\D/g,'')) || 0)} placeholder="0" numeric />
                <View style={mo.fieldWrap}>
                  <Text style={mo.fieldLabel}>Status</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                      <Pressable key={val} style={[mo.chip, form.status === val && mo.chipActive]} onPress={() => set('status', val)}>
                        <Text style={[mo.chipText, form.status === val && mo.chipTextActive]}>{lbl}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={mo.sectionLabel}>Estratégia & Notas</Text>
              <CF label="Lives, postagens-chave, colaborações…" value={form.notes} onChange={(v: string) => set('notes', v)} placeholder="Detalhes da estratégia" full multiline />

              {msg ? (
                <View style={[mo.flash, msgType === 'ok' ? mo.flashOk : mo.flashErr]}>
                  <Text style={[mo.flashText, { color: msgType === 'ok' ? C.green : C.red }]}>
                    {msgType === 'ok' ? '✓ ' : '✕ '}{msg}
                  </Text>
                </View>
              ) : null}

              <Pressable style={({ pressed }) => [mo.saveBtn, saving && mo.saveBtnDisabled, pressed && { opacity: 0.85 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={mo.saveBtnText}>{editing ? 'Salvar alterações' : 'Criar sprint'}</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type CFProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean; multiline?: boolean; numeric?: boolean };

function CF({ label, value, onChange, placeholder, full, multiline, numeric }: CFProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[mo.fieldWrap, full && { flex: undefined, width: '100%' }]}>
      <Text style={mo.fieldLabel}>{label}</Text>
      <TextInput
        style={[mo.fieldInput, focused && mo.fieldFocused, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value} onChangeText={v => onChange(numeric ? v.replace(/\D/g,'') : v)}
        placeholder={placeholder} placeholderTextColor={C.text3}
        multiline={!!multiline} keyboardType={numeric ? 'numeric' : 'default'}
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
    background: 'linear-gradient(90deg, #C77DFF 0%, #4EC5FF 100%)',
    backgroundColor: C.violet,
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
  addBtnPressed:  { opacity: 0.85 },
  addBtnText:     { color: '#fff', fontSize: 13, fontWeight: '700' },
  filterBar:      { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: C.border },
  filterContent:  { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: 'center' },
  filterChip:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgCard },
  filterChipActive:{ backgroundColor: C.primaryBg, borderColor: C.primary },
  filterText:     { fontSize: 12, fontWeight: '600', color: C.text2 },
  filterTextActive:{ color: C.primary },
  list:           { flex: 1 },
  listContent:    { padding: 16, gap: 12, paddingBottom: 48 },
  listContentWide:{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  empty:          { alignItems: 'center', paddingVertical: 60, gap: 10, width: '100%' },
  emptyIcon:      { fontSize: 52 },
  emptyText:      { fontSize: 17, fontWeight: '700', color: C.text1 },
  emptySub:       { fontSize: 13, color: C.text2, textAlign: 'center' },
  card:           { backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  cardWide:       { flex: 1, minWidth: 280, margin: 0 },
  cardAccent:     { height: 4 },
  cardBody:       { padding: 16, gap: 8 },
  cardTop:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sprintBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primaryMid },
  sprintText:     { fontSize: 11, fontWeight: '700', color: C.primary },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText:     { fontSize: 11, fontWeight: '700' },
  iconBtn:        { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgElevated },
  iconBtnPressed: { opacity: 0.6 },
  iconBtnText:    { fontSize: 14 },
  cardTitle:      { fontSize: 15, fontWeight: '700', color: C.text1, lineHeight: 21 },
  metaRow:        { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaChip:       { fontSize: 12, color: C.text2 },
  viewsText:      { fontSize: 13, fontWeight: '600', color: C.cyan },
  cardNotes:      { fontSize: 12, color: C.text3, fontStyle: 'italic', lineHeight: 17 },
});

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box:     { width: '100%', maxWidth: 580, maxHeight: '92%', backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  headerAccent: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #C77DFF 0%, #4EC5FF 100%)',
    backgroundColor: C.violet,
  },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title:    { fontSize: 17, fontWeight: '800', color: C.text1 },
  closeBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeText:{ fontSize: 13, color: C.text2, fontWeight: '700' },
  body:     { padding: 22, maxHeight: 580 },
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
