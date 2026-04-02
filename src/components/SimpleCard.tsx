/**
 * SimpleCard - Card Simples com Informação Clara
 * Mostra um título e um valor de forma muito visível
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: string;
  color?: string;
  icon?: string;
};

export default function SimpleCard({ label, value, color = '#2196F3', icon }: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141732',
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 6,
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  label: {
    color: '#9EA4DB',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    color: '#F4F2FF',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
