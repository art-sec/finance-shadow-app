/**
 * SimpleMetrics - Exibe Métricas de Forma Clara
 * Mostra os principais KPIs resumidamente
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import SimpleCard from './SimpleCard';

export type MetricItem = {
  label: string;
  value: string;
  color?: string;
  icon?: string;
};

type Props = {
  metrics: MetricItem[];
  columns?: number;
};

export default function SimpleMetrics({ metrics, columns = 2 }: Props) {
  return (
    <View style={styles.container}>
      {metrics.map((metric, index) => (
        <View key={index} style={[styles.metricWrapper, columns === 1 && styles.fullWidth]}>
          <SimpleCard
            label={metric.label}
            value={metric.value}
            color={metric.color || '#4CAF50'}
            icon={metric.icon}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 12,
  },
  metricWrapper: {
    flex: 1,
    minWidth: '45%',
  },
  fullWidth: {
    minWidth: '100%',
  },
});
