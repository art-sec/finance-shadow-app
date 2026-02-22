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
  
  // Filtra valores válidos (remove NaN, Infinity, etc)
  const validPoints = useMemo(() => {
    return points.filter(p => typeof p.value === 'number' && Number.isFinite(p.value));
  }, [points]);

  const maxValue = useMemo(() => {
    if (validPoints.length === 0) return 1;
    return Math.max(...validPoints.map((p) => p.value), 1);
  }, [validPoints]);
  
  const minValue = useMemo(() => {
    if (validPoints.length === 0) return 0;
    return Math.min(...validPoints.map((p) => p.value), 0);
  }, [validPoints]);

  // Calcula escala inteligente com tratamento de outliers
  const calculateOptimalScale = () => {
    // Função auxiliar para detectar outliers usando IQR (Interquartile Range)
    const getOutlierBounds = (values: number[]) => {
      if (values.length < 4) return { lower: Math.min(...values), upper: Math.max(...values) };
      
      const sorted = [...values].sort((a, b) => a - b);
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1 || 1;
      
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      return { lower: lowerBound, upper: upperBound };
    };

    // Se houver range muito grande (outlier extremo), ignora outlier para melhor visualização
    const allValues = validPoints.map(p => p.value);
    const range = maxValue - minValue || 1;
    const { lower: outlierLower, upper: outlierUpper } = getOutlierBounds(allValues);
    
    // Define limites de visualização inteligentes
    let displayMin = minValue;
    let displayMax = maxValue;
    
    // Se há outlier extremo abaixo, tenta usar quartil inferior
    if (minValue < outlierLower && range > outlierLower * 2) {
      displayMin = outlierLower;
    }
    
    // Se há outlier extremo acima, tenta usar quartil superior
    if (maxValue > outlierUpper && range > outlierUpper * 0.5) {
      displayMax = outlierUpper;
    }
    
    // Sempre adiciona padding (10% acima e abaixo)
    const displayRange = Math.max(displayMax - displayMin, 1);
    const padding = displayRange * 0.1;
    displayMax = displayMax + padding;
    displayMin = Math.max(0, displayMin - padding); // Nunca vai abaixo de 0 para dados financeiros
    
    const finalRange = displayMax - displayMin || 1;
    
    // Define steps redondos para diferentes escalas
    let step = 1;
    if (finalRange > 1000) {
      step = Math.pow(10, Math.floor(Math.log10(finalRange)) - 1);
      step = Math.ceil(finalRange / 5 / step) * step;
    } else if (finalRange > 100) {
      step = Math.ceil(finalRange / 5 / 10) * 10;
    } else if (finalRange > 10) {
      step = Math.ceil(finalRange / 5);
    }

    // Calcula valores com step redondo
    const calcMin = Math.floor(displayMin / step) * step;
    const calcMax = Math.ceil(displayMax / step) * step;
    const calcRange = calcMax - calcMin;

    const yVals = [];
    const gridCount = Math.max(5, Math.ceil(calcRange / step));
    for (let i = 0; i <= gridCount; i++) {
      yVals.push(calcMin + step * i);
    }

    return { yValues: yVals, minVal: calcMin, maxVal: calcMax, range: calcRange, actualMin: minValue, actualMax: maxValue };
  };

  const { yValues, minVal, maxVal, range, actualMin, actualMax } = useMemo(() => calculateOptimalScale(), [maxValue, minValue, validPoints]);

  // Formata números para exibição legível
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

  // Renderiza o gráfico apenas se houver dados válidos
  if (validPoints.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Sem dados para exibir</Text>
        </View>
      </View>
    );
  }

  // Dimensões aumentadas para melhor legibilidade
  const chartHeight = 240;
  const chartWidth = 300;
  const padding = 40;
  const leftPadding = 0;
  const bottomPadding = 40;

  const normalizeY = (value: number) => {
    return chartHeight - ((value - minVal) / range) * chartHeight;
  };

  const normalizeX = (index: number) => {
    return (index / (validPoints.length - 1 || 1)) * chartWidth;
  };

  const pathPoints = validPoints
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
              {formatNumber(value)}
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
                    bottom: (i / (yValues.length - 1 || 1)) * chartHeight,
                    opacity: i === 0 ? 0.3 : 0.15,
                  },
                ]}
              />
            ))}

            <svg
              width={chartWidth + leftPadding}
              height={chartHeight + padding + bottomPadding}
              style={styles.svg}
              viewBox={`0 0 ${chartWidth + leftPadding} ${chartHeight + padding + bottomPadding}`}
            >
              <polyline
                points={validPoints
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
              {validPoints.map((point, index) => {
                const x = normalizeX(index) + leftPadding;
                const y = normalizeY(point.value) + padding;
                
                // Calcula posição do tooltip para não sair da tela
                const tooltipWidth = 100;
                const tooltipHeight = 50;
                let tooltipX = x - tooltipWidth / 2;
                let tooltipY = y - tooltipHeight - 15;
                
                // Ajusta se tooltip sair para esquerda
                if (tooltipX < 10) tooltipX = 10;
                // Ajusta se tooltip sair para direita
                if (tooltipX + tooltipWidth > chartWidth + leftPadding - 10) {
                  tooltipX = chartWidth + leftPadding - tooltipWidth - 10;
                }
                // Ajusta se tooltip sair para cima
                if (tooltipY < 5) tooltipY = y + 15;
                
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
                          x={tooltipX}
                          y={tooltipY}
                          width={tooltipWidth}
                          height={tooltipHeight}
                          fill="#0E1026"
                          stroke={color}
                          strokeWidth="2"
                          rx="6"
                        />
                        {/* Tooltip text - label */}
                        <text
                          x={tooltipX + tooltipWidth / 2}
                          y={tooltipY + 18}
                          textAnchor="middle"
                          fill="#E5E2FF"
                          fontSize="11"
                          fontWeight="600"
                          fontFamily="monospace"
                        >
                          {point.label}
                        </text>
                        {/* Tooltip text - value */}
                        <text
                          x={tooltipX + tooltipWidth / 2}
                          y={tooltipY + 35}
                          textAnchor="middle"
                          fill={color}
                          fontSize="13"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {point.value.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
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
            {validPoints.map((point, index) => (
              <View
                key={index}
                style={[
                  styles.xLabelContainer,
                  { width: chartWidth / (validPoints.length - 1 || 1) },
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
    width: 50,
    height: 240,
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  yLabel: {
    color: '#A9ACD9',
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'monospace',
    textAlign: 'right',
  },
  chartContent: {
    flex: 1,
  },
  gridContainer: {
    position: 'relative',
    width: 300,
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
    marginTop: 4,
    width: 300,
    height: 30,
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
