import React, { useMemo, useState } from 'react';
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxValue = useMemo(() => Math.max(...points.map((p) => p.value), 1), [points]);
  const minValue = useMemo(() => Math.min(...points.map((p) => p.value), 0), [points]);
  const range = maxValue - minValue || 1;

  // Dimensões aumentadas para melhor legibilidade
  const chartHeight = 280;
  const chartWidth = 380;
  const padding = 50;
  const leftPadding = 70;

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
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((point, index) => {
                const x = normalizeX(index) + leftPadding;
                const y = normalizeY(point.value) + padding;
                return (
                  <g
                    key={index}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill={color}
                      stroke="#0B0B1A"
                      strokeWidth="2.5"
                      style={{
                        filter: hoveredIndex === index ? 'drop-shadow(0 0 8px rgba(229, 226, 255, 0.6))' : 'none',
                        transition: 'filter 0.2s ease',
                      }}
                    />
                    {hoveredIndex === index && (
                      <g>
                        {/* Tooltip background */}
                        <rect
                          x={x - 60}
                          y={y - 60}
                          width="120"
                          height="50"
                          fill="#0E1026"
                          stroke={color}
                          strokeWidth="2"
                          rx="6"
                        />
                        {/* Tooltip text - label */}
                        <text
                          x={x}
                          y={y - 40}
                          textAnchor="middle"
                          fill="#E5E2FF"
                          fontSize="12"
                          fontWeight="600"
                          fontFamily="monospace"
                        >
                          {point.label}
                        </text>
                        {/* Tooltip text - value */}
                        <text
                          x={x}
                          y={y - 22}
                          textAnchor="middle"
                          fill={color}
                          fontSize="14"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {point.value.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </text>
                      </g>
                    )}
                  </g>
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
    color: '#E5E2FF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  chartContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxis: {
    width: 70,
    height: 330,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yLabel: {
    color: '#A9ACD9',
    fontSize: 12,
    fontWeight: '500',
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
    pointerEvents: 'auto',
  },
  xAxis: {
    flexDirection: 'row',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  xLabelContainer: {
    alignItems: 'center',
  },
  xLabel: {
    color: '#A9ACD9',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
