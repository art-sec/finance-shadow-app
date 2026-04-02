/**
 * SimpleSection - Seção com Título e Conteúdo
 * Agrupa informações relacionadas
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  icon?: string;
  children: React.ReactNode;
};

export default function SimpleSection({ title, icon, children }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    backgroundColor: '#121427',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#232651',
    marginBottom: 16,
  },
  header: {
    backgroundColor: 'transparent',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#232651',
    gap: 10,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#E5E2FF',
  },
  content: {
    padding: 16,
  },
});
