import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import type { DayStat } from '../../utils/calorieStats';
import {
  colors,
  fonts,
  getProgressTone,
  progressColor,
  progressMute,
  radii,
  spacing,
  typography,
} from '../../constants/theme';
import { formatShortDate } from '../../utils/date';

interface CalorieLineChartProps {
  days: DayStat[];
}

const CHART_HEIGHT = 148;
const X_AXIS_HEIGHT = 20;
const PAD_TOP = 10;
const PAD_BOTTOM = 0;
const Y_AXIS_WIDTH = 28;
const PAD_RIGHT = 4;

function formatAxisValue(value: number): string {
  if (value >= 10_000) {
    return `${Math.round(value / 1000)}k`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(Math.round(value));
}

function getXLabelIndices(dayCount: number): number[] {
  const tickCount = dayCount <= 7 ? dayCount : 6;
  if (tickCount === dayCount) {
    return Array.from({ length: dayCount }, (_, index) => index);
  }
  const indices = new Set<number>();
  for (let i = 0; i < tickCount; i += 1) {
    indices.add(Math.round((i / (tickCount - 1)) * (dayCount - 1)));
  }
  return [...indices].sort((a, b) => a - b);
}

function formatXLabel(dateKey: string): string {
  const [, month, day] = dateKey.split('-').map(Number);
  return `${month}/${day}`;
}

export function CalorieLineChart({ days }: CalorieLineChartProps) {
  const [plotWidth, setPlotWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [days]);

  const onPlotLayout = (event: LayoutChangeEvent) => {
    setPlotWidth(event.nativeEvent.layout.width);
  };

  const maxY = useMemo(
    () =>
      Math.max(
        ...days.map(day =>
          Math.max(
            Number.isFinite(day.total) ? day.total : 0,
            Number.isFinite(day.target) ? day.target : 0,
          ),
        ),
        1,
      ),
    [days],
  );

  if (!days.length) {
    return null;
  }

  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const gridRatios = [0, 0.25, 0.5, 0.75, 1];

  const xForIndex = (index: number) => {
    if (days.length === 1) {
      return plotWidth / 2;
    }
    return (index / (days.length - 1)) * plotWidth;
  };

  const yForValue = (value: number) =>
    PAD_TOP + plotHeight - (value / maxY) * plotHeight;

  // Break the "Eaten" line on unlogged days: one polyline per run of
  // consecutive logged days. Single-day runs are shown by their dot only.
  const eatenSegments: string[] = [];
  let currentSegment: string[] = [];
  days.forEach((day, index) => {
    if (day.logged) {
      currentSegment.push(`${xForIndex(index)},${yForValue(day.total)}`);
      return;
    }
    if (currentSegment.length > 1) {
      eatenSegments.push(currentSegment.join(' '));
    }
    currentSegment = [];
  });
  if (currentSegment.length > 1) {
    eatenSegments.push(currentSegment.join(' '));
  }

  const targetPoints = days
    .map((day, index) => `${xForIndex(index)},${yForValue(day.target)}`)
    .join(' ');

  const xLabelIndices = getXLabelIndices(days.length);

  const selectedDay =
    selectedIndex !== null ? days[selectedIndex] ?? null : null;

  const handleSelect = (index: number) => {
    setSelectedIndex(current => (current === index ? null : index));
  };

  const tooltipLeft =
    selectedIndex !== null
      ? Math.min(
          Math.max(xForIndex(selectedIndex) - 72, 0),
          Math.max(plotWidth - 144, 0),
        )
      : 0;

  const tooltipTop =
    selectedIndex !== null
      ? Math.max(yForValue(days[selectedIndex]!.total) - 58, 0)
      : 0;

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendEaten]} />
          <Text style={styles.legendText}>Eaten</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, styles.legendTarget]} />
          <Text style={styles.legendText}>Target</Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { height: CHART_HEIGHT }]}>
          {gridRatios
            .slice()
            .reverse()
            .map(ratio => {
              const y = PAD_TOP + plotHeight * (1 - ratio);
              return (
                <Text
                  key={ratio}
                  style={[styles.yLabel, { top: y - 8 }]}>
                  {formatAxisValue(maxY * ratio)}
                </Text>
              );
            })}
        </View>

        <View style={styles.plotColumn}>
          <Pressable
            style={[styles.plotArea, { height: CHART_HEIGHT }]}
            onLayout={onPlotLayout}
            onPress={() => setSelectedIndex(null)}>
            {plotWidth > 0 ? (
              <>
                <Svg width={plotWidth} height={CHART_HEIGHT}>
                  {gridRatios.map(ratio => {
                    const y = PAD_TOP + plotHeight * (1 - ratio);
                    const isBaseline = ratio === 0;
                    return (
                      <Line
                        key={ratio}
                        x1={0}
                        y1={y}
                        x2={plotWidth}
                        y2={y}
                        stroke={isBaseline ? colors.textSecondary : colors.border}
                        strokeWidth={isBaseline ? 1.5 : 1}
                        opacity={isBaseline ? 0.35 : 1}
                      />
                    );
                  })}

                  <Polyline
                    points={targetPoints}
                    fill="none"
                    stroke={colors.saffron}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {eatenSegments.map(points => (
                    <Polyline
                      key={points}
                      points={points}
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                  ))}

                  {days.map((day, index) => {
                    if (!day.logged) {
                      return null;
                    }
                    const tone = getProgressTone(day.total, day.target);
                    const selected = selectedIndex === index;
                    return (
                      <Circle
                        key={day.date}
                        cx={xForIndex(index)}
                        cy={yForValue(day.total)}
                        r={selected ? 6 : 4}
                        fill={progressColor(tone)}
                        stroke={colors.surface}
                        strokeWidth={selected ? 2 : 1.5}
                      />
                    );
                  })}
                </Svg>

                {days.map((day, index) => {
                  if (!day.logged) {
                    return null;
                  }
                  const x = xForIndex(index);
                  const y = yForValue(day.total);
                  return (
                    <Pressable
                      key={`hit-${day.date}`}
                      style={[
                        styles.dotHit,
                        { left: x - 14, top: y - 14 },
                      ]}
                      onPress={event => {
                        event.stopPropagation();
                        handleSelect(index);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatShortDate(day.date)}, ${day.total} calories eaten`}
                    />
                  );
                })}

                {selectedDay ? (
                  <View
                    style={[
                      styles.tooltip,
                      { left: tooltipLeft, top: tooltipTop },
                    ]}>
                    <Text style={styles.tooltipDate}>
                      {formatShortDate(selectedDay.date)}
                    </Text>
                    <Text style={styles.tooltipRow}>
                      <Text style={styles.tooltipEaten}>
                        {selectedDay.total.toLocaleString()}
                      </Text>
                      <Text style={styles.tooltipMuted}> eaten</Text>
                    </Text>
                    <Text style={styles.tooltipRow}>
                      <Text style={styles.tooltipTarget}>
                        {selectedDay.target.toLocaleString()}
                      </Text>
                      <Text style={styles.tooltipMuted}> target</Text>
                    </Text>
                    <Text
                      style={[
                        styles.tooltipDelta,
                        {
                          color: progressColor(
                            getProgressTone(
                              selectedDay.total,
                              selectedDay.target,
                            ),
                          ),
                          backgroundColor: progressMute(
                            getProgressTone(
                              selectedDay.total,
                              selectedDay.target,
                            ),
                          ),
                        },
                      ]}>
                      {selectedDay.deltaFromTarget === 0
                        ? 'On target'
                        : selectedDay.deltaFromTarget > 0
                          ? `${selectedDay.deltaFromTarget.toLocaleString()} over`
                          : `${Math.abs(selectedDay.deltaFromTarget).toLocaleString()} under`}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </Pressable>

          {plotWidth > 0 ? (
            <View style={[styles.xAxisRow, { width: plotWidth, height: X_AXIS_HEIGHT }]}>
              {xLabelIndices.map(index => {
                const day = days[index]!;
                const x = xForIndex(index);
                const label = formatXLabel(day.date);
                const labelWidth = 30;
                const left = Math.min(
                  Math.max(x - labelWidth / 2, 0),
                  plotWidth - labelWidth,
                );
                return (
                  <Text
                    key={day.date}
                    style={[styles.xLabel, { left, width: labelWidth }]}
                    numberOfLines={1}>
                    {label}
                  </Text>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.footnote}>
        Tap a dot for details · targets vary when goals change
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 16,
    height: 3,
    borderRadius: radii.pill,
  },
  legendEaten: {
    backgroundColor: colors.primary,
  },
  legendTarget: {
    backgroundColor: colors.saffron,
    opacity: 0.85,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    position: 'relative',
    paddingRight: spacing.xs,
  },
  yLabel: {
    position: 'absolute',
    right: 0,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    
  },
  plotColumn: {
    flex: 1,
    paddingRight: PAD_RIGHT,
  },
  plotArea: {
    width: '100%',
    position: 'relative',
  },
  dotHit: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  tooltip: {
    position: 'absolute',
    width: 144,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 2,
  },
  tooltipDate: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tooltipRow: {
    ...typography.caption,
  },
  tooltipEaten: {
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  tooltipTarget: {
    fontFamily: fonts.bodySemiBold,
    color: colors.saffron,
  },
  tooltipMuted: {
    color: colors.textSecondary,
  },
  tooltipDelta: {
    ...typography.caption,
    fontFamily: fonts.bodySemiBold,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  xAxisRow: {
    position: 'relative',
    marginTop: 2,
  },
  xLabel: {
    position: 'absolute',
    top: 0,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.text,
    textAlign: 'center',
  },
  footnote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
