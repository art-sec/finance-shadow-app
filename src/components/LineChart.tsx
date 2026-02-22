import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type LineChartPoint = {
  label: string;
  value: number;
};

type Props = {
  title: string;
  points: LineChartPoint[];
  color: string;
};

export default function LineChart({ title, points, color }: Props) {
  const maxValue = useMemo(() => Math.max(...points.map((p) => p.value), 1), [points]);
  const minValue = useMemo(() => Math.min(...points.map((p) => p.value), 0), [points]);
  const range = maxValue - minValue || 1;

  const chartHeight = 200;
  const chartWidth = 280;
  const padding = 40;
  const leftPadding = 50;

  const normalizeY = (value: number) => {
    return chartHeight - ((value - minValue) / range) * chartHeight;
  };

  const normalizeX = (index: number) => {
    return (index / (points.length - 1 || 1)) * (chartWidth - padding * 2);
  };

  const gridLines = 5;
  const yValues = [];
  for (let i = 0; i <= gridLines; i++) {
    yValues.push(minValue + (range / gridLines) * i);
  }

  const pathPoints = points
    .map((point, index) => {
      const x = normalizeX(index) + leftPadding;
      const y = normalizeY(point.value) + padding;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartContainer}>
        <View style={styles.yAxis}>
          {yValues.map((value, i) => (
            <Text key={i} style={styles.yLabel}>
              {Math.round(value).toString().padStart(3, ' ')}
            </Text>
          ))}
        </View>

        <View style={styles.chartContent}>
          <View style={styles.gridContainer}>
            {yValues.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {
                    bottom: (i / gridLines) * chartHeight,
                    opacity: i === 0 ? 0.3 : 0.15,
                  },
                ]}
              />
            ))}

            <svg
              width={chartWidth}
              height={chartHeight + padding * 2}
              style={styles.svg}
            >
              <polyline
                points={points
                  .map((point, index) => {
                    const x = normalizeX(index) + leftPadding;
                    const y = normalizeY(point.value) + padding;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((point, index) => {
                const x = normalizeX(index) + leftPadding;
                const y = normalizeY(point.value) + padding;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={color}
                    stroke="#0B0B1A"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>
          </View>

          <View style={styles.xAxis}>
            {points.map((point, index) => (
              <View
                key={index}
                style={[
                  styles.xLabelContainer,
                  { width: chartWidth / (points.length - 1 || 1) },
                ]}
              >
                <Text style={styles.xLabel}>{point.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141732',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  title: {
    color: '#C7C9E6',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  chartContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxis: {
    width: 50,
    height: 240,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yLabel: {
    color: '#8C8FB3',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  chartContent: {
    flex: 1,
  },
  gridContainer: {
    position: 'relative',
    width: 280,
    height: 240,
    backgroundColor: '#0E1026',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#2B2F63',
    left: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  xAxis: {
    flexDirection: 'row',
    marginTop: 8,
  },
  xLabelContainer: {
    alignItems: 'center',
  },
  xLabel: {
    color: '#8C8FB3',
    fontSize: 10,
    textAlign: 'center',
  },
});
