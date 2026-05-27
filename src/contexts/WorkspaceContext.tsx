import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection, doc, getDoc, getDocs, serverTimestamp,
  setDoc, deleteDoc, addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ── Permission system ────────────────────────────────────────────────────────

export type Permission =
  | 'view:overview' | 'edit:overview'
  | 'view:models'   | 'edit:models'
  | 'view:accounts' | 'edit:accounts'
  | 'view:team'     | 'edit:team'
  | 'view:todos'    | 'edit:todos'
  | 'view:finance'  | 'edit:finance'
  | 'view:content'  | 'edit:content'
  | 'view:devices'  | 'edit:devices'
  | 'view:settings';

export const ALL_PERMISSIONS: Permission[] = [
  'view:overview','edit:overview',
  'view:models','edit:models',
  'view:accounts','edit:accounts',
  'view:team','edit:team',
  'view:todos','edit:todos',
  'view:finance','edit:finance',
  'view:content','edit:content',
  'view:devices','edit:devices',
];

export const ROLE_PRESETS: Record<string, Permission[]> = {
  manager: [
    'view:overview','edit:overview',
    'view:models','edit:models',
    'view:accounts','edit:accounts',
    'view:team','edit:team',
    'view:todos','edit:todos',
    'view:content','edit:content',
    'view:devices','edit:devices',
  ],
  account_manager: [
    'view:overview',
    'view:models',
    'view:accounts','edit:accounts',
    'view:todos','edit:todos',
    'view:finance',
  ],
  chatter: [
    'view:overview',
    'view:accounts','edit:accounts',
    'view:todos','edit:todos',
  ],
  va: [
    'view:overview',
    'view:accounts',
    'view:todos','edit:todos',
  ],
  content_manager: [
    'view:overview',
    'view:models',
    'view:accounts',
    'view:content','edit:content',
    'view:todos','edit:todos',
  ],
};

export const ROLE_LABELS: Record<string, string> = {
  owner:           'Dono',
  manager:         'Gerente',
  account_manager: 'Account Manager',
  chatter:         'Chatter',
  va:              'VA',
  content_manager: 'Content Manager',
};

export const ROLE_ICONS: Record<string, string> = {
  owner: '👑', manager: '🏆', account_manager: '📋',
  chatter: '💬', va: '🤝', content_manager: '🎬',
};

// ── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceMember = {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  permissions: Permission[];
  status: 'active' | 'revoked';
  joinedAt?: any;
};

export type WorkspaceInvite = {
  id: string;
  code: string;
  role: string;
  permissions: Permission[];
  createdAt?: any;
  maxUses: number;
  uses: number;
};

type WorkspaceContextType = {
  isOwner: boolean;
  ownerId: string;
  role: string;
  permissions: Permission[];
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  isLoading: boolean;
  hasPermission: (p: Permission | string) => boolean;
  canView: (tab: string) => boolean;
  canEdit: (module: string) => boolean;
  createInvite: (role: string, perms: Permission[], maxUses?: number) => Promise<string>;
  deleteInvite: (id: string) => Promise<void>;
  revokeMember: (uid: string) => Promise<void>;
  updateMemberPermissions: (uid: string, role: string, perms: Permission[]) => Promise<void>;
  refetch: () => void;
};

// ── Context ──────────────────────────────────────────────────────────────────

