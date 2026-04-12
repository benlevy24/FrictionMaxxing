import { View, ScrollView, Share, StyleSheet, TouchableOpacity } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';

// Placeholder data — will be replaced by AsyncStorage in task #16
const MOCK_ALL_TIME = {
  intercepted: 312,
  completed: 198,
  skipped: 114,
  streakBest: 11,
  streakCurrent: 4,
  daysSinceInstall: 23,
};

const MOCK_WEEKLY = [
  { day: 'Mon', intercepted: 18, completed: 12 },
  { day: 'Tue', intercepted: 24, completed: 20 },
  { day: 'Wed', intercepted: 10, completed: 6 },
  { day: 'Thu', intercepted: 31, completed: 22 },
  { day: 'Fri', intercepted: 42, completed: 25 },
  { day: 'Sat', intercepted: 15, completed: 11 },
  { day: 'Sun', intercepted: 14, completed: 9 },
];

const MOCK_BY_APP = [
  { id: 'instagram', label: 'Instagram', emoji: '📸', intercepted: 89, completed: 61 },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵', intercepted: 74, completed: 42 },
  { id: 'youtube', label: 'YouTube', emoji: '▶️', intercepted: 55, completed: 38 },
  { id: 'reddit', label: 'Reddit', emoji: '🤖', intercepted: 48, completed: 29 },
  { id: 'x', label: 'X / Twitter', emoji: '🐦', intercepted: 31, completed: 18 },
  { id: 'facebook', label: 'Facebook', emoji: '👍', intercepted: 15, completed: 10 },
];

const MAX_INTERCEPTED = Math.max(...MOCK_WEEKLY.map((d) => d.intercepted));

export default function StatsScreen() {
  const allTimeRate = Math.round(
    (MOCK_ALL_TIME.completed / MOCK_ALL_TIME.intercepted) * 100
  );

  async function handleShare() {
    const message =
      `my friction maxxing stats 🧱\n\n` +
      `📊 ${MOCK_ALL_TIME.intercepted} times intercepted\n` +
      `✅ ${MOCK_ALL_TIME.completed} games completed (${allTimeRate}% rate)\n` +
      `🏳️ ${MOCK_ALL_TIME.skipped} rage-quits\n` +
      `🔥 ${MOCK_ALL_TIME.streakCurrent} day streak (best: ${MOCK_ALL_TIME.streakBest})\n\n` +
      `yes, i needed a maze to stop opening instagram.`;

    try {
      await Share.share({ message });
    } catch (_) {
      // user cancelled or share unavailable — no-op
    }
  }

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <AppText variant="xxl">stats</AppText>
          <AppText variant="caption">
            {MOCK_ALL_TIME.daysSinceInstall} days of self-inflicted annoyance
          </AppText>
        </View>

        {/* All-time summary */}
        <View style={styles.summaryRow}>
          <SummaryBox emoji="🚧" value={MOCK_ALL_TIME.intercepted} label="all-time blocked" />
          <SummaryBox emoji="✅" value={MOCK_ALL_TIME.completed} label="games beaten" />
          <SummaryBox emoji={`${allTimeRate}%`} value={null} label="completion rate" isRate />
        </View>

        {/* Streak */}
        <Card style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <AppText variant="caption">current streak</AppText>
              <AppText variant="xxl" style={styles.streakCurrent}>
                {MOCK_ALL_TIME.streakCurrent} 🔥
              </AppText>
            </View>
            <View style={styles.divider} />
            <View style={styles.streakItem}>
              <AppText variant="caption">best streak</AppText>
              <AppText variant="xxl" style={styles.streakBest}>
                {MOCK_ALL_TIME.streakBest} 🏆
              </AppText>
            </View>
          </View>
        </Card>

        {/* 7-day bar chart */}
        <Card>
          <AppText variant="subheading" style={styles.sectionTitle}>last 7 days</AppText>
          <View style={styles.chart}>
            {MOCK_WEEKLY.map((d) => {
              const barHeight = MAX_INTERCEPTED > 0
                ? Math.round((d.intercepted / MAX_INTERCEPTED) * 80)
                : 0;
              const completedHeight = d.intercepted > 0
                ? Math.round((d.completed / d.intercepted) * barHeight)
                : 0;

              return (
                <View key={d.day} style={styles.barCol}>
                  <View style={styles.barContainer}>
                    <View style={[styles.barBg, { height: barHeight }]}>
                      <View style={[styles.barFill, { height: completedHeight }]} />
                    </View>
                  </View>
                  <AppText variant="xs" style={styles.barLabel}>{d.day}</AppText>
                  <AppText variant="xs" style={styles.barValue}>{d.intercepted}</AppText>
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
        <Card>
          <AppText variant="subheading" style={styles.sectionTitle}>by app</AppText>
          <View style={styles.appList}>
            {MOCK_BY_APP.map((app) => {
              const rate = Math.round((app.completed / app.intercepted) * 100);
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
      {!isRate && (
        <AppText variant="xl" style={styles.summaryValue}>{value}</AppText>
      )}
      <AppText variant="caption" style={styles.summaryLabel}>{label}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  summaryEmoji: {
    fontSize: 20,
  },
  summaryValue: {
    color: colors.text,
  },
  summaryLabel: {
    textAlign: 'center',
  },
  streakCard: {
    borderColor: colors.primary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  streakCurrent: {
    color: colors.primary,
  },
  streakBest: {
    color: colors.warning,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
    marginBottom: spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  barBg: {
    width: 20,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  barLabel: {
    color: colors.textSub,
  },
  barValue: {
    color: colors.textDisabled,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  legendText: {
    color: colors.textSub,
  },
  appList: {
    gap: spacing.md,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  appEmoji: {
    width: 28,
    textAlign: 'center',
  },
  appInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  appLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appRate: {
    color: colors.primary,
  },
  appBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  appBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  appSub: {
    color: colors.textSub,
  },
});
