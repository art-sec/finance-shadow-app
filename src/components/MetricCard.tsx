import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';

export type MetricCardProps = {
  label:    string;
  value:    string;
  icon:     string;
  color:    string;
  trend?:   number | null;  // % change vs previous period
  subtitle?: string;
};

export default function MetricCard({ label, value, icon, color, trend, subtitle }: MetricCardProps) {
  const hasTrend = trend !== null && trend !== undefined;
  const trendUp  = hasTrend && trend! > 0;
  const trendNeutral = hasTrend && trend! === 0;

  const trendColor = trendNeutral ? C.text3 : trendUp ? C.green : C.red;
  const trendLabel = hasTrend
    ? `${trendUp ? '↑' : trendNeutral ? '→' : '↓'} ${Math.abs(trend!).toFixed(1)}%`
    : null;

  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      {/* Top row: icon + trend */}
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        {trendLabel && (
          <View style={[styles.trendBadge, { backgroundColor: trendColor + '18' }]}>
            <Text style={[styles.trendText, { color: trendColor }]}>{trendLabel}</Text>
          </View>
        )}
      </View>

      {/* Value */}
      <Text style={[styles.value, { color }]}>{value}</Text>

      {/* Label + subtitle */}
      <Text style={styles.label}>{label}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: C.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderTopWidth: 2,
    gap: 6,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
  trendBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  trendText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  value: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 12, fontWeight: '600', color: C.text2, textTransform: 'uppercase', letterSpacing: 0.5 },
  subtitle: { fontSize: 11, color: C.text3 },
});
