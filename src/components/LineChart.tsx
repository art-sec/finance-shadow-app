import React, { useMemo, useState, useCallback } from 'react';
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

const LABEL_W = 44;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 4;
const PADDING_RIGHT = 16;
const SVG_H = 190;
const CHART_H = SVG_H - PADDING_TOP - PADDING_BOTTOM;

const formatNumber = (n: number) => {
  if (n === 0) return '0';
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(n % 1 !== 0 ? 2 : 0);
};

export default function LineChart({ title, points, color }: Props) {
  const [svgWidth, setSvgWidth] = useState(320);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const onContainerLayout = useCallback((e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setSvgWidth(w);
  }, []);

  const data = useMemo(() =>
    points.map(p => ({
      ...p,
      value: Number.isFinite(p.value) ? p.value : 0,
    })), [points]);

  const { yMax, gridLines } = useMemo(() => {
    const positives = data.filter(p => p.value > 0).map(p => p.value);
    if (positives.length === 0) return { yMax: 10, gridLines: [0, 2, 4, 6, 8, 10] };

    const rawMax = Math.max(...positives) * 1.25;
    let step = 1;
    if (rawMax > 1_000) {
      const mag = Math.pow(10, Math.floor(Math.log10(rawMax)) - 1);
      step = Math.ceil(rawMax / 5 / mag) * mag;
    } else if (rawMax > 100) {
      step = Math.ceil(rawMax / 5 / 10) * 10;
    } else if (rawMax > 10) {
      step = Math.ceil(rawMax / 5);
    }

    const lines: number[] = [];
    for (let v = 0; v <= rawMax + step; v += step) {
      lines.push(v);
      if (lines.length > 6) break;
    }
    return { yMax: lines[lines.length - 1], gridLines: lines };
  }, [data]);

  const chartW = svgWidth - LABEL_W - PADDING_RIGHT;

  const getXY = useCallback((idx: number, val: number) => ({
    x: LABEL_W + (idx / Math.max(data.length - 1, 1)) * chartW,
    y: PADDING_TOP + CHART_H - (val / yMax) * CHART_H,
  }), [data.length, chartW, yMax]);

  const { lineStr, fillStr } = useMemo(() => {
    if (data.length === 0) return { lineStr: '', fillStr: '' };
    const pts = data.map((p, i) => getXY(i, p.value));
    const lineStr = pts.map(({ x, y }) => `${x},${y}`).join(' ');
    const bottomY = PADDING_TOP + CHART_H;
    const fillStr = [
      ...pts.map(({ x, y }) => `${x},${y}`),
      `${pts[pts.length - 1].x},${bottomY}`,
      `${pts[0].x},${bottomY}`,
    ].join(' ');
    return { lineStr, fillStr };
  }, [data, getXY]);

  const gradId = `g${title.replace(/\W/g, '')}`;

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Sem dados</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.svgWrap} onLayout={onContainerLayout}>
        <svg
          width={svgWidth}
          height={SVG_H}
          viewBox={`0 0 ${svgWidth} ${SVG_H}`}
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.30" />
              <stop offset="85%" stopColor={color} stopOpacity="0.03" />
            </linearGradient>
            <clipPath id={`clip-${gradId}`}>
              <rect x={LABEL_W} y={0} width={chartW + PADDING_RIGHT} height={SVG_H} />
            </clipPath>
          </defs>

          {/* Y-axis labels */}
          {[...gridLines].reverse().map((val, i) => {
            const y = PADDING_TOP + CHART_H - (val / yMax) * CHART_H;
            return (
              <text
                key={i}
                x={LABEL_W - 8}
                y={y + 4}
                textAnchor="end"
                fill="#6B70A3"
                fontSize="10"
                fontFamily="monospace"
              >
                {formatNumber(val)}
              </text>
            );
          })}

          {/* Grid lines */}
          {gridLines.map((val, i) => {
            const y = PADDING_TOP + CHART_H - (val / yMax) * CHART_H;
            const isBase = val === 0;
            return (
              <line
                key={i}
                x1={LABEL_W}
                y1={y}
                x2={svgWidth - PADDING_RIGHT}
                y2={y}
                stroke={isBase ? '#2B2F63' : '#1C2047'}
                strokeWidth="1"
                strokeDasharray={isBase ? 'none' : '3,5'}
              />
            );
          })}

          {/* Gradient fill */}
          <polygon
            points={fillStr}
            fill={`url(#${gradId})`}
            clipPath={`url(#clip-${gradId})`}
          />

          {/* Line */}
          <polyline
            points={lineStr}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points + hover */}
          {data.map((point, idx) => {
            const { x, y } = getXY(idx, point.value);
            const hovered = hoveredIdx === idx;

            const ttX = Math.max(LABEL_W + 4, Math.min(x - 44, svgWidth - 96));
            const ttY = y > 70 ? y - 58 : y + 14;

            return (
              <g key={idx}>
                {/* Glow ring */}
                {hovered && (
                  <circle cx={x} cy={y} r="16" fill={color} opacity="0.12" style={{ pointerEvents: 'none' }} />
                )}

                {/* Visible dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={hovered ? 6 : 3.5}
                  fill={hovered ? color : '#0E1026'}
                  stroke={color}
                  strokeWidth="2"
                  style={{ pointerEvents: 'none', transition: 'r 0.12s' }}
                />

                {/* Invisible hitbox */}
                <circle
                  cx={x}
                  cy={y}
                  r="18"
                  fill="transparent"
                  style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />

                {/* Tooltip */}
                {hovered && (
                  <g style={{ pointerEvents: 'none' }}>
                    {/* Vertical guide line */}
                    <line
                      x1={x} y1={PADDING_TOP}
                      x2={x} y2={PADDING_TOP + CHART_H}
                      stroke={color}
                      strokeWidth="1"
                      opacity="0.35"
                      strokeDasharray="3,3"
                    />
                    <rect
                      x={ttX} y={ttY}
                      width={88} height={46}
                      rx={8}
                      fill="#0D0F24"
                      stroke={color}
                      strokeWidth="1.5"
                      opacity="0.97"
                    />
                    <text
                      x={ttX + 44} y={ttY + 17}
                      textAnchor="middle"
                      fill="#8B8FB3"
                      fontSize="10"
                      fontWeight="500"
                    >
                      {point.label}
                    </text>
                    <text
                      x={ttX + 44} y={ttY + 34}
                      textAnchor="middle"
                      fill={color}
                      fontSize="13"
                      fontWeight="700"
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

      {/* X-axis labels */}
      <View style={[styles.xAxis, { paddingLeft: LABEL_W, paddingRight: PADDING_RIGHT }]}>
        {data.map((p, i) => (
          <Text key={i} style={styles.xLabel}>{p.label}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111328',
    borderRadius: 16,
    paddingTop: 18,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  title: {
    color: '#C8C5F0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  svgWrap: {
    width: '100%',
  },
  xAxis: {
    flexDirection: 'row',
    marginTop: 6,
  },
  xLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#555882',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  empty: {
    height: SVG_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#555882',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
