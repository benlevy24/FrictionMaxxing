import { useState, useCallback } from 'react';
import { View, ScrollView, Share, StyleSheet } from 'react-native';
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
} from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

export default function StatsScreen() {
  const [loading, setLoading]   = useState(true);
  const [allTime, setAllTime]   = useState(null);
  const [weekly, setWeekly]     = useState([]);
  const [byApp, setByApp]       = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [settings, events] = await Promise.all([getSettings(), getEvents()]);
        if (!active) return;
        const streak = computeStreak(events);
        setAllTime(deriveAllTimeStats(events, streak, settings.installDate));
        setWeekly(deriveWeeklyStats(events));
        setByApp(deriveByAppStats(events, settings.blockedApps));
        setLoading(false);
      }
      load();
      return () => { active = false; };
    }, [])
  );

  if (loading || !allTime) return <ScreenWrapper />;

  const allTimeRate =
    allTime.intercepted > 0
      ? Math.round((allTime.walkedAway / allTime.intercepted) * 100)
      : 0;

  const maxIntercepted = Math.max(...weekly.map((d) => d.intercepted), 1);

  async function handleShare() {
    const message =
      `my friction maxxing stats 🧱\n\n` +
      `📊 ${allTime.intercepted} times intercepted\n` +
      `💪 ${allTime.walkedAway} walked away (${allTimeRate}% rate)\n` +
      `🧐 ${allTime.openedAnyway} opened anyway\n` +
      `🏳️ ${allTime.rageQuit} rage-quits\n` +
      `🔥 ${allTime.streakCurrent} day streak (best: ${allTime.streakBest})\n\n` +
      `yes, i needed a maze to stop opening instagram.`;
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
            {allTime.daysSinceInstall} day{allTime.daysSinceInstall !== 1 ? 's' : ''} of self-inflicted annoyance
          </AppText>
        </View>

        {/* All-time summary */}
        <View style={styles.summaryRow}>
          <SummaryBox emoji="🚧" value={allTime.intercepted}  label="all-time blocked" />
          <SummaryBox emoji="💪" value={allTime.walkedAway}   label="walked away" />
          <SummaryBox emoji={`${allTimeRate}%`} value={null}  label="walk-away rate" isRate />
        </View>

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
                ? Math.round((d.completed / d.intercepted) * barH)
                : 0;
              return (
                <View key={d.date} style={styles.barCol}>
                  <View style={styles.barContainer}>
                    <View style={[styles.barBg, { height: Math.max(barH, 2) }]}>
                      <View style={[styles.barFill, { height: fillH }]} />
                    </View>
                  </View>
                  <AppText variant="xs" style={styles.barLabel}>{d.day}</AppText>
                  <AppText variant="xs" style={styles.barValue}>
                    {d.intercepted > 0 ? d.intercepted : ''}
                  </AppText>
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <AppText variant="xs" style={styles.legendText}>completed</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <AppText variant="xs" style={styles.legendText}>intercepted</AppText>
            </View>
          </View>
        </Card>

        {/* Per-app breakdown */}
        {byApp.length > 0 && (
          <Card>
            <AppText variant="subheading" style={styles.sectionTitle}>by app</AppText>
            <View style={styles.appList}>
              {byApp.map((app) => {
                const rate = app.intercepted > 0
                  ? Math.round((app.completed / app.intercepted) * 100)
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
                        {app.intercepted} blocked · {app.completed} beaten
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

      </ScrollView>
    </ScreenWrapper>
  );
}

function SummaryBox({ emoji, value, label, isRate }) {
  return (
    <Card style={styles.summaryBox}>
      <AppText variant="lg" style={styles.summaryEmoji}>{emoji}</AppText>
      {!isRate && <AppText variant="xl" style={styles.summaryValue}>{value}</AppText>}
      <AppText variant="caption" style={styles.summaryLabel}>{label}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl, gap: spacing.md },
  header: { marginTop: spacing.xl, marginBottom: spacing.sm, gap: spacing.xs },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryBox: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  summaryEmoji: { fontSize: 20 },
  summaryValue: { color: colors.text },
  summaryLabel: { textAlign: 'center' },
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
  barLabel: { color: colors.textSub },
  barValue: { color: colors.textDisabled },
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 8, height: 8, borderRadius: radius.full },
  legendText: { color: colors.textSub },
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
});
