import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { C } from '../theme';
import OverviewScreen  from '../screens/OverviewScreen';
import BillingScreen   from '../screens/BillingScreen';
import ModelsScreen    from '../screens/ModelsScreen';
import TeamScreen      from '../screens/TeamScreen';
import TodoScreen      from '../screens/TodoScreen';
import ContentScreen   from '../screens/ContentScreen';
import DevicesScreen   from '../screens/DevicesScreen';

type Tab = 'overview' | 'models' | 'team' | 'todos' | 'finance' | 'content' | 'devices';

const NAV: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'overview',  label: 'Visão Geral',   icon: '📊', desc: 'KPIs e métricas' },
  { id: 'models',    label: 'Modelos',        icon: '👤', desc: 'Contas das modelos' },
  { id: 'team',      label: 'Equipe',         icon: '👥', desc: 'VAs e gestores' },
  { id: 'todos',     label: 'Tarefas',        icon: '✅', desc: 'Lista de afazeres' },
  { id: 'finance',   label: 'Financeiro',     icon: '💰', desc: 'Gastos e receitas' },
  { id: 'content',   label: 'Conteúdo',       icon: '🎬', desc: 'Sprints e campanhas' },
  { id: 'devices',   label: 'Dispositivos',   icon: '📱', desc: 'Farm de iPhones' },
];

type Props = { userEmail?: string | null; userId?: string | null };

