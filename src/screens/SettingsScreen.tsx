import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useWorkspace,
  WorkspaceMember,
  WorkspaceInvite,
  Permission,
  ALL_PERMISSIONS,
  ROLE_PRESETS,
  ROLE_LABELS,
  ROLE_ICONS,
} from '../contexts/WorkspaceContext';
import { registerInviteCode } from '../contexts/WorkspaceContext';
import { C } from '../theme';
import SectionBlock from '../components/SectionBlock';

// ── Helpers ─────────────────────────────────────────────────────────────────

const PERM_LABELS: Record<string, string> = {
  'view:overview':  'Ver Visão Geral',
  'edit:overview':  'Editar Visão Geral',
  'view:models':    'Ver Modelos',
  'edit:models':    'Editar Modelos',
  'view:accounts':  'Ver Contas',
  'edit:accounts':  'Editar Contas',
  'view:team':      'Ver Equipe',
  'edit:team':      'Editar Equipe',
  'view:todos':     'Ver Tarefas',
  'edit:todos':     'Editar Tarefas',
  'view:finance':   'Ver Financeiro',
  'edit:finance':   'Editar Financeiro',
  'view:content':   'Ver Conteúdo',
  'edit:content':   'Editar Conteúdo',
  'view:devices':   'Ver Dispositivos',
  'edit:devices':   'Editar Dispositivos',
};

const PERM_MODULES: { module: string; label: string; view: Permission; edit?: Permission }[] = [
  { module: 'overview', label: 'Visão Geral',  view: 'view:overview', edit: 'edit:overview' },
  { module: 'models',   label: 'Modelos',       view: 'view:models',   edit: 'edit:models'   },
  { module: 'accounts', label: 'Contas',        view: 'view:accounts', edit: 'edit:accounts' },
  { module: 'team',     label: 'Equipe',        view: 'view:team',     edit: 'edit:team'     },
  { module: 'todos',    label: 'Tarefas',       view: 'view:todos',    edit: 'edit:todos'    },
  { module: 'finance',  label: 'Financeiro',    view: 'view:finance',  edit: 'edit:finance'  },
  { module: 'content',  label: 'Conteúdo',      view: 'view:content',  edit: 'edit:content'  },
  { module: 'devices',  label: 'Dispositivos',  view: 'view:devices',  edit: 'edit:devices'  },
];

const INVITE_ROLES = ['manager', 'account_manager', 'chatter', 'va', 'content_manager'] as const;

