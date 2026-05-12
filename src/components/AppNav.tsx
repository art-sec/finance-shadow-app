import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

type Tab = { id: string; label: string; icon: string };

type Props = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  userEmail?: string | null;
  onSignOut: () => void;
};

export default function AppNav({ tabs, activeTab, onTabChange, userEmail, onSignOut }: Props) {
  return (
    <View style={styles.bar}>
      {/* Logo */}
      <View style={styles.logo}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>SF</Text>
        </View>
        <Text style={styles.logoName}>Shadow Finances</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map(tab => {
          const active = tab.id === activeTab;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => onTabChange(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {active && <View style={styles.tabIndicator} />}
            </Pressable>
          );
        })}
      </View>

      {/* User */}
      <View style={styles.user}>
        {userEmail && (
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(userEmail[0] ?? '?').toUpperCase()}</Text>
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
          </View>
        )}
        <Pressable style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]} onPress={onSignOut}>
          <Text style={styles.signOutText}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    backgroundColor: C.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 16,
    // @ts-ignore
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },

  logo: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 160 },
  logoMark: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    // @ts-ignore
    background: 'linear-gradient(135deg, #7C5CFF 0%, #4A2FC9 100%)',
    backgroundColor: C.primary,
  },
  logoText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  logoName: { fontSize: 15, fontWeight: '700', color: C.text1, letterSpacing: -0.2 },

  tabs: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    position: 'relative',
  },
  tabActive: { backgroundColor: C.primaryBg },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: 14, fontWeight: '600', color: C.text2 },
  tabLabelActive: { color: C.primary },
  tabIndicator: {
    position: 'absolute',
    bottom: -12,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: C.primary,
  },

  user: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 160, justifyContent: 'flex-end' },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.primaryBg,
    borderWidth: 1, borderColor: C.borderLt,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: C.primary },
  userEmail: { fontSize: 12, color: C.text2, maxWidth: 140 },
  signOutBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  signOutText: { fontSize: 12, fontWeight: '600', color: C.text2 },
});