export default function AppShell({ userEmail, userId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const [active, setActive] = useState<Tab>('overview');

  const Screen = () => {
    switch (active) {
      case 'overview': return <OverviewScreen userId={userId} />;
      case 'models':   return <ModelsScreen   userId={userId} />;
      case 'team':     return <TeamScreen     userId={userId} />;
      case 'todos':    return <TodoScreen     userId={userId} />;
      case 'finance':  return <BillingScreen  userId={userId} selectedMonth="Jan" />;
      case 'content':  return <ContentScreen  userId={userId} />;
      case 'devices':  return <DevicesScreen  userId={userId} />;
    }
  };

  const avatarLetter = (userEmail?.[0] ?? '?').toUpperCase();

  if (isWide) {
    return (
      <View style={s.wide}>
        {/* ── Sidebar ── */}
        <View style={s.sidebar}>
          {/* Logo */}
          <View style={s.logo}>
            <View style={s.logoMark}>
              <Text style={s.logoMarkText}>SO</Text>
            </View>
            <View>
              <Text style={s.logoName}>Shadow OFM</Text>
              <Text style={s.logoSub}>Agency Hub</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={s.divider} />

          {/* Nav items */}
          <View style={s.nav}>
            {NAV.map(item => {
              const isActive = item.id === active;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [s.navItem, isActive && s.navItemActive, pressed && !isActive && s.navItemHover]}
                  onPress={() => setActive(item.id)}
                >
                  {isActive && <View style={s.navAccent} />}
                  <Text style={[s.navIcon, isActive && s.navIconActive]}>{item.icon}</Text>
                  <View style={s.navText}>
                    <Text style={[s.navLabel, isActive && s.navLabelActive]}>{item.label}</Text>
                    <Text style={s.navDesc}>{item.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* User */}
          <View style={s.divider} />
          <View style={s.sidebarUser}>
            <View style={s.userRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{avatarLetter}</Text>
              </View>
              <Text style={s.userEmail} numberOfLines={1}>{userEmail}</Text>
            </View>
            <Pressable style={({ pressed }) => [s.signOut, pressed && s.signOutPressed]} onPress={() => signOut(auth)}>
              <Text style={s.signOutText}>↩ Sair</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Main content ── */}
        <View style={s.content}>
          <Screen />
        </View>
      </View>
    );
  }

  // Mobile layout
  return (
    <View style={s.mobile}>
      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.topLogo}>
          <View style={s.logoMarkSm}>
            <Text style={s.logoMarkSmText}>SO</Text>
          </View>
          <Text style={s.topLogoName}>Shadow OFM</Text>
        </View>
        <View style={s.topRight}>
          <View style={s.avatarSm}>
            <Text style={s.avatarText}>{avatarLetter}</Text>
          </View>
          <Pressable style={({ pressed }) => [s.signOutSm, pressed && { opacity: 0.7 }]} onPress={() => signOut(auth)}>
            <Text style={s.signOutText}>Sair</Text>
          </Pressable>
        </View>
      </View>

      {/* Scrollable tabs */}
      <View style={s.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBarContent}>
          {NAV.map(item => {
            const isActive = item.id === active;
            return (
              <Pressable key={item.id} style={[s.tab, isActive && s.tabActive]} onPress={() => setActive(item.id)}>
                <Text style={[s.tabIcon, isActive && s.tabIconActive]}>{item.icon}</Text>
                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{item.label}</Text>
                {isActive && <View style={s.tabIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={s.mobileContent}>
        <Screen />
      </View>
    </View>
  );
}

const SIDEBAR_W = 230;

const s = StyleSheet.create({
  // Desktop
  wide: { flex: 1, flexDirection: 'row', backgroundColor: C.bgBase },

  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: C.bgDeep,
    borderRightWidth: 1,
    borderRightColor: C.border,
    // @ts-ignore
    position: 'sticky',
    top: 0,
    // @ts-ignore
    height: '100vh',
    flexDirection: 'column',
  },

  logo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  logoMark: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  logoMarkText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  logoName: { fontSize: 14, fontWeight: '800', color: C.text1, letterSpacing: -0.3 },
  logoSub:  { fontSize: 10, color: C.text3, marginTop: 1, letterSpacing: 0.5 },

  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 12 },

  nav: { paddingHorizontal: 10, paddingTop: 8, gap: 1 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
    position: 'relative', overflow: 'hidden',
  },
  navItemActive: { backgroundColor: C.primaryBg },
  navItemHover:  { backgroundColor: C.bgElevated },
  navAccent: {
    position: 'absolute', left: 0, top: 6, bottom: 6,
    width: 3, borderRadius: 2, backgroundColor: C.primary,
  },
  navIcon:       { fontSize: 17, width: 22, textAlign: 'center' },
  navIconActive: {},
  navText:       { flex: 1 },
  navLabel:      { fontSize: 13, fontWeight: '600', color: C.text2, letterSpacing: 0.1 },
  navLabelActive:{ color: C.primary, fontWeight: '700' },
  navDesc:       { fontSize: 10, color: C.text3, marginTop: 1 },

  sidebarUser: { padding: 14, gap: 10 },
  userRow:     { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar:      { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.borderLt, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 12, fontWeight: '800', color: C.primary },
  userEmail:   { flex: 1, fontSize: 11, color: C.text2 },
  signOut:     { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  signOutPressed: { backgroundColor: C.bgElevated },
  signOutText: { fontSize: 11, fontWeight: '600', color: C.text2 },

  content: { flex: 1, backgroundColor: C.bgBase },

  // Mobile
  mobile: { flex: 1, backgroundColor: C.bgBase },

  topBar: {
    flexDirection: 'row', alignItems: 'center', height: 52,
    paddingHorizontal: 16, gap: 10,
    backgroundColor: C.bgDeep, borderBottomWidth: 1, borderBottomColor: C.border,
    // @ts-ignore
    position: 'sticky', top: 0, zIndex: 100,
  },
  topLogo:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoMarkSm:  {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  logoMarkSmText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  topLogoName: { fontSize: 14, fontWeight: '800', color: C.text1 },
  topRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarSm:    { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryBg, alignItems: 'center', justifyContent: 'center' },
  signOutSm:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: C.border },

  tabBar: {
    backgroundColor: C.bgDeep, borderBottomWidth: 1, borderBottomColor: C.border,
    // @ts-ignore
    position: 'sticky', top: 52, zIndex: 99,
  },
  tabBarContent: { paddingHorizontal: 8, gap: 2, flexDirection: 'row' },
  tab:           { paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', position: 'relative', flexDirection: 'row', gap: 6 },
  tabActive:     {},
  tabIcon:       { fontSize: 14 },
  tabIconActive: {},
  tabLabel:      { fontSize: 12, fontWeight: '600', color: C.text2 },
  tabLabelActive:{ color: C.primary, fontWeight: '700' },
  tabIndicator:  { position: 'absolute', bottom: 0, left: 6, right: 6, height: 2, borderRadius: 1, backgroundColor: C.primary },

  mobileContent: { flex: 1 },
});
