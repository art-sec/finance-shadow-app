import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { C } from '../theme';
import { generatePassword } from '../utils/password';
import type { ModelAccount } from './ModelsScreen';

type Device = {
  id: string;
  model: string;
  icloudEmail: string;
  firstName: string;
  lastName: string;
  icloudPassword: string;
  birthDate: string;
  phoneNumber: string;
  screenLockPassword: string;
  carrier: string;
  simCardInfo: string;
  spoofAddress: string;
  notes: string;
};

const EMPTY: Omit<Device, 'id'> = {
  model: '', icloudEmail: '', firstName: '', lastName: '',
  icloudPassword: '', birthDate: '', phoneNumber: '', screenLockPassword: '',
  carrier: '', simCardInfo: '', spoofAddress: '', notes: '',
};

type Props = { userId?: string | null };

export default function DevicesScreen({ userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;

  const [items,   setItems]   = useState<Device[]>([]);
  const [models,  setModels]  = useState<ModelAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form,    setForm]    = useState<Omit<Device, 'id'>>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  const [filter,  setFilter]  = useState('');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      getDocs(collection(db, 'users', userId, 'devices')),
      getDocs(collection(db, 'users', userId, 'models')),
    ]).then(([devSnap, modSnap]) => {
      setItems(devSnap.docs.map(d => ({ id: d.id, ...d.data() } as Device)));
      setModels(modSnap.docs.map(d => ({ id: d.id, ...d.data() } as ModelAccount)));
    }).finally(() => setLoading(false));
  }, [userId]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (item: Device) => { setEditing(item); setForm({ ...item } as any); setModal(true); };
  const closeModal = () => { setModal(false); setMsg(''); };

  const flash = (m: string, t: 'ok' | 'err') => {
    setMsgType(t); setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!form.model.trim()) { flash('Modelo do aparelho é obrigatório.', 'err'); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, 'users', userId, 'devices', editing.id), { ...form, updatedAt: serverTimestamp() });
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...form } : i));
      } else {
        const ref = await addDoc(collection(db, 'users', userId, 'devices'), { ...form, createdAt: serverTimestamp() });
        setItems(prev => [...prev, { id: ref.id, ...form }]);
      }
      flash(editing ? 'Dispositivo atualizado.' : 'Dispositivo adicionado.', 'ok');
      setTimeout(closeModal, 800);
    } catch (e: any) {
      flash(e.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Device) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'devices', item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {}
  };

  const set = (k: keyof Omit<Device, 'id'>, v: string) => setForm(f => ({ ...f, [k]: v }));

  const getLinkedAccounts = (deviceId: string) =>
    models.filter(m => m.hostDeviceId === deviceId);

  const filtered = items.filter(i =>
    !filter || i.model.toLowerCase().includes(filter.toLowerCase()) ||
    i.icloudEmail.toLowerCase().includes(filter.toLowerCase()) ||
    `${i.firstName} ${i.lastName}`.toLowerCase().includes(filter.toLowerCase())
  );

  const detailItem = detailId ? items.find(i => i.id === detailId) : null;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.pageTitle}>Dispositivos</Text>
          <Text style={s.pageSub}>{items.length} iPhones cadastrados</Text>
        </View>
        <Pressable style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]} onPress={openAdd}>
          <Text style={s.addBtnText}>+ Novo Dispositivo</Text>
        </Pressable>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={filter}
          onChangeText={setFilter}
          placeholder="Buscar por modelo, iCloud ou nome…"
          placeholderTextColor={C.text3}
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} /></View>
      ) : (
        <ScrollView style={s.list} contentContainerStyle={s.listContent}>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📱</Text>
              <Text style={s.emptyText}>Nenhum dispositivo cadastrado</Text>
              <Text style={s.emptySub}>Gerencie seu farm de iPhones aqui</Text>
            </View>
          ) : (
            filtered.map(item => {
              const linked = getLinkedAccounts(item.id);
              return (
                <View key={item.id} style={[s.card, isWide && s.cardWide]}>
                  <View style={s.phoneBadge}>
                    <Text style={s.phoneIcon}>📱</Text>
                  </View>
                  <View style={s.cardBody}>
                    <Text style={s.cardName}>{item.model}</Text>
                    <Text style={s.cardMeta}>
                      {item.firstName} {item.lastName}
                      {item.icloudEmail ? ` · ${item.icloudEmail}` : ''}
                    </Text>
                    {item.phoneNumber && <Text style={s.cardMeta}>📞 {item.phoneNumber}</Text>}
                    {item.spoofAddress && <Text style={s.cardMeta}>📍 {item.spoofAddress}</Text>}
                    {linked.length > 0 && (
                      <View style={s.linkedRow}>
                        {linked.map(m => (
                          <View key={m.id} style={s.linkedBadge}>
                            <Text style={s.linkedText}>{m.modelName}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  <View style={s.cardActions}>
                    <Pressable style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]} onPress={() => setDetailId(item.id)}>
                      <Text style={s.iconBtnText}>👁</Text>
                    </Pressable>
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

      {/* Detail modal (all sensitive credentials at a click) */}
      <Modal visible={!!detailItem} transparent animationType="fade">
        <View style={d.overlay}>
          <View style={d.box}>
            <View style={d.mHeader}>
              <Text style={d.mTitle}>📱 {detailItem?.model}</Text>
              <Pressable onPress={() => setDetailId(null)} style={d.closeBtn}>
                <Text style={d.closeText}>✕</Text>
              </Pressable>
            </View>
            {detailItem && (
              <ScrollView style={d.body}>
                <DetailRow label="Nome no Aparelho"    value={`${detailItem.firstName} ${detailItem.lastName}`} />
                <DetailRow label="iCloud"              value={detailItem.icloudEmail} />
                <DetailRow label="Senha iCloud"        value={detailItem.icloudPassword} sensitive />
                <DetailRow label="Data de Nascimento"  value={detailItem.birthDate} />
                <DetailRow label="Número de Celular"   value={detailItem.phoneNumber} />
                <DetailRow label="Senha da Tela"       value={detailItem.screenLockPassword} sensitive />
                <DetailRow label="Operadora"           value={detailItem.carrier} />
                <DetailRow label="SIM Card"            value={detailItem.simCardInfo} />
                <DetailRow label="Endereço Spoof"      value={detailItem.spoofAddress} />
                {detailItem.notes && <DetailRow label="Notas" value={detailItem.notes} />}

                {/* Linked accounts */}
                {getLinkedAccounts(detailItem.id).length > 0 && (
                  <View style={d.section}>
                    <Text style={d.sectionLabel}>Contas Vinculadas</Text>
                    {getLinkedAccounts(detailItem.id).map(m => (
                      <View key={m.id} style={d.linkedRow}>
                        <Text style={d.linkedPlatform}>{m.platform}</Text>
                        <View style={d.linkedInfo}>
                          <Text style={d.linkedName}>{m.modelName}</Text>
                          <Text style={d.linkedUsername}>@{m.username}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add/Edit modal */}
      <Modal visible={modal} transparent animationType="fade">
        <View style={m.overlay}>
          <View style={m.box}>
            <View style={m.mHeader}>
              <Text style={m.mTitle}>{editing ? 'Editar Dispositivo' : 'Novo Dispositivo'}</Text>
              <Pressable onPress={closeModal} style={m.closeBtn}>
                <Text style={m.closeText}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={m.body} keyboardShouldPersistTaps="handled">
              <DvField label="Modelo do Aparelho *" value={form.model}     onChange={v => set('model', v)}     placeholder="Ex: iPhone 13 Pro Max roxo" full />
              <View style={m.grid}>
                <DvField label="Primeiro Nome"   value={form.firstName} onChange={v => set('firstName', v)} placeholder="Ex: Jessica" />
                <DvField label="Último Nome"     value={form.lastName}  onChange={v => set('lastName', v)}  placeholder="Ex: Williams" />
              </View>
              <View style={m.grid}>
                <DvField label="E-mail iCloud"   value={form.icloudEmail}    onChange={v => set('icloudEmail', v)}    placeholder="conta@icloud.com" />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={m.fieldLabel}>Senha iCloud</Text>
                  <View style={m.passRow}>
                    <TextInput
                      style={[m.fieldInput, { flex: 1 }]}
                      value={form.icloudPassword}
                      onChangeText={v => set('icloudPassword', v)}
                      placeholder="••••••••"
                      placeholderTextColor={C.text3}
                    />
                    <Pressable style={({ pressed }) => [m.genBtn, pressed && { opacity: 0.8 }]} onPress={() => set('icloudPassword', generatePassword(12))}>
                      <Text style={m.genBtnText}>⚡</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
              <View style={m.grid}>
                <DvField label="Data de Nascimento" value={form.birthDate}   onChange={v => set('birthDate', v)}   placeholder="DD/MM/AAAA" />
                <DvField label="Número de Celular"  value={form.phoneNumber} onChange={v => set('phoneNumber', v)} placeholder="+55 11 9..." />
              </View>
              <View style={m.grid}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={m.fieldLabel}>Senha da Tela</Text>
                  <View style={m.passRow}>
                    <TextInput
                      style={[m.fieldInput, { flex: 1 }]}
                      value={form.screenLockPassword}
                      onChangeText={v => set('screenLockPassword', v)}
                      placeholder="PIN / senha"
                      placeholderTextColor={C.text3}
                    />
                    <Pressable style={({ pressed }) => [m.genBtn, pressed && { opacity: 0.8 }]} onPress={() => set('screenLockPassword', String(Math.floor(100000 + Math.random() * 900000)))}>
                      <Text style={m.genBtnText}>⚡</Text>
                    </Pressable>
                  </View>
                </View>
                <DvField label="Operadora / SIM" value={form.carrier}    onChange={v => set('carrier', v)}    placeholder="Ex: Vivo, Claro" />
              </View>
              <View style={m.grid}>
                <DvField label="Info SIM Card"    value={form.simCardInfo}  onChange={v => set('simCardInfo', v)}  placeholder="ICCID, número" />
                <DvField label="Endereço Spoof"   value={form.spoofAddress} onChange={v => set('spoofAddress', v)} placeholder="Ex: Miami, FL 33101" />
              </View>
              <DvField label="Notas" value={form.notes} onChange={v => set('notes', v)} placeholder="Observações adicionais…" full multiline />

              {msg ? (
                <View style={[m.flash, msgType === 'ok' ? m.flashOk : m.flashErr]}>
                  <Text style={[m.flashText, { color: msgType === 'ok' ? C.green : C.red }]}>
                    {msgType === 'ok' ? '✓ ' : '✕ '}{msg}
                  </Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [m.saveBtn, saving && m.saveBtnDisabled, pressed && { opacity: 0.85 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={m.saveBtnText}>{editing ? 'Salvar alterações' : 'Adicionar dispositivo'}</Text>
                }
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value, sensitive }: { label: string; value?: string; sensitive?: boolean }) {
  const [show, setShow] = useState(false);
  if (!value) return null;
  const display = sensitive && !show ? '••••••••' : value;
  return (
    <View style={d.row}>
      <Text style={d.rowLabel}>{label}</Text>
      <Pressable style={d.rowValWrap} onPress={sensitive ? () => setShow(v => !v) : undefined}>
        <Text style={d.rowVal}>{display}</Text>
        {sensitive && <Text style={d.showHide}>{show ? 'ocultar' : 'mostrar'}</Text>}
      </Pressable>
    </View>
  );
}

type DvFProps = { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean; multiline?: boolean };
function DvField({ label, value, onChange, placeholder, full, multiline }: DvFProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[m.fieldWrap, full && { flex: undefined, width: '100%' }]}>
      <Text style={m.fieldLabel}>{label}</Text>
      <TextInput
        style={[m.fieldInput, focused && m.fieldFocused, multiline && { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.text3}
        multiline={!!multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bgBase },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: C.text1, letterSpacing: -0.5 },
  pageSub:   { fontSize: 13, color: C.text2, marginTop: 2 },
  addBtn:    {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  addBtnText:{ color: '#fff', fontSize: 14, fontWeight: '700' },
  searchWrap:{ paddingHorizontal: 20, marginBottom: 12 },
  search:    { height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 14, fontSize: 14, color: C.text1 },
  list:      { flex: 1 },
  listContent:{ padding: 20, paddingTop: 0, gap: 10, paddingBottom: 48 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:     { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: '700', color: C.text1 },
  emptySub:  { fontSize: 13, color: C.text2 },
  card:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.bgCard, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, gap: 12 },
  cardWide:  {},
  phoneBadge:{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' },
  phoneIcon: { fontSize: 22 },
  cardBody:  { flex: 1, gap: 4 },
  cardName:  { fontSize: 15, fontWeight: '700', color: C.text1 },
  cardMeta:  { fontSize: 12, color: C.text2 },
  linkedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  linkedBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: C.cyanBg, borderWidth: 1, borderColor: C.cyan },
  linkedText: { fontSize: 11, fontWeight: '700', color: C.cyan },
  cardActions:{ flexDirection: 'row', gap: 6 },
  iconBtn:   { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnText:{ fontSize: 15 },
});

const d = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box:      { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  mHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  mTitle:   { fontSize: 16, fontWeight: '800', color: C.text1 },
  closeBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeText:{ fontSize: 14, color: C.text2, fontWeight: '700' },
  body:     { padding: 20 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel: { fontSize: 12, fontWeight: '600', color: C.text3, width: 140 },
  rowValWrap:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' },
  rowVal:   { fontSize: 13, fontWeight: '600', color: C.text1, textAlign: 'right', flex: 1 },
  showHide: { fontSize: 11, color: C.primary, fontWeight: '600' },
  section:  { marginTop: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: C.text3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  linkedRow:{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  linkedPlatform:{ fontSize: 12, color: C.text3, width: 80, textTransform: 'capitalize' },
  linkedInfo: { flex: 1 },
  linkedName: { fontSize: 13, fontWeight: '700', color: C.text1 },
  linkedUsername:{ fontSize: 11, color: C.text2 },
});

const m = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box:      { width: '100%', maxWidth: 620, maxHeight: '90%', backgroundColor: C.bgCard, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  mHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  mTitle:   { fontSize: 18, fontWeight: '800', color: C.text1 },
  closeBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  closeText:{ fontSize: 14, color: C.text2, fontWeight: '700' },
  body:     { padding: 24, maxHeight: 600 },
  grid:     { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  fieldWrap:{ flex: 1, minWidth: '44%', gap: 6 },
  fieldLabel:   { fontSize: 12, fontWeight: '600', color: C.text2, letterSpacing: 0.3 },
  fieldInput:   { height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput, paddingHorizontal: 12, fontSize: 14, color: C.text1 },
  fieldFocused: {
    borderColor: C.primary,
    // @ts-ignore
    boxShadow: '0 0 0 3px rgba(124,92,255,0.12)',
  },
  passRow:  { flexDirection: 'row', gap: 8 },
  genBtn:   { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.primaryMid, alignItems: 'center', justifyContent: 'center' },
  genBtnText: { fontSize: 16 },
  flash:    { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, borderWidth: 1 },
  flashOk:  { backgroundColor: C.greenBg, borderColor: C.green },
  flashErr: { backgroundColor: C.redBg,   borderColor: C.red   },
  flashText:{ fontSize: 13, fontWeight: '600' },
  saveBtn: {
    height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
