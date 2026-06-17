import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import {
  getSettings,
  getEvents,
  getToday,
  deriveTodayStats,
  deriveHourlyStats,
  deriveMostUsedApps,
  getDatesWithEvents,
} from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

// Hours to show on the x-axis (6am–11pm)
const CHART_START = 6;
const CHART_END   = 23;

function formatHour(h) {
  if (h === 0)  return '12a';
  if (h < 12)   return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function formatMinutes(mins) {
  if (!mins) return '0m';
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

// Parse 'YYYY-MM-DD' to { year, month (0-based), day }
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isSameDate(str, year, month, day) {
  const p = parseDate(str);
  return p.year === year && p.month === month && p.day === day;
}

function calendarDaysForMonth(year, month) {
  // Returns a grid (array of 6×7 = 42 cells) for the given year/month.
  // Each cell is { day: number|null, dateStr: string|null }
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: toDateStr(year, month, d) });
  }
  // Pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: null });
  return cells;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function CalendarPicker({ selectedDate, datesWithEvents, onSelect, onClose }) {
  const parsed = parseDate(selectedDate);
  const [viewYear,  setViewYear]  = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  const todayStr = getToday();
  const cells    = calendarDaysForMonth(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else                 { setViewMonth(m => m - 1); }
  }
  function nextMonth() {
    // Don't go past the current month
    const todayP = parseDate(todayStr);
    if (viewYear === todayP.year && viewMonth === todayP.month) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else                  { setViewMonth(m => m + 1); }
  }

  const todayP   = parseDate(todayStr);
  const atMaxMonth = viewYear === todayP.year && viewMonth === todayP.month;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={cal.sheet}>
            {/* Month nav */}
            <View style={cal.monthRow}>
              <TouchableOpacity onPress={prevMonth} style={cal.navBtn} hitSlop={8}>
                <AppText variant="base" style={cal.navArrow}>‹</AppText>
              </TouchableOpacity>
              <AppText variant="subheading" style={cal.monthLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </AppText>
              <TouchableOpacity
                onPress={nextMonth}
                style={cal.navBtn}
                hitSlop={8}
                disabled={atMaxMonth}
              >
                <AppText variant="base" style={[cal.navArrow, atMaxMonth && cal.navDisabled]}>›</AppText>
              </TouchableOpacity>
            </View>

            {/* Day-of-week header */}
            <View style={cal.dowRow}>
              {DOW_LABELS.map((d) => (
                <AppText key={d} variant="xs" style={cal.dowLabel}>{d}</AppText>
              ))}
            </View>

            {/* Day grid */}
            <View style={cal.grid}>
              {cells.map((cell, i) => {
                if (!cell.day) return <View key={i} style={cal.cell} />;

                const isSelected = isSameDate(selectedDate, viewYear, viewMonth, cell.day);
                const isToday    = cell.dateStr === todayStr;
                const hasDot     = datesWithEvents.has(cell.dateStr);
                // Future dates (after today) are not selectable
                const isFuture   = cell.dateStr > todayStr;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[cal.cell, isSelected && cal.cellSelected, isToday && !isSelected && cal.cellToday]}
                    onPress={() => { if (!isFuture) { onSelect(cell.dateStr); onClose(); } }}
                    activeOpacity={isFuture ? 1 : 0.6}
                    disabled={isFuture}
                  >
                    <AppText
                      variant="sm"
                      style={[
                        cal.cellText,
                        isSelected && cal.cellTextSelected,
                        isToday && !isSelected && cal.cellTextToday,
                        isFuture && cal.cellTextFuture,
                      ]}
                    >
                      {cell.day}
                    </AppText>
                    {hasDot && !isFuture && (
                      <View style={[cal.dot, isSelected && cal.dotSelected]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function ActivityScreen() {
  const todayStr = getToday();
  const [loading, setLoading]             = useState(true);
  const [allEvents, setAllEvents]         = useState([]);
  const [estimates, setEstimates]         = useState({});
  const [goalMinutes, setGoalMinutes]     = useState(120);
  const [datesWithEvents, setDatesWithEvents] = useState(new Set());

  const [selectedDate, setSelectedDate]   = useState(todayStr);
  const [showCalendar, setShowCalendar]   = useState(false);

  // Derived from selectedDate + allEvents
  const [dayStats, setDayStats]           = useState(null);
  const [hourly, setHourly]               = useState([]);
  const [mostUsed, setMostUsed]           = useState([]);
  const [totalDailyEst, setTotalDailyEst] = useState(0);
  const [hasEstimates, setHasEstimates]   = useState(false);

  // Load raw data once on focus; derive per selectedDate changes
  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [settings, events] = await Promise.all([getSettings(), getEvents()]);
        if (!active) return;
        setAllEvents(events);
        setEstimates(settings.appUsageEstimates ?? {});
        setGoalMinutes(settings.screentimeGoalMinutes ?? 120);
        setDatesWithEvents(getDatesWithEvents(events));
        setLoading(false);
      }
      load();
      return () => { active = false; };
    }, [])
  );

  // Re-derive whenever selectedDate or allEvents change
  useEffect(() => {
    if (loading) return;
    const anyEstimate = Object.values(estimates).some((e) => e.weeklyMinutes > 0);
    const dailyTotal = Object.values(estimates).reduce(
      (sum, e) => sum + (e.weeklyMinutes ? Math.round(e.weeklyMinutes / 7) : 0),
      0
    );
    setDayStats(deriveTodayStats(allEvents, selectedDate));
    setHourly(deriveHourlyStats(allEvents, selectedDate));
    setMostUsed(deriveMostUsedApps(allEvents, estimates, selectedDate));
    setTotalDailyEst(dailyTotal);
    setHasEstimates(anyEstimate);
  }, [selectedDate, allEvents, estimates, loading]);

  if (loading || !dayStats) return <ScreenWrapper />;

  const isToday   = selectedDate === todayStr;
  const parsedSel = parseDate(selectedDate);
  const dateLabel = new Date(parsedSel.year, parsedSel.month, parsedSel.day)
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Hourly chart — only the CHART_START–CHART_END window
  const chartHours = hourly.slice(CHART_START, CHART_END + 1);
  const maxCount   = Math.max(...chartHours.map((h) => h.count), 1);

  const goalPct  = hasEstimates ? Math.min(totalDailyEst / goalMinutes, 1) : 0;
  const overGoal = totalDailyEst > goalMinutes;

  const bubbleApps = mostUsed.filter((a) => a.pickups > 0).slice(0, 5);

  const nowHour = isToday ? new Date().getHours() : -1; // only highlight current hour for today

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header — tap date to open calendar */}
        <View style={styles.header}>
          <AppText variant="xxl">activity</AppText>
          <TouchableOpacity
            onPress={() => setShowCalendar(true)}
            style={styles.datePill}
            activeOpacity={0.7}
          >
            <AppText variant="caption" style={styles.dateLabel}>
              {isToday ? 'today' : dateLabel}
            </AppText>
            <AppText variant="caption" style={styles.dateChevron}> ▾</AppText>
          </TouchableOpacity>
        </View>

        {/* If viewing a past day, show the full date */}
        {!isToday && (
          <AppText variant="caption" style={styles.pastDateFull}>{dateLabel}</AppText>
        )}

        {/* Today's quick stats */}
        <View style={styles.quickRow}>
          <QuickStat emoji="🚧" value={dayStats.intercepted}  label="pickups" />
          <QuickStat emoji="🚶" value={dayStats.walkedAway}   label="walked away" />
          <QuickStat emoji="🧐" value={dayStats.openedAnyway} label="opened anyway" />
        </View>

        {/* Daily screen time vs goal */}
        <Card style={styles.screentimeCard}>
          <View style={styles.screentimeHeader}>
            <AppText variant="subheading">screen time</AppText>
            {hasEstimates && (
              <AppText variant="caption" style={styles.goalLabel}>
                goal: {formatMinutes(goalMinutes)}
              </AppText>
            )}
          </View>

          {hasEstimates ? (
            <>
              <View style={styles.screentimeBarBg}>
                <View
                  style={[
                    styles.screentimeBarFill,
                    { width: `${goalPct * 100}%` },
                    overGoal && styles.screentimeBarOver,
                  ]}
                />
              </View>
              <View style={styles.screentimeRow}>
                <AppText variant="xl" style={[styles.screentimeValue, overGoal && styles.screentimeOver]}>
                  {formatMinutes(totalDailyEst)}
                </AppText>
                <AppText variant="caption" style={styles.screentimeEst}>
                  avg daily est.
                </AppText>
              </View>
              <AppText variant="caption" style={styles.screentimeNote}>
                based on your Screen Time averages — real-time data available after Screen Time permission
              </AppText>
            </>
          ) : (
            <AppText variant="caption" style={styles.screentimeEmpty}>
              add your Screen Time averages in Settings → Usage Estimates to see this
            </AppText>
          )}
        </Card>

        {/* Hourly intercept chart */}
        <Card>
          <AppText variant="subheading" style={styles.sectionTitle}>intercepts by hour</AppText>
          <AppText variant="caption" style={styles.chartSub}>
            {isToday ? 'when you reached for a friction app today' : 'when you reached for a friction app'}
          </AppText>

          {dayStats.intercepted === 0 ? (
            <AppText variant="caption" style={styles.emptyText}>
              {isToday ? 'no interceptions yet today. staying strong 💪' : 'no interceptions on this day.'}
            </AppText>
          ) : (
            <View style={styles.hourlyChart}>
              {chartHours.map(({ hour, count }) => {
                const barH   = count > 0 ? Math.max(Math.round((count / maxCount) * 72), 4) : 2;
                const isNow  = hour === nowHour;
                return (
                  <View key={hour} style={styles.hourCol}>
                    <View style={styles.hourBarContainer}>
                      <View
                        style={[
                          styles.hourBar,
                          { height: barH },
                          count > 0 && styles.hourBarActive,
                          isNow && styles.hourBarNow,
                        ]}
                      />
                    </View>
                    {(hour - CHART_START) % 3 === 0 ? (
                      <AppText variant="xs" style={[styles.hourLabel, isNow && styles.hourLabelNow]}>
                        {formatHour(hour)}
                      </AppText>
                    ) : (
                      <View style={styles.hourLabelSpacer} />
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* App bubbles */}
        {bubbleApps.length > 0 && (
          <Card>
            <AppText variant="subheading" style={styles.sectionTitle}>most reached for</AppText>
            <AppText variant="caption" style={styles.chartSub}>top apps by pickup count</AppText>
            <View style={styles.bubblesRow}>
              {bubbleApps.map((app) => {
                const base = bubbleApps[0].pickups || 1;
                const size = Math.max(40, Math.round(64 * (app.pickups / base)));
                return (
                  <View key={app.id} style={styles.bubbleWrap}>
                    <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }]}>
                      <AppText style={{ fontSize: Math.max(16, size * 0.42) }}>{app.emoji}</AppText>
                    </View>
                    <AppText variant="xs" style={styles.bubbleLabel} numberOfLines={1}>
                      {app.label}
                    </AppText>
                    <AppText variant="xs" style={styles.bubbleCount}>{app.pickups}×</AppText>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Most used apps list */}
        <Card>
          <AppText variant="subheading" style={styles.sectionTitle}>most used apps</AppText>
          {!hasEstimates && (
            <AppText variant="caption" style={styles.emptyText}>
              add Screen Time averages in Usage Estimates to see screen time here
            </AppText>
          )}
          {hasEstimates && mostUsed.filter((a) => a.avgDailyMinutes > 0).length === 0 && (
            <AppText variant="caption" style={styles.emptyText}>no app data yet</AppText>
          )}
          {hasEstimates && (
            <View style={styles.appList}>
              {mostUsed
                .filter((a) => a.avgDailyMinutes > 0)
                .map((app, i) => {
                  const pct = totalDailyEst > 0 ? app.avgDailyMinutes / totalDailyEst : 0;
                  return (
                    <View key={app.id} style={styles.appRow}>
                      <AppText style={styles.appRank}>{i + 1}</AppText>
                      <AppText style={styles.appEmoji}>{app.emoji}</AppText>
                      <View style={styles.appInfo}>
                        <View style={styles.appLabelRow}>
                          <AppText variant="sm">{app.label}</AppText>
                          <AppText variant="sm" style={styles.appTime}>
                            {formatMinutes(app.avgDailyMinutes)}
                          </AppText>
                        </View>
                        <View style={styles.appBarBg}>
                          <View style={[styles.appBarFill, { width: `${Math.round(pct * 100)}%` }]} />
                        </View>
                        {app.pickups > 0 && (
                          <AppText variant="xs" style={styles.appSub}>
                            {app.pickups} pickup{app.pickups !== 1 ? 's' : ''}
                          </AppText>
                        )}
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </Card>

      </ScrollView>

      {showCalendar && (
        <CalendarPicker
          selectedDate={selectedDate}
          datesWithEvents={datesWithEvents}
          onSelect={setSelectedDate}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </ScreenWrapper>
  );
}

function QuickStat({ emoji, value, label }) {
  return (
    <Card style={styles.quickCard}>
      <AppText style={styles.quickEmoji}>{emoji}</AppText>
      <AppText variant="xl" style={styles.quickValue}>{value}</AppText>
      <AppText variant="caption" style={styles.quickLabel}>{label}</AppText>
    </Card>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl, gap: spacing.md },

  header: { marginTop: spacing.xl, marginBottom: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  datePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
  dateLabel: { color: colors.primary },
  dateChevron: { color: colors.primary },
  pastDateFull: { color: colors.textSub, marginBottom: spacing.xs },

  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickCard: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  quickEmoji: { fontSize: 18 },
  quickValue: { color: colors.text },
  quickLabel: { textAlign: 'center', lineHeight: 16 },

  screentimeCard: {},
  screentimeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  goalLabel: { color: colors.textSub },
  screentimeBarBg: { height: 8, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.sm },
  screentimeBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  screentimeBarOver: { backgroundColor: colors.danger },
  screentimeRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  screentimeValue: { color: colors.primary },
  screentimeOver: { color: colors.danger },
  screentimeEst: { color: colors.textSub },
  screentimeNote: { marginTop: spacing.sm, color: colors.textDisabled, lineHeight: 18 },
  screentimeEmpty: { color: colors.textSub, lineHeight: 20 },

  sectionTitle: { marginBottom: spacing.xs },
  chartSub: { color: colors.textSub, marginBottom: spacing.md },
  hourlyChart: { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 2 },
  hourCol: { flex: 1, alignItems: 'center', gap: 4 },
  hourBarContainer: { flex: 1, justifyContent: 'flex-end' },
  hourBar: { width: '100%', backgroundColor: colors.border, borderRadius: 2, minHeight: 2 },
  hourBarActive: { backgroundColor: colors.primary },
  hourBarNow: { backgroundColor: colors.warning },
  hourLabel: { color: colors.textDisabled, fontSize: 9 },
  hourLabelNow: { color: colors.warning },
  hourLabelSpacer: { height: 12 },
  emptyText: { color: colors.textSub, paddingVertical: spacing.sm },

  bubblesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', paddingTop: spacing.sm },
  bubbleWrap: { alignItems: 'center', gap: spacing.xs, width: 72 },
  bubble: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  bubbleLabel: { color: colors.textSub, textAlign: 'center' },
  bubbleCount: { color: colors.primary },

  appList: { gap: spacing.md },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appRank: { width: 16, color: colors.textDisabled, fontSize: 12, textAlign: 'center' },
  appEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  appInfo: { flex: 1, gap: spacing.xs },
  appLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appTime: { color: colors.primary },
  appBarBg: { height: 4, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  appBarFill: { height: '100%', backgroundColor: colors.primaryMuted, borderRadius: radius.full },
  appSub: { color: colors.textSub },
});

// ── Calendar styles ───────────────────────────────────────────────────────────

const cal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, width: 320, borderWidth: 1, borderColor: colors.border },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn: { padding: spacing.sm },
  navArrow: { color: colors.primary, fontSize: 22 },
  navDisabled: { color: colors.textDisabled },
  monthLabel: { color: colors.text },

  dowRow: { flexDirection: 'row', marginBottom: spacing.xs },
  dowLabel: { flex: 1, textAlign: 'center', color: colors.textDisabled },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: colors.primary, borderRadius: radius.full },
  cellToday: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.full },
  cellText: { color: colors.text },
  cellTextSelected: { color: colors.bg, fontWeight: '700' },
  cellTextToday: { color: colors.primary },
  cellTextFuture: { color: colors.textDisabled },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, position: 'absolute', bottom: 3 },
  dotSelected: { backgroundColor: colors.bg },
});