const WorkspaceContext = createContext<WorkspaceContextType>({
  isOwner: true, ownerId: '', role: 'owner', permissions: ALL_PERMISSIONS,
  members: [], invites: [], isLoading: false,
  hasPermission: () => true, canView: () => true, canEdit: () => true,
  createInvite: async () => '', deleteInvite: async () => {},
  revokeMember: async () => {}, updateMemberPermissions: async () => {},
  refetch: () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

type ProviderProps = { userId: string | null; children: React.ReactNode };

export function WorkspaceProvider({ userId, children }: ProviderProps) {
  const [isOwner,     setIsOwner]     = useState(true);
  const [ownerId,     setOwnerId]     = useState('');
  const [role,        setRole]        = useState('owner');
  const [permissions, setPermissions] = useState<Permission[]>(ALL_PERMISSIONS);
  const [members,     setMembers]     = useState<WorkspaceMember[]>([]);
  const [invites,     setInvites]     = useState<WorkspaceInvite[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [tick,        setTick]        = useState(0);

  useEffect(() => {
    if (!userId) { setIsLoading(false); return; }
    let mounted = true;

    const init = async () => {
      setIsLoading(true);
      try {
        // Check if this user is a member of another workspace
        const membershipDoc = await getDoc(doc(db, 'userMemberships', userId));

        if (membershipDoc.exists()) {
          // This user is a MEMBER
          const ms = membershipDoc.data();
          const wsId: string = ms.workspaceId;
          const memberDoc = await getDoc(doc(db, 'workspaces', wsId, 'members', userId));
          if (!mounted) return;
          if (memberDoc.exists()) {
            const md = memberDoc.data();
            if (md.status === 'revoked') {
              // Access revoked — treat as no workspace
              setIsOwner(false);
              setOwnerId(wsId);
              setRole('revoked');
              setPermissions([]);
            } else {
              setIsOwner(false);
              setOwnerId(wsId);
              setRole(md.role ?? 'va');
              setPermissions(md.permissions ?? ROLE_PRESETS[md.role] ?? []);
            }
          }
        } else {
          // This user is an OWNER
          if (!mounted) return;
          setIsOwner(true);
          setOwnerId(userId);
          setRole('owner');
          setPermissions(ALL_PERMISSIONS);

          // Load members and invites for settings screen
          const [membersSnap, invitesSnap] = await Promise.all([
            getDocs(collection(db, 'workspaces', userId, 'members')),
            getDocs(collection(db, 'workspaces', userId, 'invites')),
          ]);
          if (!mounted) return;
          setMembers(membersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as WorkspaceMember)));
          setInvites(invitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkspaceInvite)));
        }
      } catch (e) {
        console.error('WorkspaceContext init error', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, [userId, tick]);

  const hasPermission = (p: Permission | string) => {
    if (isOwner) return true;
    return permissions.includes(p as Permission);
  };
  const canView = (tab: string) => hasPermission(`view:${tab}` as Permission);
  const canEdit = (module: string) => hasPermission(`edit:${module}` as Permission);

  const generateCode = () =>
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase();

  const createInvite = async (invRole: string, perms: Permission[], maxUses = 1) => {
    if (!userId) throw new Error('Not authenticated');
    const code = generateCode();
    const inviteRef = doc(collection(db, 'workspaces', userId, 'invites'));
    const invite: Omit<WorkspaceInvite, 'id'> = {
      code, role: invRole, permissions: perms,
      maxUses, uses: 0, createdAt: serverTimestamp(),
    };
    await setDoc(inviteRef, invite);
    setInvites(prev => [...prev, { id: inviteRef.id, ...invite }]);
    return code;
  };

  const deleteInvite = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'workspaces', userId, 'invites', id));
    setInvites(prev => prev.filter(i => i.id !== id));
  };

  const revokeMember = async (uid: string) => {
    if (!userId) return;
    await setDoc(
      doc(db, 'workspaces', userId, 'members', uid),
      { status: 'revoked' }, { merge: true }
    );
    setMembers(prev => prev.map(m => m.uid === uid ? { ...m, status: 'revoked' } : m));
  };

  const updateMemberPermissions = async (uid: string, newRole: string, perms: Permission[]) => {
    if (!userId) return;
    await setDoc(
      doc(db, 'workspaces', userId, 'members', uid),
      { role: newRole, permissions: perms }, { merge: true }
    );
    setMembers(prev => prev.map(m =>
      m.uid === uid ? { ...m, role: newRole, permissions: perms } : m
    ));
  };

  const refetch = () => setTick(t => t + 1);

  return (
    <WorkspaceContext.Provider value={{
      isOwner, ownerId, role, permissions, members, invites, isLoading,
      hasPermission, canView, canEdit,
      createInvite, deleteInvite, revokeMember, updateMemberPermissions, refetch,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ── Invite acceptance (called during registration) ───────────────────────────

export async function acceptInvite(
  code: string,
  newUid: string,
  email: string,
  displayName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find invite by code — search workspace invites
    // We use a global invites index for quick lookup
    const globalRef = doc(db, 'inviteCodes', code);
    const globalSnap = await getDoc(globalRef);
    if (!globalSnap.exists()) return { success: false, error: 'Código inválido ou expirado.' };

    const globalData = globalSnap.data();
    const workspaceId: string = globalData.workspaceId;
    const inviteId: string    = globalData.inviteId;

    // Get the actual invite
    const inviteRef  = doc(db, 'workspaces', workspaceId, 'invites', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    if (!inviteSnap.exists()) return { success: false, error: 'Convite não encontrado.' };

    const inviteData = inviteSnap.data() as Omit<WorkspaceInvite, 'id'>;
    if (inviteData.maxUses > 0 && inviteData.uses >= inviteData.maxUses) {
      return { success: false, error: 'Convite já atingiu o limite de usos.' };
    }

    // Write membership
    await Promise.all([
      // 1. workspace members collection
      setDoc(doc(db, 'workspaces', workspaceId, 'members', newUid), {
        uid: newUid, email, displayName,
        role: inviteData.role,
        permissions: inviteData.permissions,
        status: 'active',
        joinedAt: serverTimestamp(),
      }),
      // 2. user membership lookup
      setDoc(doc(db, 'userMemberships', newUid), {
        workspaceId,
        role: inviteData.role,
        joinedAt: serverTimestamp(),
      }),
      // 3. increment invite uses
      setDoc(inviteRef, { uses: inviteData.uses + 1 }, { merge: true }),
    ]);

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Helper: register invite code in global index ─────────────────────────────

export async function registerInviteCode(
  code: string,
  workspaceId: string,
  inviteId: string,
) {
  await setDoc(doc(db, 'inviteCodes', code), { workspaceId, inviteId });
}
