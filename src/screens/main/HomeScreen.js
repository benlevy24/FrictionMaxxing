import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, Dimensions, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import {
  getSettings,
  getEvents,
  getToday,
  deriveTodayStats,
  deriveHourlyByApp,
  deriveMostUsedApps,
  deriveMinutesSaved,
} from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

// ── Constants ─────────────────────────────────────────────────────────────────

const RING_SIZE   = 200;
const RING_STROKE = 22;
const BAR_MAX_H   = 90;
const CHART_H     = BAR_MAX_H + 28 + 14; // bar + bubble slot + label

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMin(m) {
  if (!m) return '0m';
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
  }
  return `${m}m`;
}

function fmtHour(h) {
  if (h === 0 || h === 24) return '12a';
  if (h === 23) return '12a'; // close the loop — chart reads 12a → 12a
  if (h < 12)  return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Ring chart ────────────────────────────────────────────────────────────────
// Uses SVG on web via React.createElement (no react-native-svg needed for web preview).
// Native gets a simple border-circle fallback until react-native-svg is added.

function RingChart({ pct, overGoal }) {
  const cx   = RING_SIZE / 2;
  const cy   = RING_SIZE / 2;
  const r    = (RING_SIZE - RING_STROKE) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(Math.max(pct, 0), 1) * circ;
  const stroke = overGoal ? colors.danger : colors.primary;

  if (Platform.OS === 'web') {
    return React.createElement(
      'svg',
      { width: RING_SIZE, height: RING_SIZE, style: { transform: 'rotate(-90deg)', display: 'block' } },
      React.createElement('circle', { cx, cy, r, fill: 'none', stroke: colors.border, strokeWidth: RING_STROKE }),
      React.createElement('circle', { cx, cy, r, fill: 'none', stroke, strokeWidth: RING_STROKE,
        strokeDasharray: `${dash} ${circ}`, strokeLinecap: 'round' })
    );
  }

  return (
    <View style={{
      width: RING_SIZE, height: RING_SIZE,
      borderRadius: RING_SIZE / 2,
      borderWidth: RING_STROKE, borderColor: colors.border,
    }} />
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const [loading,      setLoading]      = useState(true);
  const [today,        setToday]        = useState({ intercepted: 0, walkedAway: 0, openedAnyway: 0, rageQuit: 0 });
  const [yesterday,    setYesterday]    = useState({ intercepted: 0 });
  const [hourly,       setHourly]       = useState([]);
  const [mostUsed,     setMostUsed]     = useState([]);
  const [estimates,    setEstimates]    = useState({});
  const [goalMinutes,  setGoalMinutes]  = useState(120);
  const [minutesSavedToday, setMinutesSavedToday] = useState(0);
  const [selectedHour,      setSelectedHour]      = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [settings, events] = await Promise.all([getSettings(), getEvents()]);
        if (!active) return;
        const todayStr = getToday();
        const yestStr  = getYesterday();
        setToday(deriveTodayStats(events, todayStr));
        setYesterday(deriveTodayStats(events, yestStr));
        setHourly(deriveHourlyByApp(events, todayStr));
        // [POST-MAC #20] replace appUsageEstimates with real DeviceActivityReport data here.
        // deriveMostUsedApps second arg becomes real per-app screen time; estimates arg can be dropped.
        setMostUsed(deriveMostUsedApps(events, settings.appUsageEstimates ?? {}, todayStr));
        setEstimates(settings.appUsageEstimates ?? {});
        setGoalMinutes(settings.screentimeGoalMinutes ?? 120);
        // [POST-MAC #20] minutesSavedToday uses estimated avg session × walk-aways/rage-quits.
        // Replace with (real yesterday avg screen time − real today screen time) once
        // screenTimePermissionGranted = true and DeviceActivityReport data is available.
        const todayEvts = events.filter((e) => e.date === todayStr);
        setMinutesSavedToday(deriveMinutesSaved(todayEvts, settings.appUsageEstimates ?? {}));
        setLoading(false);
      }
      load();
      return () => { active = false; };
    }, [])
  );

  if (loading) return <ScreenWrapper />;

  // Screen time ring
  // [POST-MAC #20] replace estimate math below with real today's screen time from DeviceActivityReport.
  // totalDailyEst becomes today's actual minutes (updated live). hasEstimates check becomes
  // settings.screenTimePermissionGranted. "avg daily est." label in ring center becomes "today".
  const hasEstimates  = Object.values(estimates).some((e) => e.weeklyMinutes > 0);
  const totalDailyEst = Object.values(estimates).reduce(
    (s, e) => s + (e.weeklyMinutes ? Math.round(e.weeklyMinutes / 7) : 0), 0
  );
  const ringPct  = hasEstimates ? totalDailyEst / goalMinutes : 0;
  const overGoal = totalDailyEst > goalMinutes;

  // Pickup delta vs yesterday
  // [POST-MAC #20] today.intercepted is friction-event count (proxy for pickups until real Screen Time data available)
  const pickupDelta = today.intercepted - yesterday.intercepted;
  const deltaLabel  = yesterday.intercepted === 0 && today.intercepted === 0
    ? 'no pickups yet today 🤞'
    : pickupDelta > 0
      ? `↑ ${pickupDelta} more pickup${pickupDelta !== 1 ? 's' : ''} than yesterday`
      : pickupDelta < 0
        ? `↓ ${Math.abs(pickupDelta)} fewer pickup${Math.abs(pickupDelta) !== 1 ? 's' : ''} than yesterday`
        : 'same pickups as yesterday';

  // Hourly chart
  const maxCount = Math.max(...hourly.map((h) => h.count), 1);
  const nowHour  = new Date().getHours();

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <AppText variant="xxl">today</AppText>
          <AppText variant="caption" style={styles.headerDate}>{dateLabel}</AppText>
        </View>

        {/* Ring + delta */}
        <View style={styles.ringSection}>
          <TouchableOpacity
            style={styles.ringWrap}
            onPress={() => navigation.navigate('UsageEstimates')}
            activeOpacity={0.8}
          >
            <RingChart pct={ringPct} overGoal={overGoal} />
            <View style={styles.ringCenter}>
              {hasEstimates ? (
                <>
                  <AppText variant="xxl" style={[styles.ringTime, overGoal && styles.ringTimeOver]}>
                    {fmtMin(totalDailyEst)}
                  </AppText>
                  <AppText style={styles.ringEstLabel}>avg daily est.</AppText>
                  <AppText variant="caption" style={styles.ringGoalLabel}>
                    of {fmtMin(goalMinutes)} goal
                  </AppText>
                </>
              ) : (
                <>
                  <AppText variant="xl" style={styles.ringNoData}>—</AppText>
                  <AppText variant="xs" style={styles.ringGoalLabel}>tap to{'\n'}set up</AppText>
                </>
              )}
            </View>
          </TouchableOpacity>

          <AppText variant="caption" style={styles.deltaText}>{deltaLabel}</AppText>
          <AppText variant="xs" style={styles.estimateNote}>
            {hasEstimates
              ? 'avg estimate · real-time screen time unlocks after Screen Time permission · tap ring to adjust'
              : 'tap ring to add your Screen Time averages and set a daily goal'}
          </AppText>
        </View>

        {/* Stat chips */}
        {/* [POST-MAC #20] "vs avg" chip: once screenTimePermissionGranted, replace minutesSavedToday
            with (historical pre-app daily average − today's real screen time) for a true before/after.
            That delta can be negative (used MORE than avg) — the emoji/sign logic below handles both. */}
        <View style={styles.chipsRow}>
          <StatChip emoji="🫳" value={today.intercepted} label="pickups" />
          <StatChip
            emoji={minutesSavedToday > 0 ? '⬇️' : minutesSavedToday < 0 ? '⬆️' : '⬇️'}
            value={
              !hasEstimates || minutesSavedToday === 0
                ? '—'
                : minutesSavedToday > 0
                  ? `−${fmtMin(minutesSavedToday)}`
                  : `+${fmtMin(Math.abs(minutesSavedToday))}`
            }
            label="vs avg"
            dim={!hasEstimates || minutesSavedToday === 0}
          />
          <StatChip emoji="🔔" value="—" label="notifications" dim />
        </View>

        {/* Hourly pickup chart */}
        <Card>
          <AppText variant="subheading" style={styles.cardTitle}>app pickups by hour</AppText>
          <AppText variant="caption" style={styles.cardSub}>tap a bar to see which apps</AppText>

          <View style={[styles.chart, { height: CHART_H }]}>
            {hourly.map(({ hour, count, topApp, apps }) => {
              const barH    = count > 0 ? Math.max(Math.round((count / maxCount) * BAR_MAX_H), 8) : 3;
              const isNow   = hour === nowHour;
              const isSel   = selectedHour === hour;
              const showLbl = hour % 6 === 0 || hour === 23;

              return (
                <TouchableOpacity
                  key={hour}
                  style={styles.hourCol}
                  onPress={() => count > 0 && setSelectedHour(isSel ? null : hour)}
                  activeOpacity={count > 0 ? 0.7 : 1}
                >
                  {/* Emoji bubble above bar */}
                  <View style={styles.bubbleSlot}>
                    {topApp && count > 0 && (
                      <View style={[styles.appBubble, isSel && styles.appBubbleSel]}>
                        <AppText style={styles.bubbleEmoji}>{topApp.emoji}</AppText>
                      </View>
                    )}
                  </View>

                  {/* Bar */}
                  <View style={[
                    styles.bar,
                    { height: barH },
                    count > 0 && styles.barActive,
                    isNow  && styles.barNow,
                    isSel  && styles.barSel,
                  ]} />

                  {/* Hour label */}
                  {showLbl
                    ? <AppText style={[styles.hourLbl, isNow && styles.hourLblNow]}>{fmtHour(hour)}</AppText>
                    : <View style={styles.hourLblSpacer} />
                  }
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected hour breakdown */}
          {selectedHour !== null && hourly[selectedHour]?.count > 0 && (
            <View style={styles.breakdown}>
              <AppText variant="caption" style={styles.breakdownTitle}>
                {fmtHour(selectedHour)} · {hourly[selectedHour].count} pickup{hourly[selectedHour].count !== 1 ? 's' : ''}
              </AppText>
              <View style={styles.breakdownApps}>
                {hourly[selectedHour].apps.map((app) => (
                  <View key={app.id} style={styles.breakdownRow}>
                    <AppText variant="sm">{app.emoji} {app.label}</AppText>
                    <AppText variant="xs" style={styles.breakdownCount}>×{app.count}</AppText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Pickups vs. screen time scatter */}
        <Card>
          <AppText variant="subheading" style={styles.cardTitle}>pickups vs. screen time</AppText>
          <AppText variant="caption" style={styles.cardSub}>tap a bubble for details</AppText>
          <AppScatter apps={mostUsed} />
        </Card>

      </ScrollView>
    </ScreenWrapper>
  );
}

// ── Scatter plot: pickups (x) vs screen time (y) ─────────────────────────────

const BUBBLE_D = 34; // bubble diameter in scatter

function AppScatter({ apps }) {
  const [selected, setSelected] = useState(null);

  const validApps = apps.filter((a) => a.pickups > 0 || a.avgDailyMinutes > 0);

  if (validApps.length === 0) {
    return (
      <AppText variant="caption" style={sc.empty}>
        open a gated app to start seeing data here
      </AppText>
    );
  }

  const hasTime  = validApps.some((a) => a.avgDailyMinutes > 0);
  const maxPick  = Math.max(...validApps.map((a) => a.pickups), 1);
  const maxTime  = hasTime ? Math.max(...validApps.map((a) => a.avgDailyMinutes), 1) : 1;

  // Container width: screen minus card padding (md*2) minus screen padding (md*2)
  const contW = Math.max(Dimensions.get('window').width - spacing.md * 6, 200);
  const contH = 160;

  const selectedApp = selected ? validApps.find((a) => a.id === selected) : null;

  return (
    <View style={sc.wrap}>
      <AppText style={sc.yLabel}>↑ screen time (est.)</AppText>

      <View style={[sc.plot, { width: contW, height: contH }]}>
        {validApps.map((app) => {
          const x   = Math.round((app.pickups / maxPick) * (contW - BUBBLE_D));
          const y   = Math.round((1 - app.avgDailyMinutes / maxTime) * (contH - BUBBLE_D));
          const sel = selected === app.id;
          return (
            <TouchableOpacity
              key={app.id}
              style={[sc.bubble, { left: x, top: y, width: BUBBLE_D, height: BUBBLE_D, borderRadius: BUBBLE_D / 2 },
                sel && sc.bubbleSel]}
              onPress={() => setSelected(sel ? null : app.id)}
              activeOpacity={0.7}
            >
              <AppText style={sc.bubbleEmoji}>{app.emoji}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={sc.xRow}>
        <AppText style={sc.axisLabel}>0</AppText>
        <AppText style={sc.axisLabel}>pickups →</AppText>
      </View>

      {selectedApp && (
        <View style={sc.tooltip}>
          <AppText variant="sm">{selectedApp.emoji} {selectedApp.label}</AppText>
          <AppText variant="xs" style={sc.tooltipSub}>
            {selectedApp.pickups} pickup{selectedApp.pickups !== 1 ? 's' : ''} today
            {selectedApp.avgDailyMinutes > 0
              ? ` · ${fmtMin(selectedApp.avgDailyMinutes)}/day est.`
              : ' · no screen time estimate set'}
          </AppText>
        </View>
      )}

      {!hasTime && (
        <AppText style={sc.noTimeNote}>
          add Screen Time averages in Settings → Usage Estimates to populate the y-axis
        </AppText>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  wrap:        { gap: spacing.sm },
  yLabel:      { color: colors.textDisabled, fontSize: 9, marginBottom: 2 },
  plot:        { position: 'relative', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  bubble:      { position: 'absolute', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  bubbleSel:   { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  bubbleEmoji: { fontSize: 15 },
  xRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel:   { color: colors.textDisabled, fontSize: 9 },
  tooltip:     { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: 2 },
  tooltipSub:  { color: colors.textSub },
  noTimeNote:  { color: colors.textDisabled, fontSize: 10, fontStyle: 'italic', lineHeight: 14 },
  empty:       { color: colors.textSub, paddingVertical: spacing.sm },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function StatChip({ emoji, value, label, dim = false }) {
  return (
    <View style={[styles.chip, dim && styles.chipDim]}>
      <AppText style={styles.chipEmoji}>{emoji}</AppText>
      <AppText variant="xl" style={[styles.chipValue, dim && styles.chipValueDim]}>{value}</AppText>
      <AppText variant="xs" style={styles.chipLabel}>{label}</AppText>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:      { paddingBottom: spacing.xxl, gap: spacing.md },
  header:      { marginTop: spacing.xl, gap: spacing.xs },
  headerDate:  { color: colors.textSub },

  // Ring
  ringSection:    { alignItems: 'center', gap: spacing.sm },
  ringWrap:       { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter:     { position: 'absolute', alignItems: 'center', gap: 2 },
  ringTime:       { color: colors.primary },
  ringTimeOver:   { color: colors.danger },
  ringEstLabel:   { color: colors.textDisabled, fontSize: 9 },
  ringNoData:     { color: colors.textDisabled },
  ringGoalLabel:  { color: colors.textSub, textAlign: 'center' },
  deltaText:      { color: colors.textSub },
  estimateNote:   { color: colors.textDisabled, textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 16 },

  // Stat chips
  chipsRow:       { flexDirection: 'row', gap: spacing.sm },
  chip:           { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, gap: spacing.xs },
  chipDim:        { opacity: 0.4 },
  chipEmoji:      { fontSize: 18 },
  chipValue:      { color: colors.text },
  chipValueDim:   { color: colors.textDisabled },
  chipLabel:      { color: colors.textSub, textAlign: 'center' },

  // Card header
  cardTitle:      { marginBottom: spacing.xs },
  cardSub:        { color: colors.textSub, marginBottom: spacing.md },

  // Hourly chart
  chart:          { flexDirection: 'row', gap: 1.5 },
  hourCol:        { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  bubbleSlot:     { height: 28, justifyContent: 'center', alignItems: 'center' },
  appBubble:      { backgroundColor: colors.surfaceRaised, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  appBubbleSel:   { borderColor: colors.primary },
  bubbleEmoji:    { fontSize: 11 },
  bar:            { width: '100%', backgroundColor: colors.border, borderRadius: 2 },
  barActive:      { backgroundColor: colors.primary },
  barNow:         { backgroundColor: colors.warning },
  barSel:         { backgroundColor: colors.text },
  hourLbl:        { color: colors.textDisabled, fontSize: 8, marginTop: 3 },
  hourLblNow:     { color: colors.warning },
  hourLblSpacer:  { height: 14 },

  // Hour breakdown
  breakdown:      { marginTop: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: spacing.sm, gap: spacing.xs, borderWidth: 1, borderColor: colors.border },
  breakdownTitle: { color: colors.primary },
  breakdownApps:  { gap: spacing.xs },
  breakdownRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownCount: { color: colors.textSub },

});
