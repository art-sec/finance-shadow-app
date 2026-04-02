/**
 * SimpleTabs - Abas Grandes e Claras com Ícones
 * Para navegação intuitiva
 */

import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';

type Tab = {
  id: string;
  label: string;
  icon: string;
};

type Props = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

export default function SimpleTabs({ tabs, activeTab, onTabChange }: Props) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          style={[
            styles.tab,
            activeTab === tab.id && styles.tabActive,
          ]}
          onPress={() => onTabChange(tab.id)}
        >
          <Text style={styles.icon}>{tab.icon}</Text>
          <Text style={[
            styles.label,
            activeTab === tab.id && styles.labelActive,
          ]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#121427',
    borderBottomWidth: 1,
    borderBottomColor: '#232651',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabActive: {
    borderBottomColor: '#7C5CFF',
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9EA4DB',
    textAlign: 'center',
  },
  labelActive: {
    color: '#F4F2FF',
    fontWeight: '700',
  },
});
