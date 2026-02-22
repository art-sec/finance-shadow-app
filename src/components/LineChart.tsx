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
  
  // Garante que temos exatamente os dados passados, sem filtros
  const chartData = useMemo(() => {
    return points.map(p => ({
      ...p,
      value: typeof p.value === 'number' && Number.isFinite(p.value) ? p.value : 0
    }));
  }, [points]);

  // Encontra max/min apenas dentre valores reais (não zerados)
  const realValues = useMemo(() => {
    return chartData.filter(p => p.value > 0).map(p => p.value);
  }, [chartData]);

  const maxValue = useMemo(() => {
    return realValues.length > 0 ? Math.max(...realValues) : 1;
  }, [realValues]);

  // Calcula escala com padding
  const { yMin, yMax, step, gridLines } = useMemo(() => {
    if (maxValue === 0) {
      return { yMin: 0, yMax: 10, step: 2, gridLines: [0, 2, 4, 6, 8, 10] };
    }

    const yMax = maxValue * 1.2; // 20% padding acima
    const range = yMax; // começa sempre de 0
    
    // Calcula step inteligente
    let step = 1;
    if (range > 1000) {
      step = Math.pow(10, Math.floor(Math.log10(range)) - 1);
      step = Math.ceil(range / 5 / step) * step;
    } else if (range > 100) {
      step = Math.ceil(range / 5 / 10) * 10;
    } else if (range > 10) {
      step = Math.ceil(range / 5);
    }

    const gridLines = [];
    for (let i = 0; i <= yMax; i += step) {
      if (i <= yMax) gridLines.push(i);
    }

    return { yMin: 0, yMax, step, gridLines };
  }, [maxValue]);

  // Dimensões fixas
  const SVG_WIDTH = 300;
  const SVG_HEIGHT = 240;
  const PADDING_TOP = 10;
  const PADDING_BOTTOM = 30;
  const PADDING_LEFT = 10;
  const PADDING_RIGHT = 10;

  const chartAreaWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartAreaHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Converte dado para coordenadas SVG
  const getPoint = (index: number, value: number) => {
    const x = PADDING_LEFT + (index / (chartData.length - 1 || 1)) * chartAreaWidth;
    const y = PADDING_TOP + chartAreaHeight - ((value - yMin) / (yMax - yMin)) * chartAreaHeight;
    return { x, y };
  };

  // Monta string de pontos para polyline
  const pointsString = useMemo(() => {
    return chartData
      .map((p, idx) => {
        const { x, y } = getPoint(idx, p.value);
        return `${x},${y}`;
      })
      .join(' ');
  }, [chartData, yMin, yMax]);

  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    return Math.round(num).toString();
  };

  if (chartData.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Sem dados para exibir</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartWrapper}>
        {/* Y-Axis Labels */}
        <View style={styles.yAxisLabels}>
          {gridLines.map((val, idx) => (
            <View key={idx} style={styles.yLabelRow}>
              <Text style={styles.yLabel}>{formatNumber(val)}</Text>
            </View>
          ))}
        </View>

        {/* SVG Chart Area */}
        <View style={styles.svgWrapper}>
          <svg width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} style={styles.svg}>
            {/* Grid Lines */}
            {gridLines.map((val, idx) => {
              const yPos = PADDING_TOP + chartAreaHeight - ((val - yMin) / (yMax - yMin)) * chartAreaHeight;
              return (
                <line
                  key={`grid-${idx}`}
                  x1={PADDING_LEFT}
                  y1={yPos}
                  x2={SVG_WIDTH - PADDING_RIGHT}
                  y2={yPos}
                  stroke="#2B2F63"
                  strokeWidth="1"
                  opacity={val === 0 ? 0.4 : 0.15}
                />
              );
            })}

            {/* Polyline */}
            <polyline
              points={pointsString}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points com Hover */}
            {chartData.map((point, idx) => {
              const { x, y } = getPoint(idx, point.value);
              
              return (
                <g key={`point-${idx}`}>
                  {/* Invisible hitbox */}
                  <circle
                    cx={x}
                    cy={y}
                    r="14"
                    fill="transparent"
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  
                  {/* Visible point */}
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill={color}
                    stroke="#0B0B1A"
                    strokeWidth="2"
                    style={{
                      filter: hoveredIndex === idx ? 'drop-shadow(0 0 8px rgba(229, 226, 255, 0.8))' : 'none',
                      transition: 'filter 0.15s',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Tooltip */}
                  {hoveredIndex === idx && (
                    <g>
                      <rect
                        x={Math.max(5, Math.min(x - 50, SVG_WIDTH - 105))}
                        y={y > 80 ? y - 65 : y + 15}
                        width="100"
                        height="55"
                        fill="#0E1026"
                        stroke={color}
                        strokeWidth="2"
                        rx="6"
                        style={{ pointerEvents: 'none' }}
                      />
                      <text
                        x={Math.max(5, Math.min(x - 50, SVG_WIDTH - 105)) + 50}
                        y={y > 80 ? y - 40 : y + 32}
                        textAnchor="middle"
                        fill="#E5E2FF"
                        fontSize="11"
                        fontWeight="600"
                        style={{ pointerEvents: 'none' }}
                      >
                        {point.label}
                      </text>
                      <text
                        x={Math.max(5, Math.min(x - 50, SVG_WIDTH - 105)) + 50}
                        y={y > 80 ? y - 22 : y + 50}
                        textAnchor="middle"
                        fill={color}
                        fontSize="13"
                        fontWeight="700"
                        style={{ pointerEvents: 'none' }}
                      >
                        {formatNumber(point.value)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </View>
      </View>

      {/* X-Axis Labels */}
      <View style={styles.xAxisLabels}>
        {chartData.map((point, idx) => (
          <View key={idx} style={styles.xLabelCol}>
            <Text style={styles.xLabel}>{point.label}</Text>
          </View>
        ))}
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
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  chartWrapper: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  yAxisLabels: {
    width: 50,
    height: 240,
    justifyContent: 'space-between',
    paddingVertical: 0,
  },
  yLabelRow: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  yLabel: {
    color: '#A9ACD9',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'monospace',
    textAlign: 'right',
  },
  svgWrapper: {
    position: 'relative',
    width: 300,
    height: 240,
    backgroundColor: '#0E1026',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  xAxisLabels: {
    flexDirection: 'row',
    width: 300,
    height: 28,
  },
  xLabelCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  xLabel: {
    color: '#A9ACD9',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  emptyState: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0E1026',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B2F63',
  },
  emptyStateText: {
    color: '#8C8FB3',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
