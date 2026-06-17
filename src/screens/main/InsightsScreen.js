import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import Button from '../../components/Button';
import ShareCardModal from '../../components/ShareCardModal';
import {
  getSettings,
  getEvents,
  getToday,
  deriveTodayStats,
  getDatesWithEvents,
  deriveWeeklyStats,
  deriveByAppStats,
  deriveMinutesSaved,
  deriveAllTimeStats,
  computeStreak,
} from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

const MODES = ['today', 'week', 'all-time'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatHour(h) {
  if (h === 0)  return '12a';
  if (h === 23) return '11:59p';
  if (h < 12)   return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calendarDaysForMonth(year, month) {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dateStr: toDateStr(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: null });
  return cells;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

// ── Calendar picker ───────────────────────────────────────────────────────────

function CalendarPicker({ selectedDate, datesWithEvents, onSelect, onClose }) {
  const parsed = parseDate(selectedDate);
  const [viewYear,  setViewYear]  = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const todayStr = getToday();

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else                 { setViewMonth(m => m - 1); }
  }
  function nextMonth() {
    const tp = parseDate(todayStr);
    if (viewYear === tp.year && viewMonth === tp.month) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else                  { setViewMonth(m => m + 1); }
  }

  const tp         = parseDate(todayStr);
  const atMaxMonth = viewYear === tp.year && viewMonth === tp.month;
  const cells      = calendarDaysForMonth(viewYear, viewMonth);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={cal.sheet}>
            <View style={cal.monthRow}>
              <TouchableOpacity onPress={prevMonth} style={cal.navBtn} hitSlop={8}>
                <AppText variant="base" style={cal.navArrow}>‹</AppText>
              </TouchableOpacity>
              <AppText variant="subheading" style={cal.monthLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </AppText>
              <TouchableOpacity onPress={nextMonth} style={cal.navBtn} hitSlop={8} disabled={atMaxMonth}>
                <AppText variant="base" style={[cal.navArrow, atMaxMonth && cal.navDisabled]}>›</AppText>
              </TouchableOpacity>
            </View>

            <View style={cal.dowRow}>
              {DOW_LABELS.map((d) => (
                <AppText key={d} variant="xs" style={cal.dowLabel}>{d}</AppText>
              ))}
            </View>

            <View style={cal.grid}>
              {cells.map((cell, i) => {
                if (!cell.day) return <View key={i} style={cal.cell} />;
                const isSelected = cell.dateStr === selectedDate;
                const isToday    = cell.dateStr === todayStr;
                const hasDot     = datesWithEvents.has(cell.dateStr);
                const isFuture   = cell.dateStr > todayStr;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[cal.cell, isSelected && cal.cellSelected, isToday && !isSelected && cal.cellToday]}
                    onPress={() => { if (!isFuture) { onSelect(cell.dateStr); onClose(); } }}
                    activeOpacity={isFuture ? 1 : 0.6}
                    disabled={isFuture}
                  >
                    <AppText variant="sm" style={[
                      cal.cellText,
                      isSelected && cal.cellTextSelected,
                      isToday && !isSelected && cal.cellTextToday,
                      isFuture && cal.cellTextFuture,
                    ]}>
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

// ── Today view ────────────────────────────────────────────────────────────────

function TodayView({ allEvents, streak }) {
  const todayStr = getToday();
  const [selectedDate,    setSelectedDate]    = useState(todayStr);
  const [showCalendar,    setShowCalendar]    = useState(false);
  const [datesWithEvents] = useState(() => getDatesWithEvents(allEvents));
  const [dayStats,        setDayStats]        = useState(null);

  useEffect(() => {
    setDayStats(deriveTodayStats(allEvents, selectedDate));
  }, [selectedDate, allEvents]);

  if (!dayStats) return null;

  const isToday   = selectedDate === todayStr;
  const parsed    = parseDate(selectedDate);
  const dateLabel = new Date(parsed.year, parsed.month, parsed.day)
    .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const dailyRate = dayStats.intercepted > 0
    ? Math.round(((dayStats.walkedAway + dayStats.rageQuit) / dayStats.intercepted) * 100)
    : 0;

  return (
    <>
      {/* Date picker trigger */}
      <View style={s.todayHeader}>
        <TouchableOpacity onPress={() => setShowCalendar(true)} style={s.datePill} activeOpacity={0.7}>
          <AppText variant="caption" style={s.dateLabel}>
            {isToday ? 'today' : dateLabel}
          </AppText>
          <AppText variant="caption" style={s.dateLabel}> ▾</AppText>
        </TouchableOpacity>
        {!isToday && (
          <TouchableOpacity onPress={() => setSelectedDate(todayStr)} hitSlop={8}>
            <AppText variant="caption" style={s.backToToday}>back to today →</AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick stats — 2×2 grid */}
      <View style={s.quickGrid}>
        <QuickStat emoji="🚧" value={dayStats.intercepted}  label="intercepted" />
        <QuickStat emoji="🚶" value={dayStats.walkedAway}   label="walked away" />
        <QuickStat emoji="🧐" value={dayStats.openedAnyway} label="opened anyway" />
        <QuickStat emoji="🏳️" value={dayStats.rageQuit}    label="rage-quit" />
      </View>

      {/* Daily high score */}
      <Card style={s.streakCard}>
        <View style={s.streakRow}>
          <View style={s.streakItem}>
            <AppText variant="caption">daily high score</AppText>
            <AppText variant="xxl" style={s.streakCurrent}>
              {streak.current} {streak.current > 0 ? '🔥' : '✨'}
            </AppText>
            <AppText variant="caption" style={s.streakUnit}>
              {streak.current === 1 ? 'day' : 'days'} without "opening anyway"
            </AppText>
          </View>
        </View>
      </Card>

      {/* Daily friction success rate */}
      <Card>
        <AppText variant="caption" style={s.rateLabel}>friction success rate today</AppText>
        <View style={s.rateBarBg}>
          <View style={[s.rateBarFill, { width: `${dailyRate}%` }]} />
        </View>
        <AppText variant="sm" style={s.rateValue}>{dailyRate}%</AppText>
        <AppText variant="caption" style={s.rateDef}>
          {dayStats.intercepted === 0
            ? 'no interceptions yet — check back after your first friction session'
            : "of today's interceptions, how often you didn't end up in the app — walked away or rage-quit."}
        </AppText>
      </Card>

      {showCalendar && (
        <CalendarPicker
          selectedDate={selectedDate}
          datesWithEvents={datesWithEvents}
          onSelect={setSelectedDate}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────

function WeekView({ allEvents, estimates, navigation }) {
  const [selectedDay, setSelectedDay] = useState(null);

  const weekly      = deriveWeeklyStats(allEvents);
  const byApp       = deriveByAppStats(allEvents);
  // Filter to the last 7 days for the week-scoped minutes saved figure.
  const weekStartStr = (() => {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const weekEvents = allEvents.filter((e) => e.date >= weekStartStr);
  // [POST-MAC #20] deriveMinutesSaved can use real per-session lengths from DeviceActivityReport
  // instead of the weeklyMinutes/weeklyPickups estimate ratio. hasEstimates check becomes
  // settings.screenTimePermissionGranted — minutes saved card always shows when real data is available.
  const minutesSaved = deriveMinutesSaved(weekEvents, estimates);
  const hasEstimates = Object.values(estimates).some((e) => e.weeklyMinutes > 0);
  const maxIntercepted = Math.max(...weekly.map((d) => d.intercepted), 1);

  return (
    <>
      {/* Minutes saved */}
      {hasEstimates ? (
        <Card style={s.minutesCard}>
          <AppText variant="caption" style={s.minutesLabel}>⏱  estimated time saved</AppText>
          <AppText variant="xxl" style={s.minutesValue}>
            {minutesSaved >= 60
              ? `${Math.floor(minutesSaved / 60)}h ${minutesSaved % 60}m`
              : `${minutesSaved}m`}
          </AppText>
          <AppText variant="caption" style={s.minutesSub}>
            (walk-aways + rage-quits this week) × (avg session length: weeklyMinutes ÷ weeklyPickups per app)
          </AppText>
        </Card>
      ) : (
        <TouchableOpacity style={s.minutesPrompt} onPress={() => navigation.navigate('UsageEstimates')}>
          <AppText variant="base" style={s.minutesPromptText}>
            ⏱  add your Screen Time averages to see minutes saved →
          </AppText>
        </TouchableOpacity>
      )}

      {/* 7-day bar chart */}
      <Card>
        <AppText variant="subheading" style={s.sectionTitle}>last 7 days</AppText>
        <View style={s.chart}>
          {weekly.map((d) => {
            const barH    = Math.round((d.intercepted / maxIntercepted) * 80);
            const walkedH = d.intercepted > 0 ? Math.round((d.walkedAway   / d.intercepted) * barH) : 0;
            const rageH   = d.intercepted > 0 ? Math.round((d.rageQuit     / d.intercepted) * barH) : 0;
            const openedH = d.intercepted > 0 ? Math.round((d.openedAnyway / d.intercepted) * barH) : 0;
            const isSel   = selectedDay?.date === d.date;
            return (
              <TouchableOpacity
                key={d.date}
                style={s.barCol}
                onPress={() => setSelectedDay(isSel ? null : d)}
                activeOpacity={0.7}
              >
                <View style={s.barContainer}>
                  <View style={[s.barBg, { height: Math.max(barH, 2) }, isSel && s.barBgSelected]}>
                    <View style={{ height: openedH, backgroundColor: colors.danger }} />
                    <View style={{ height: rageH, backgroundColor: colors.warning }} />
                    <View style={{ height: walkedH, backgroundColor: colors.success }} />
                  </View>
                </View>
                <AppText variant="xs" style={[s.barLabel, isSel && s.barLabelSelected]}>{d.day}</AppText>
                <AppText variant="xs" style={s.barValue}>{d.intercepted > 0 ? d.intercepted : ''}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedDay && (
          <View style={s.dayBreakdown}>
            <AppText variant="caption" style={s.dayBreakdownTitle}>{selectedDay.day}</AppText>
            <View style={s.dayBreakdownRow}>
              <AppText variant="xs" style={s.dayBreakdownItem}>🚧 {selectedDay.intercepted} intercepted</AppText>
              <AppText variant="xs" style={s.dayBreakdownItem}>🚶 {selectedDay.walkedAway} walked away</AppText>
              <AppText variant="xs" style={s.dayBreakdownItem}>🏳️ {selectedDay.rageQuit} rage-quit</AppText>
              <AppText variant="xs" style={s.dayBreakdownItem}>🧐 {selectedDay.openedAnyway} opened anyway</AppText>
            </View>
          </View>
        )}

        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.success }]} />
            <AppText variant="xs" style={s.legendText}>walked away</AppText>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.warning }]} />
            <AppText variant="xs" style={s.legendText}>rage-quit</AppText>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: colors.danger }]} />
            <AppText variant="xs" style={s.legendText}>opened anyway</AppText>
          </View>
        </View>
        <AppText variant="xs" style={s.tooltipText}>bar height = total intercepted. tap a bar to see the breakdown.</AppText>
      </Card>

      {/* Per-app breakdown */}
      <Card>
        <AppText variant="subheading" style={s.sectionTitle}>by app</AppText>
        {byApp.length === 0 ? (
          <AppText variant="caption" style={s.emptyText}>no interceptions recorded yet.</AppText>
        ) : (
          <View style={s.appList}>
            {byApp.map((app) => {
              const rate = app.intercepted > 0 ? Math.round((app.succeeded / app.intercepted) * 100) : 0;
              return (
                <View key={app.id} style={s.appRow}>
                  <AppText variant="base" style={s.appEmoji}>{app.emoji}</AppText>
                  <View style={s.appInfo}>
                    <View style={s.appLabelRow}>
                      <AppText variant="sm">{app.label}</AppText>
                      <AppText variant="xs" style={s.appRate}>{rate}%</AppText>
                    </View>
                    <View style={s.appBarBg}>
                      <View style={[s.appBarFill, { width: `${rate}%` }]} />
                    </View>
                    <AppText variant="xs" style={s.appSub}>
                      {app.intercepted} intercepted · {app.succeeded} resisted
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </>
  );
}

// ── All time view ─────────────────────────────────────────────────────────────

function AllTimeView({ allEvents, installDate, weekly, streak }) {
  const [showShareCard, setShowShareCard] = useState(false);

  const allTime = deriveAllTimeStats(allEvents, streak, installDate);
  const rate    = allTime.intercepted > 0
    ? Math.round(((allTime.walkedAway + allTime.rageQuit) / allTime.intercepted) * 100)
    : 0;

  return (
    <>
      {/* Days since install */}
      <AppText variant="caption" style={s.installNote}>
        {allTime.daysSinceInstall} day{allTime.daysSinceInstall !== 1 ? 's' : ''} of friction
      </AppText>

      {/* 2×2 summary grid */}
      <View style={s.summaryGrid}>
        <SummaryBox emoji="🚧" value={allTime.intercepted}  label="intercepted" />
        <SummaryBox emoji="🚶" value={allTime.walkedAway}   label="walked away" />
        <SummaryBox emoji="🧐" value={allTime.openedAnyway} label="opened anyway" />
        <SummaryBox emoji="🏳️" value={allTime.rageQuit}    label="rage-quit" />
      </View>

      {/* All-time high score */}
      <Card style={s.streakCard}>
        <View style={s.streakRow}>
          <View style={s.streakItem}>
            <AppText variant="caption">all-time high score</AppText>
            <AppText variant="xxl" style={s.streakBest}>{allTime.streakBest} 🏆</AppText>
            <AppText variant="caption" style={s.streakUnit}>
              {allTime.streakBest === 1 ? 'day' : 'days'} without "opening anyway"
            </AppText>
          </View>
        </View>
      </Card>

      {/* Friction success rate */}
      <Card>
        <AppText variant="caption" style={s.rateLabel}>all-time friction success rate</AppText>
        <View style={s.rateBarBg}>
          <View style={[s.rateBarFill, { width: `${rate}%` }]} />
        </View>
        <AppText variant="sm" style={s.rateValue}>{rate}%</AppText>
        <AppText variant="caption" style={s.rateDef}>
          of all interceptions, how often you didn't end up in the app — walked away or rage-quit. "opened anyway" doesn't count.
        </AppText>
      </Card>

      {/* Share */}
      <Button label="share my stats 📤" variant="secondary" onPress={() => setShowShareCard(true)} />
      <AppText variant="caption" style={s.shareWarning}>
        ⚠️ sharing to a friction app counts as opening it. your high score is at stake. worth it?
      </AppText>

      <ShareCardModal
        visible={showShareCard}
        onClose={() => setShowShareCard(false)}
        stats={allTime}
        weekly={weekly}
      />
    </>
  );
}

// ── Small shared sub-components ───────────────────────────────────────────────

function QuickStat({ emoji, value, label }) {
  return (
    <Card style={s.quickCard}>
      <AppText style={s.quickEmoji}>{emoji}</AppText>
      <AppText variant="xl" style={s.quickValue}>{value}</AppText>
      <AppText variant="caption" style={s.quickLabel}>{label}</AppText>
    </Card>
  );
}

function SummaryBox({ emoji, value, label }) {
  return (
    <Card style={s.summaryBox}>
      <AppText variant="lg" style={s.summaryEmoji}>{emoji}</AppText>
      <AppText variant="xl"  style={s.summaryValue}>{value}</AppText>
      <AppText variant="caption" style={s.summaryLabel}>{label}</AppText>
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function InsightsScreen({ navigation }) {
  const [mode,        setMode]        = useState('today');
  const [loading,     setLoading]     = useState(true);
  const [allEvents,   setAllEvents]   = useState([]);
  const [estimates,   setEstimates]   = useState({});
  const [installDate, setInstallDate] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [settings, events] = await Promise.all([getSettings(), getEvents()]);
        if (!active) return;
        setAllEvents(events);
        setEstimates(settings.appUsageEstimates ?? {});
        setInstallDate(settings.installDate ?? null);
        setLoading(false);
      }
      load();
      return () => { active = false; };
    }, [])
  );

  if (loading) return <ScreenWrapper />;

  const weekly = deriveWeeklyStats(allEvents);
  const streak = computeStreak(allEvents);

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Header */}
        <View style={s.header}>
          <AppText variant="xxl">stats</AppText>
        </View>

        {/* Mode toggle */}
        <View style={s.toggle}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.togglePill, mode === m && s.togglePillActive]}
              onPress={() => setMode(m)}
              activeOpacity={0.7}
            >
              <AppText variant="caption" style={[s.toggleLabel, mode === m && s.toggleLabelActive]}>
                {m}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Mode content */}
        {mode === 'today' && (
          <TodayView
            allEvents={allEvents}
            streak={streak}
          />
        )}
        {mode === 'week' && (
          <WeekView
            allEvents={allEvents}
            estimates={estimates}
            navigation={navigation}
          />
        )}
        {mode === 'all-time' && (
          <AllTimeView
            allEvents={allEvents}
            installDate={installDate}
            weekly={weekly}
            streak={streak}
          />
        )}

      </ScrollView>
    </ScreenWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll:      { paddingBottom: spacing.xxl, gap: spacing.md },
  header:      { marginTop: spacing.xl, marginBottom: spacing.xs },
  installNote: { color: colors.textSub, marginBottom: spacing.xs },

  // Mode toggle
  toggle:           { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, padding: 3, marginBottom: spacing.xs },
  togglePill:       { flex: 1, paddingVertical: spacing.xs, alignItems: 'center', borderRadius: radius.full },
  togglePillActive: { backgroundColor: colors.primary },
  toggleLabel:      { color: colors.textSub },
  toggleLabelActive:{ color: colors.bg },

  // Today — date header
  todayHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  datePill:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceRaised, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
  dateLabel:    { color: colors.primary },
  backToToday:  { color: colors.textDisabled },

  // Quick stats
  quickRow:   { flexDirection: 'row', gap: spacing.sm },
  quickGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard:  { width: '47.5%', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  quickEmoji: { fontSize: 18 },
  quickValue: { color: colors.text },
  quickLabel: { textAlign: 'center', lineHeight: 16 },

  // Screen time
  screentimeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  goalLabel:        { color: colors.textSub },
  screentimeRow:    { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  screentimeValue:  { color: colors.primary },
  screentimeOver:   { color: colors.danger },
  screentimeEst:    { color: colors.textSub },
  screentimeNote:   { marginTop: spacing.sm, color: colors.textDisabled, lineHeight: 18 },

  // Hourly chart
  hourlyChart:     { flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 2 },
  hourCol:         { flex: 1, alignItems: 'center', gap: 4 },
  hourBarContainer:{ flex: 1, justifyContent: 'flex-end' },
  hourBar:         { width: '100%', backgroundColor: colors.border, borderRadius: 2, minHeight: 2 },
  hourBarActive:   { backgroundColor: colors.primary },
  hourBarNow:      { backgroundColor: colors.warning },
  hourLabel:       { color: colors.textDisabled, fontSize: 9 },
  hourLabelNow:    { color: colors.warning },
  hourLabelSpacer: { height: 12 },

  // Bubbles
  bubblesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', paddingTop: spacing.sm },
  bubbleWrap: { alignItems: 'center', gap: spacing.xs, width: 72 },
  bubble:     { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  bubbleLabel:{ color: colors.textSub, textAlign: 'center' },
  bubbleCount:{ color: colors.primary },

  // App list (shared by today + week)
  appList:    { gap: spacing.md },
  appRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appRank:    { width: 16, color: colors.textDisabled, fontSize: 12, textAlign: 'center' },
  appEmoji:   { fontSize: 20, width: 28, textAlign: 'center' },
  appInfo:    { flex: 1, gap: spacing.xs },
  appLabelRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appTime:    { color: colors.primary },
  appRate:    { color: colors.primary },
  appBarBg:   { height: 4, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  appBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  appSub:     { color: colors.textSub },

  // Week — minutes saved
  minutesCard:      { gap: spacing.xs, borderColor: colors.primary },
  minutesLabel:     { color: colors.textSub },
  minutesValue:     { color: colors.primary },
  minutesSub:       { color: colors.textDisabled, lineHeight: 18 },
  minutesPrompt:    { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', padding: spacing.md },
  minutesPromptText:{ color: colors.textDisabled },

  // Week — bar chart
  sectionTitle:    { marginBottom: spacing.xs },
  sectionSub:      { color: colors.textSub, marginBottom: spacing.md },
  chart:           { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110, marginBottom: spacing.sm },
  barCol:          { flex: 1, alignItems: 'center', gap: spacing.xs },
  barContainer:    { flex: 1, justifyContent: 'flex-end' },
  barBg:           { width: 20, backgroundColor: colors.border, borderRadius: radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:         { width: '100%', backgroundColor: colors.primary, borderRadius: radius.sm },
  barBgSelected:   { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary },
  barLabel:        { color: colors.textSub },
  barLabelSelected:{ color: colors.primary },
  barValue:        { color: colors.textDisabled },
  dayBreakdown:    { backgroundColor: colors.surfaceRaised, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm, gap: spacing.xs },
  dayBreakdownTitle:{ color: colors.primary, marginBottom: 2 },
  dayBreakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayBreakdownItem:{ color: colors.textSub, width: '48%' },
  legend:          { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot:       { width: 8, height: 8, borderRadius: radius.full },
  legendText:      { color: colors.textSub },
  legendTextActive:{ color: colors.primary },
  tooltipText:     { color: colors.textDisabled, marginTop: spacing.xs, fontStyle: 'italic' },

  // All time
  summaryGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryBox:   { width: '47.5%', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  summaryEmoji: { fontSize: 20 },
  summaryValue: { color: colors.text },
  summaryLabel: { textAlign: 'center' },
  streakCard:   { borderColor: colors.primary },
  streakRow:    { flexDirection: 'row', alignItems: 'center' },
  streakItem:   { flex: 1, alignItems: 'center', gap: spacing.xs },
  divider:      { width: 1, height: 60, backgroundColor: colors.border, marginHorizontal: spacing.md },
  streakCurrent:{ color: colors.primary },
  streakBest:   { color: colors.warning },
  streakUnit:   { color: colors.textDisabled, textAlign: 'center' },
  rateLabel:    { marginBottom: spacing.sm },
  rateBarBg:    { height: 8, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  rateBarFill:  { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  rateBarOver:  { backgroundColor: colors.danger },
  rateValue:    { marginTop: spacing.xs, color: colors.textSub, textAlign: 'right' },
  rateDef:      { marginTop: spacing.sm, color: colors.textDisabled, lineHeight: 18 },
  shareWarning: { textAlign: 'center', color: colors.textDisabled, lineHeight: 18 },

  // Coming soon note
  comingSoonBox:   { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 4 },
  comingSoonTitle: { color: colors.textDisabled, marginBottom: 2 },
  comingSoonItem:  { color: colors.textDisabled, lineHeight: 18 },

  // Shared
  emptyText: { color: colors.textSub, paddingVertical: spacing.sm },
});

// ── Calendar styles ───────────────────────────────────────────────────────────

const cal = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  sheet:           { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, width: 320, borderWidth: 1, borderColor: colors.border },
  monthRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn:          { padding: spacing.sm },
  navArrow:        { color: colors.primary, fontSize: 22 },
  navDisabled:     { color: colors.textDisabled },
  monthLabel:      { color: colors.text },
  dowRow:          { flexDirection: 'row', marginBottom: spacing.xs },
  dowLabel:        { flex: 1, textAlign: 'center', color: colors.textDisabled },
  grid:            { flexDirection: 'row', flexWrap: 'wrap' },
  cell:            { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellSelected:    { backgroundColor: colors.primary, borderRadius: radius.full },
  cellToday:       { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.full },
  cellText:        { color: colors.text },
  cellTextSelected:{ color: colors.bg, fontWeight: '700' },
  cellTextToday:   { color: colors.primary },
  cellTextFuture:  { color: colors.textDisabled },
  dot:             { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, position: 'absolute', bottom: 3 },
  dotSelected:     { backgroundColor: colors.bg },
});
