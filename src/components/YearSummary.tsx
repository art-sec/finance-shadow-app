import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../theme';
import type { MonthlyData } from '../utils/finance';
import { formatCurrency } from '../utils/finance';

type Props = { data: MonthlyData[] };

export default function YearSummary({ data }: Props) {
  const nonZero = data.filter(d => d.faturamento > 0);
  if (nonZero.length === 0) return null;

  const totalRevenue = nonZero.reduce((s, d) => s + d.faturamento, 0);
  const totalProfit  = nonZero.reduce((s, d) => s + (d.faturamento - d.anuncios - d.funcionarios), 0);
  const totalAdsCost = nonZero.reduce((s, d) => s + d.anuncios, 0);
  const totalReturn  = nonZero.reduce((s, d) => s + d.retornoAnuncios, 0);
  const avgRoas      = totalAdsCost > 0 ? totalReturn / totalAdsCost : 0;
  const bestMonth    = nonZero.reduce((best, d) => d.faturamento > best.faturamento ? d : best, nonZero[0]);
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const items = [
    { label: 'Faturamento YTD',  value: formatCurrency(totalRevenue), color: C.primary, icon: '💰' },
    { label: 'Lucro Acumulado',  value: formatCurrency(totalProfit),  color: totalProfit >= 0 ? C.green : C.red, icon: '📈' },
    { label: 'Margem Média',     value: `${profitMargin.toFixed(1)}%`, color: C.cyan,   icon: '🎯' },
    { label: 'ROAS Médio',       value: `${avgRoas.toFixed(2)}x`,      color: C.amber,  icon: '📢' },
    { label: 'Melhor Mês',       value: bestMonth.month,               color: C.violet, icon: '🏆' },
    { label: 'Meses com dados',  value: `${nonZero.length} / 12`,      color: C.text2,  icon: '📅' },
  ];

  return (
    <View style={styles.container}>
      {/* gradient top bar */}
      <View style={styles.topBar} />
      <View style={styles.inner}>
        <Text style={styles.heading}>Resumo do Ano</Text>
        <View style={styles.grid}>
          {items.map((item, i) => (
            <View key={i} style={styles.cell}>
              <Text style={styles.cellIcon}>{item.icon}</Text>
              <Text style={[styles.cellValue, { color: item.color }]}>{item.value}</Text>
              <Text style={styles.cellLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  topBar: {
    height: 3,
    // @ts-ignore
    background: 'linear-gradient(90deg, #7C5CFF 0%, #4EC5FF 50%, #00E5A0 100%)',
    backgroundColor: C.primary,
  },
  inner: { padding: 20 },
  heading: { fontSize: 13, fontWeight: '700', color: C.text2, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: {
    flex: 1, minWidth: '28%',
    backgroundColor: C.bgElevated,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 4,
  },
  cellIcon:  { fontSize: 20, marginBottom: 2 },
  cellValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  cellLabel: { fontSize: 11, color: C.text3, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
});