// ── Main Component ───────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;
  const {
    ownerId, members, invites, isLoading,
    createInvite, deleteInvite, revokeMember, updateMemberPermissions, refetch,
  } = useWorkspace();

  // ── Invite creation state
  const [invRole, setInvRole]       = useState<string>('va');
  const [invPerms, setInvPerms]     = useState<Permission[]>(ROLE_PRESETS['va'] ?? []);
  const [creatingInv, setCreatingInv] = useState(false);
  const [lastCode,    setLastCode]  = useState<string | null>(null);
  const [lastInviteId, setLastInviteId] = useState<string | null>(null);
  const [invMsg, setInvMsg]         = useState('');
  const [invMsgType, setInvMsgType] = useState<'ok' | 'err'>('ok');
  const [copied, setCopied]         = useState(false);

  // ── Member edit state
  const [editingMember,  setEditingMember]  = useState<WorkspaceMember | null>(null);
  const [editRole,       setEditRole]       = useState('');
  const [editPerms,      setEditPerms]      = useState<Permission[]>([]);
  const [savingEdit,     setSavingEdit]     = useState(false);
  const [revoking,       setRevoking]       = useState<string | null>(null);

  const flash = (msg: string, type: 'ok' | 'err') => {
    setInvMsgType(type); setInvMsg(msg);
    setTimeout(() => setInvMsg(''), 4000);
  };

  // When role changes, auto-fill perms with preset
  const handleRoleChange = (role: string) => {
    setInvRole(role);
    setInvPerms(ROLE_PRESETS[role] ?? []);
  };

  const togglePerm = (p: Permission, current: Permission[], setter: (ps: Permission[]) => void) => {
    setter(current.includes(p) ? current.filter(x => x !== p) : [...current, p]);
  };

  const handleCreateInvite = async () => {
    setCreatingInv(true);
    try {
      // createInvite returns code; we need inviteId too — refetch to get it
      const code = await createInvite(invRole, invPerms);
      // Now find the invite we just created by code
      refetch();
      setLastCode(code);
      flash('Link de convite criado!', 'ok');
      // Register the code globally so acceptInvite can find it
      // We need the inviteId — grab from refetch'd invites or find by code in existing state
      // We'll register after refetch; use effect below
    } catch (e: any) {
      flash(e.message ?? 'Erro ao criar convite.', 'err');
    } finally {
      setCreatingInv(false);
    }
  };

  // Register invite code globally after invites reload
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const handleCreateInviteFull = async () => {
    setCreatingInv(true);
    try {
      const code = await createInvite(invRole, invPerms);
      // After createInvite resolves, invites state has the new invite with id
      // But state update is async; find from fresh fetch
      // We'll store the pending code and register after invites refresh
      setPendingCode(code);
      setLastCode(code);
      flash('Link criado! Copie e envie ao membro da equipe.', 'ok');
    } catch (e: any) {
      flash(e.message ?? 'Erro ao criar convite.', 'err');
    } finally {
      setCreatingInv(false);
    }
  };

  // Register code whenever invites update and we have a pending code
  React.useEffect(() => {
    if (!pendingCode || !ownerId) return;
    const invite = invites.find(i => i.code === pendingCode);
    if (invite) {
      registerInviteCode(pendingCode, ownerId, invite.id).catch(console.error);
      setLastInviteId(invite.id);
      setPendingCode(null);
    }
  }, [invites, pendingCode, ownerId]);

  const inviteLink = lastCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${lastCode}`
    : null;

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRevoke = async (uid: string) => {
    setRevoking(uid);
    try { await revokeMember(uid); }
    catch (e: any) { flash(e.message, 'err'); }
    finally { setRevoking(null); }
  };

  const openEditMember = (m: WorkspaceMember) => {
    setEditingMember(m);
    setEditRole(m.role);
    setEditPerms([...m.permissions]);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    setSavingEdit(true);
    try {
      await updateMemberPermissions(editingMember.uid, editRole, editPerms);
      setEditingMember(null);
      flash('Permissões atualizadas!', 'ok');
    } catch (e: any) {
      flash(e.message, 'err');
    } finally {
      setSavingEdit(false);
    }
  };

  const activeMembers  = members.filter(m => m.status === 'active');
  const revokedMembers = members.filter(m => m.status === 'revoked');

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={[s.content, isWide && s.contentWide]} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>⚙️ Configurações</Text>
          <Text style={s.pageSub}>Gerencie sua equipe, convites e permissões de acesso</Text>
        </View>
      </View>

      {invMsg ? (
        <View style={[s.flash, invMsgType === 'ok' ? s.flashOk : s.flashErr]}>
          <Text style={[s.flashText, { color: invMsgType === 'ok' ? C.green : C.red }]}>
            {invMsgType === 'ok' ? '✓ ' : '✕ '}{invMsg}
          </Text>
        </View>
      ) : null}

      {/* ── Active members ──────────────────────────────────────────────────── */}
      <SectionBlock
        title={`Membros Ativos (${activeMembers.length})`}
        subtitle="Clique em um membro para editar suas permissões"
        noPad
      >
        {activeMembers.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Nenhum membro ainda. Crie um convite abaixo.</Text>
          </View>
        ) : activeMembers.map(m => (
          <View key={m.uid} style={s.memberRow}>
            <View style={s.memberAvatar}>
              <Text style={s.memberAvatarText}>{(m.displayName?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View style={s.memberInfo}>
              <Text style={s.memberName}>{m.displayName}</Text>
              <Text style={s.memberEmail}>{m.email}</Text>
              <View style={s.memberRoleBadge}>
                <Text style={s.memberRoleText}>
                  {ROLE_ICONS[m.role] ?? '👤'} {ROLE_LABELS[m.role] ?? m.role}
                </Text>
              </View>
            </View>
            <View style={s.memberActions}>
              <Pressable
                style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.7 }]}
                onPress={() => openEditMember(m)}
              >
                <Text style={s.editBtnText}>✏️ Editar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.revokeBtn, pressed && { opacity: 0.7 }]}
                onPress={() => handleRevoke(m.uid)}
                disabled={revoking === m.uid}
              >
                {revoking === m.uid
                  ? <ActivityIndicator size="small" color={C.red} />
                  : <Text style={s.revokeBtnText}>🚫 Revogar</Text>
                }
              </Pressable>
            </View>
          </View>
        ))}
      </SectionBlock>

      {/* ── Edit member modal (inline) ───────────────────────────────────────── */}
      {editingMember && (
        <SectionBlock
          title={`Editar: ${editingMember.displayName}`}
          subtitle="Altere o cargo e as permissões individuais"
        >
          {/* Role picker */}
          <Text style={s.fieldLabel}>Cargo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
            <View style={s.chipRow}>
              {INVITE_ROLES.map(r => (
                <Pressable
                  key={r}
                  style={[s.roleChip, editRole === r && s.roleChipActive]}
                  onPress={() => { setEditRole(r); setEditPerms(ROLE_PRESETS[r] ?? []); }}
                >
                  <Text style={s.roleChipIcon}>{ROLE_ICONS[r]}</Text>
                  <Text style={[s.roleChipText, editRole === r && s.roleChipTextActive]}>
                    {ROLE_LABELS[r]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Permissions grid */}
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Permissões</Text>
          <View style={s.permGrid}>
            {PERM_MODULES.map(pm => (
              <View key={pm.module} style={s.permModule}>
                <Text style={s.permModuleLabel}>{pm.label}</Text>
                <View style={s.permToggles}>
                  <Pressable
                    style={[s.permToggle, editPerms.includes(pm.view) && s.permToggleOn]}
                    onPress={() => togglePerm(pm.view, editPerms, setEditPerms)}
                  >
                    <Text style={[s.permToggleText, editPerms.includes(pm.view) && s.permToggleTextOn]}>
                      👁 Ver
                    </Text>
                  </Pressable>
                  {pm.edit && (
                    <Pressable
                      style={[s.permToggle, editPerms.includes(pm.edit) && s.permToggleOn]}
                      onPress={() => pm.edit && togglePerm(pm.edit, editPerms, setEditPerms)}
                    >
                      <Text style={[s.permToggleText, pm.edit && editPerms.includes(pm.edit) && s.permToggleTextOn]}>
                        ✏️ Editar
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={s.editActions}>
            <Pressable
              style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.7 }]}
              onPress={() => setEditingMember(null)}
            >
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.saveBtn, savingEdit && s.saveBtnDisabled, pressed && { opacity: 0.85 }]}
              onPress={handleSaveEdit}
              disabled={savingEdit}
            >
              {savingEdit
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.saveBtnText}>Salvar alterações</Text>
              }
            </Pressable>
          </View>
        </SectionBlock>
      )}

      {/* ── Active invites ───────────────────────────────────────────────────── */}
      <SectionBlock
        title={`Convites Ativos (${invites.length})`}
        subtitle="Links de convite que ainda podem ser usados"
        noPad
      >
        {invites.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Nenhum convite criado.</Text>
          </View>
        ) : invites.map(inv => (
          <InviteRow key={inv.id} invite={inv} ownerId={ownerId} onDelete={() => deleteInvite(inv.id)} />
        ))}
      </SectionBlock>

      {/* ── Create invite ────────────────────────────────────────────────────── */}
      <SectionBlock
        title="Criar Convite"
        subtitle="Gere um link de acesso para um novo membro"
      >
        {/* Role picker */}
        <Text style={s.fieldLabel}>Cargo do convidado</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          <View style={s.chipRow}>
            {INVITE_ROLES.map(r => (
              <Pressable
                key={r}
                style={[s.roleChip, invRole === r && s.roleChipActive]}
                onPress={() => handleRoleChange(r)}
              >
                <Text style={s.roleChipIcon}>{ROLE_ICONS[r]}</Text>
                <Text style={[s.roleChipText, invRole === r && s.roleChipTextActive]}>
                  {ROLE_LABELS[r]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Permissions */}
        <Text style={[s.fieldLabel, { marginTop: 16 }]}>Permissões do convite</Text>
        <View style={s.permGrid}>
          {PERM_MODULES.map(pm => (
            <View key={pm.module} style={s.permModule}>
              <Text style={s.permModuleLabel}>{pm.label}</Text>
              <View style={s.permToggles}>
                <Pressable
                  style={[s.permToggle, invPerms.includes(pm.view) && s.permToggleOn]}
                  onPress={() => togglePerm(pm.view, invPerms, setInvPerms)}
                >
                  <Text style={[s.permToggleText, invPerms.includes(pm.view) && s.permToggleTextOn]}>
                    👁 Ver
                  </Text>
                </Pressable>
                {pm.edit && (
                  <Pressable
                    style={[s.permToggle, invPerms.includes(pm.edit!) && s.permToggleOn]}
                    onPress={() => pm.edit && togglePerm(pm.edit, invPerms, setInvPerms)}
                  >
                    <Text style={[s.permToggleText, pm.edit && invPerms.includes(pm.edit) && s.permToggleTextOn]}>
                      ✏️ Editar
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [s.createBtn, creatingInv && s.createBtnDisabled, pressed && { opacity: 0.85 }]}
          onPress={handleCreateInviteFull}
          disabled={creatingInv}
        >
          {creatingInv
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.createBtnText}>🔗 Gerar link de convite</Text>
          }
        </Pressable>

        {/* Generated link display */}
        {inviteLink && (
          <View style={s.linkBox}>
            <Text style={s.linkBoxLabel}>Link gerado:</Text>
            <View style={s.linkRow}>
              <Text style={s.linkText} numberOfLines={1}>{inviteLink}</Text>
              <Pressable
                style={({ pressed }) => [s.copyBtn, pressed && { opacity: 0.7 }]}
                onPress={handleCopy}
              >
                <Text style={s.copyBtnText}>{copied ? '✓ Copiado!' : '📋 Copiar'}</Text>
              </Pressable>
            </View>
            <Text style={s.linkNote}>Compartilhe este link com o membro. Ele será usado no cadastro.</Text>
          </View>
        )}
      </SectionBlock>

      {/* ── Revoked members ─────────────────────────────────────────────────── */}
      {revokedMembers.length > 0 && (
        <SectionBlock title={`Acessos Revogados (${revokedMembers.length})`} noPad>
          {revokedMembers.map(m => (
            <View key={m.uid} style={[s.memberRow, s.memberRowRevoked]}>
              <View style={[s.memberAvatar, s.memberAvatarRevoked]}>
                <Text style={s.memberAvatarText}>{(m.displayName?.[0] ?? '?').toUpperCase()}</Text>
              </View>
              <View style={s.memberInfo}>
                <Text style={[s.memberName, { color: C.text3 }]}>{m.displayName}</Text>
                <Text style={s.memberEmail}>{m.email}</Text>
                <View style={[s.memberRoleBadge, s.memberRoleBadgeRevoked]}>
                  <Text style={[s.memberRoleText, { color: C.red }]}>🚫 Acesso revogado</Text>
                </View>
              </View>
            </View>
          ))}
        </SectionBlock>
      )}

    </ScrollView>
  );
}

// ── InviteRow sub-component ───────────────────────────────────────────────────

function InviteRow({ invite, ownerId, onDelete }: { invite: WorkspaceInvite; ownerId: string; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?invite=${invite.code}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(); }
    finally { setDeleting(false); }
  };

  return (
    <View style={s.inviteRow}>
      <View style={s.inviteInfo}>
        <View style={s.inviteTop}>
          <Text style={s.inviteCode}>{invite.code}</Text>
          <View style={s.inviteRoleBadge}>
            <Text style={s.inviteRoleText}>
              {ROLE_ICONS[invite.role] ?? '👤'} {ROLE_LABELS[invite.role] ?? invite.role}
            </Text>
          </View>
        </View>
        <Text style={s.inviteUses}>
          {invite.uses}/{invite.maxUses > 0 ? invite.maxUses : '∞'} usos
        </Text>
      </View>
      <View style={s.inviteActions}>
        <Pressable
          style={({ pressed }) => [s.copyInvBtn, pressed && { opacity: 0.7 }]}
          onPress={handleCopy}
        >
          <Text style={s.copyInvBtnText}>{copied ? '✓' : '📋'}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.delInvBtn, pressed && { opacity: 0.7 }]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator size="small" color={C.red} />
            : <Text style={s.delInvBtnText}>✕</Text>
          }
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bgBase },
  content:     { padding: 16, gap: 16, paddingBottom: 48, maxWidth: 900, width: '100%', alignSelf: 'center' },
  contentWide: { paddingHorizontal: 24 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 4 },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: C.text1, letterSpacing: -0.3 },
  pageSub:    { fontSize: 13, color: C.text2, marginTop: 4 },

  flash:    { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  flashOk:  { backgroundColor: C.greenBg, borderColor: C.green },
  flashErr: { backgroundColor: C.redBg,   borderColor: C.red   },
  flashText:{ fontSize: 13, fontWeight: '600' },

  empty:    { padding: 24, alignItems: 'center' },
  emptyText:{ fontSize: 13, color: C.text3 },

  // Members
  memberRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  memberRowRevoked:{ opacity: 0.6 },
  memberAvatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderLt },
  memberAvatarRevoked: { backgroundColor: C.bgElevated },
  memberAvatarText:{ fontSize: 16, fontWeight: '800', color: C.primary },
  memberInfo:      { flex: 1 },
  memberName:      { fontSize: 14, fontWeight: '700', color: C.text1 },
  memberEmail:     { fontSize: 11, color: C.text3, marginTop: 1 },
  memberRoleBadge: { marginTop: 4, alignSelf: 'flex-start', backgroundColor: C.primaryBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  memberRoleBadgeRevoked: { backgroundColor: C.redBg },
  memberRoleText:  { fontSize: 11, fontWeight: '700', color: C.primary },
  memberActions:   { flexDirection: 'row', gap: 8 },
  editBtn:    { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput },
  editBtnText:{ fontSize: 11, fontWeight: '600', color: C.text2 },
  revokeBtn:  { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: C.red, backgroundColor: C.redBg },
  revokeBtnText: { fontSize: 11, fontWeight: '600', color: C.red },

  // Invite rows
  inviteRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  inviteInfo:   { flex: 1 },
  inviteTop:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inviteCode:   { fontSize: 15, fontWeight: '800', color: C.primary, fontFamily: 'monospace' },
  inviteRoleBadge: { backgroundColor: C.primaryBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  inviteRoleText:  { fontSize: 11, fontWeight: '700', color: C.primary },
  inviteUses:   { fontSize: 11, color: C.text3, marginTop: 3 },
  inviteActions:{ flexDirection: 'row', gap: 8 },
  copyInvBtn:   { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgInput },
  copyInvBtnText: { fontSize: 14 },
  delInvBtn:    { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: C.red, alignItems: 'center', justifyContent: 'center', backgroundColor: C.redBg },
  delInvBtnText:{ fontSize: 12, color: C.red, fontWeight: '700' },

  // Fields & chips
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.text2, letterSpacing: 0.3, marginBottom: 8 },
  chipScroll: { flexGrow: 0, marginBottom: 4 },
  chipRow:    { flexDirection: 'row', gap: 8, alignItems: 'center' },
  roleChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput },
  roleChipActive: { backgroundColor: C.primaryBg, borderColor: C.primary },
  roleChipIcon:   { fontSize: 14 },
  roleChipText:   { fontSize: 12, fontWeight: '600', color: C.text2 },
  roleChipTextActive: { color: C.primary },

  // Perms grid
  permGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  permModule:  { minWidth: '45%', flex: 1, backgroundColor: C.bgElevated, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 10, gap: 8 },
  permModuleLabel: { fontSize: 12, fontWeight: '700', color: C.text2 },
  permToggles: { flexDirection: 'row', gap: 6 },
  permToggle:  { flex: 1, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: C.border, alignItems: 'center', backgroundColor: C.bgInput },
  permToggleOn:{ backgroundColor: C.primaryBg, borderColor: C.primary },
  permToggleText:    { fontSize: 11, fontWeight: '600', color: C.text3 },
  permToggleTextOn:  { color: C.primary },

  // Edit actions
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn:   { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.bgInput },
  cancelBtnText:{ fontSize: 14, fontWeight: '600', color: C.text2 },
  saveBtn:     {
    flex: 2, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Create invite
  createBtn: {
    height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4,
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  createBtnDisabled: { opacity: 0.55 },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  linkBox:   { marginTop: 14, backgroundColor: C.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: C.borderLt, padding: 14, gap: 10 },
  linkBoxLabel: { fontSize: 11, fontWeight: '700', color: C.text3, letterSpacing: 0.5 },
  linkRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkText:  { flex: 1, fontSize: 12, color: C.primary, fontFamily: 'monospace' },
  copyBtn:   { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primary },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: C.primary },
  linkNote:  { fontSize: 11, color: C.text3 },
});
