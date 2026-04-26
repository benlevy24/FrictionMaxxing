import { useState, useCallback } from 'react';
import { View, ScrollView, Share, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import Button from '../../components/Button';
import {
  getSettings,
  getEvents,
  computeStreak,
  deriveWeeklyStats,
  deriveByAppStats,
  deriveAllTimeStats,
  deriveMinutesSaved,
} from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

export default function StatsScreen({ navigation }) {
  const [loading, setLoading]             = useState(true);
  const [allTime, setAllTime]             = useState(null);
  const [weekly, setWeekly]               = useState([]);
  const [byApp, setByApp]                 = useState([]);
  const [minutesSaved, setMinutesSaved]   = useState(null); // null = no estimates configured
  const [hasEstimates, setHasEstimates]   = useState(false);
  const [selectedDay, setSelectedDay]     = useState(null);
  const [legendTooltip, setLegendTooltip] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [settings, events] = await Promise.all([getSettings(), getEvents()]);
        if (!active) return;
        const streak = computeStreak(events);
        setAllTime(deriveAllTimeStats(events, streak, settings.installDate));
        setWeekly(deriveWeeklyStats(events));
        setByApp(deriveByAppStats(events));
        const estimates = settings.appUsageEstimates ?? {};
        const anyEstimate = Object.values(estimates).some(
          (e) => e.dailyOpens > 0 && e.dailyMinutes > 0
        );
        setHasEstimates(anyEstimate);
        setMinutesSaved(anyEstimate ? deriveMinutesSaved(events, estimates) : null);
        setLoading(false);
      }
      load();
      return () => { active = false; };
    }, [])
  );

  if (loading || !allTime) return <ScreenWrapper />;

  const allTimeRate =
    allTime.intercepted > 0
      ? Math.round(((allTime.walkedAway + allTime.rageQuit) / allTime.intercepted) * 100)
      : 0;

  const maxIntercepted = Math.max(...weekly.map((d) => d.intercepted), 1);

  async function handleShare() {
    const message =
      `day ${allTime.daysSinceInstall} of needing a maze to stop doomscrolling.\n\n` +
      `🚧 ${allTime.intercepted} intercepts\n` +
      `🚶 ${allTime.walkedAway} walked away\n` +
      `🏳️ ${allTime.rageQuit} rage-quits (the games are genuinely unfair)\n` +
      `🧐 ${allTime.openedAnyway} opened anyway (i'm only human)\n\n` +
      `${allTimeRate}% friction success rate. ${allTime.streakCurrent > 0 ? `${allTime.streakCurrent} day streak.` : `streak: none. keep trying.`}\n\n` +
      `yes i downloaded an app that gives me annoying games before i can doomscroll.\n` +
      `no i'm not okay. get it at frictionmaxxing.app`;
    try {
      await Share.share({ message });
    } catch { /* cancelled */ }
  }

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <AppText variant="xxl">stats</AppText>
          <AppText variant="caption">
            {allTime.daysSinceInstall} day{allTime.daysSinceInstall !== 1 ? 's' : ''} of friction
          </AppText>
        </View>

        {/* All-time summary — 2×2 grid matching home screen */}
        <View style={styles.summaryGrid}>
          <SummaryBox emoji="🚧" value={allTime.intercepted}  label="intercepted" />
          <SummaryBox emoji="🚶" value={allTime.walkedAway}   label="walked away" />
          <SummaryBox emoji="🧐" value={allTime.openedAnyway} label="opened anyway" />
          <SummaryBox emoji="🏳️" value={allTime.rageQuit}    label="rage-quit" />
        </View>

        {/* Minutes saved */}
        {hasEstimates ? (
          <Card style={styles.minutesCard}>
            <AppText variant="caption" style={styles.minutesLabel}>⏱  estimated time saved</AppText>
            <AppText variant="xxl" style={styles.minutesValue}>
              {minutesSaved >= 60
                ? `${Math.floor(minutesSaved / 60)}h ${minutesSaved % 60}m`
                : `${minutesSaved}m`}
            </AppText>
            <AppText variant="caption" style={styles.minutesSub}>
              based on your Screen Time averages × times you didn't open the app
            </AppText>
          </Card>
        ) : (
          <TouchableOpacity
            style={styles.minutesPrompt}
            onPress={() => navigation.navigate('UsageEstimates')}
          >
            <AppText variant="base" style={styles.minutesPromptText}>
              ⏱  add your Screen Time averages to see minutes saved →
            </AppText>
          </TouchableOpacity>
        )}

        {/* Friction success rate */}
        <Card>
          <AppText variant="caption" style={styles.rateLabel}>all-time friction success rate</AppText>
          <View style={styles.rateBarBg}>
            <View style={[styles.rateBarFill, { width: `${allTimeRate}%` }]} />
          </View>
          <AppText variant="sm" style={styles.rateValue}>{allTimeRate}%</AppText>
          <AppText variant="caption" style={styles.rateDef}>
            of all interceptions, how often you didn't end up in the app — either by walking away or rage-quitting the game. "opened anyway" doesn't count.
          </AppText>
        </Card>

        {/* Streak */}
        <Card style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <AppText variant="caption">current streak</AppText>
              <AppText variant="xxl" style={styles.streakCurrent}>
                {allTime.streakCurrent} {allTime.streakCurrent > 0 ? '🔥' : '✨'}
              </AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.streakItem}>
              <AppText variant="caption">best streak</AppText>
              <AppText variant="xxl" style={styles.streakBest}>
                {allTime.streakBest} 🏆
              </AppText>
            </View>
          </View>
        </Card>

        {/* 7-day bar chart */}
        <Card>
          <AppText variant="subheading" style={styles.sectionTitle}>last 7 days</AppText>
          <View style={styles.chart}>
            {weekly.map((d) => {
              const barH = Math.round((d.intercepted / maxIntercepted) * 80);
              const fillH = d.intercepted > 0
                ? Math.round((d.succeeded / d.intercepted) * barH)
                : 0;
              const isSelected = selectedDay?.date === d.date;
              return (
                <TouchableOpacity
                  key={d.date}
                  style={styles.barCol}
                  onPress={() => setSelectedDay(isSelected ? null : d)}
                  activeOpacity={0.7}
                >
                  <View style={styles.barContainer}>
                    <View style={[
                      styles.barBg,
                      { height: Math.max(barH, 2) },
                      isSelected && styles.barBgSelected,
                    ]}>
                      <View style={[styles.barFill, { height: fillH }]} />
                    </View>
                  </View>
                  <AppText variant="xs" style={[styles.barLabel, isSelected && styles.barLabelSelected]}>
                    {d.day}
                  </AppText>
                  <AppText variant="xs" style={styles.barValue}>
                    {d.intercepted > 0 ? d.intercepted : ''}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected day breakdown */}
          {selectedDay && (
            <View style={styles.dayBreakdown}>
              <AppText variant="caption" style={styles.dayBreakdownTitle}>{selectedDay.day}</AppText>
              <View style={styles.dayBreakdownRow}>
                <AppText variant="xs" style={styles.dayBreakdownItem}>🚧 {selectedDay.intercepted} intercepted</AppText>
                <AppText variant="xs" style={styles.dayBreakdownItem}>🚶 {selectedDay.walkedAway} walked away</AppText>
                <AppText variant="xs" style={styles.dayBreakdownItem}>🏳️ {selectedDay.rageQuit} rage-quit</AppText>
                <AppText variant="xs" style={styles.dayBreakdownItem}>🧐 {selectedDay.openedAnyway} opened anyway</AppText>
              </View>
            </View>
          )}

          {/* Legend */}
          <View style={styles.legend}>
            <TouchableOpacity
              style={styles.legendItem}
              onPress={() => setLegendTooltip(legendTooltip === 'intercepted' ? null : 'intercepted')}
            >
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <AppText variant="xs" style={[styles.legendText, legendTooltip === 'intercepted' && styles.legendTextActive]}>
                intercepted
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.legendItem}
              onPress={() => setLegendTooltip(legendTooltip === 'resisted' ? null : 'resisted')}
            >
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <AppText variant="xs" style={[styles.legendText, legendTooltip === 'resisted' && styles.legendTextActive]}>
                resisted
              </AppText>
            </TouchableOpacity>
          </View>
          {legendTooltip === 'resisted' && (
            <AppText variant="xs" style={styles.tooltipText}>
              times you didn't end up in the app — walked away or rage-quit the game
            </AppText>
          )}
          {legendTooltip === 'intercepted' && (
            <AppText variant="xs" style={styles.tooltipText}>
              total times the friction game popped up that day
            </AppText>
          )}
        </Card>

        {/* Per-app breakdown */}
        {byApp.length > 0 && (
          <Card>
            <AppText variant="subheading" style={styles.sectionTitle}>by app</AppText>
            <View style={styles.appList}>
              {byApp.map((app) => {
                const rate = app.intercepted > 0
                  ? Math.round((app.succeeded / app.intercepted) * 100)
                  : 0;
                return (
                  <View key={app.id} style={styles.appRow}>
                    <AppText variant="base" style={styles.appEmoji}>{app.emoji}</AppText>
                    <View style={styles.appInfo}>
                      <View style={styles.appLabelRow}>
                        <AppText variant="sm">{app.label}</AppText>
                        <AppText variant="xs" style={styles.appRate}>{rate}%</AppText>
                      </View>
                      <View style={styles.appBarBg}>
                        <View style={[styles.appBarFill, { width: `${rate}%` }]} />
                      </View>
                      <AppText variant="xs" style={styles.appSub}>
                        {app.intercepted} intercepted · {app.succeeded} resisted
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {byApp.length === 0 && (
          <Card>
            <AppText variant="caption" style={styles.emptyText}>
              no interceptions recorded yet. use the app for a bit first.
            </AppText>
          </Card>
        )}

        {/* Share */}
        <Button label="share my stats 📤" variant="secondary" onPress={handleShare} />
        <AppText variant="caption" style={styles.shareWarning}>
          ⚠️ sharing to a gated app counts as opening it. your streak is at stake. worth it?
        </AppText>

      </ScrollView>
    </ScreenWrapper>
  );
}

function SummaryBox({ emoji, value, label }) {
  return (
    <Card style={styles.summaryBox}>
      <AppText variant="lg" style={styles.summaryEmoji}>{emoji}</AppText>
      <AppText variant="xl" style={styles.summaryValue}>{value}</AppText>
      <AppText variant="caption" style={styles.summaryLabel}>{label}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl, gap: spacing.md },
  header: { marginTop: spacing.xl, marginBottom: spacing.sm, gap: spacing.xs },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryBox: { width: '47.5%', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  summaryEmoji: { fontSize: 20 },
  summaryValue: { color: colors.text },
  summaryLabel: { textAlign: 'center' },
  minutesCard:       { gap: spacing.xs, borderColor: colors.primary },
  minutesLabel:      { color: colors.textSub },
  minutesValue:      { color: colors.primary },
  minutesSub:        { color: colors.textDisabled, lineHeight: 18 },
  minutesPrompt: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.md,
  },
  minutesPromptText: { color: colors.textDisabled },
  rateLabel: { marginBottom: spacing.sm },
  rateBarBg: { height: 8, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  rateBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  rateValue: { marginTop: spacing.xs, color: colors.textSub, textAlign: 'right' },
  rateDef:   { marginTop: spacing.sm, color: colors.textDisabled, lineHeight: 18 },
  streakCard: { borderColor: colors.primary },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  divider: { width: 1, height: 60, backgroundColor: colors.border, marginHorizontal: spacing.md },
  streakCurrent: { color: colors.primary },
  streakBest: { color: colors.warning },
  sectionTitle: { marginBottom: spacing.md },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
    marginBottom: spacing.sm,
  },
  barCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barContainer: { flex: 1, justifyContent: 'flex-end' },
  barBg: {
    width: 20,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.sm },
  barBgSelected: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primary },
  barLabel: { color: colors.textSub },
  barLabelSelected: { color: colors.primary },
  barValue: { color: colors.textDisabled },
  dayBreakdown: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  dayBreakdownTitle: { color: colors.primary, marginBottom: 2 },
  dayBreakdownRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dayBreakdownItem: { color: colors.textSub, width: '48%' },
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: radius.full },
  legendText: { color: colors.textSub },
  legendTextActive: { color: colors.primary },
  tooltipText: {
    color: colors.textDisabled,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  appList: { gap: spacing.md },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appEmoji: { width: 28, textAlign: 'center' },
  appInfo: { flex: 1, gap: spacing.xs },
  appLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  appRate: { color: colors.primary },
  appBarBg: { height: 6, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  appBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  appSub: { color: colors.textSub },
  emptyText: { color: colors.textSub, textAlign: 'center', paddingVertical: spacing.sm },
  shareWarning: { textAlign: 'center', color: colors.textDisabled, lineHeight: 18 },
});
