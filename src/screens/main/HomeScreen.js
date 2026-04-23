import { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import Button from '../../components/Button';
import {
  getSettings,
  getEvents,
  computeStreak,
  deriveTodayStats,
  ALL_APPS,
} from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [today, setToday]     = useState({ intercepted: 0, completed: 0, skipped: 0 });
  const [streak, setStreak]   = useState({ current: 0, best: 0 });
  const [blockedApps, setBlockedApps] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [settings, events] = await Promise.all([getSettings(), getEvents()]);
        if (!active) return;
        setToday(deriveTodayStats(events));
        setStreak(computeStreak(events));
        setBlockedApps(ALL_APPS.filter((a) => settings.blockedApps.includes(a.id)));
        setLoading(false);
      }
      load();
      return () => { active = false; };
    }, [])
  );

  if (loading) return <ScreenWrapper />;

  const frictionSuccessRate =
    today.intercepted > 0
      ? Math.round(((today.walkedAway + today.rageQuit) / today.intercepted) * 100)
      : 0;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <AppText variant="xxl">today</AppText>
          <AppText variant="caption">
            {today.intercepted === 0
              ? 'no interceptions yet today 🤞'
              : `you've faced friction ${today.intercepted} time${today.intercepted !== 1 ? 's' : ''}`}
          </AppText>
        </View>

        {/* Streak */}
        <Card style={[styles.streakCard, streak.current > 0 && styles.streakCardActive]}>
          <View style={styles.streakRow}>
            <View>
              <AppText variant="caption">current streak</AppText>
              <AppText variant="xxl" style={styles.streakNumber}>
                {streak.current} {streak.current > 0 ? '🔥' : '✨'}
              </AppText>
              <AppText variant="caption">
                {streak.current === 0
                  ? 'walk away to start your streak'
                  : `consecutive day${streak.current !== 1 ? 's' : ''} you resisted`}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Today's stats — 2×2 grid */}
        <View style={styles.statsGrid}>
          <StatBox label="intercepted"   value={today.intercepted}  emoji="🚧" />
          <StatBox label="walked away"   value={today.walkedAway}   emoji="🚶" />
          <StatBox label="opened anyway" value={today.openedAnyway} emoji="🧐" />
          <StatBox label="rage-quit"     value={today.rageQuit}     emoji="🏳️" />
        </View>

        {/* Completion rate */}
        <Card>
          <AppText variant="caption" style={styles.rateLabel}>friction success rate today</AppText>
          <View style={styles.rateBarBg}>
            <View style={[styles.rateBarFill, { width: `${frictionSuccessRate}%` }]} />
          </View>
          <AppText variant="sm" style={styles.rateValue}>{frictionSuccessRate}%</AppText>
        </Card>

        {/* Blocked apps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="subheading">blocked apps</AppText>
            <Button
              label="edit"
              variant="ghost"
              onPress={() => navigation.navigate('Settings')}
              style={styles.editBtn}
            />
          </View>
          <View style={styles.appChips}>
            {blockedApps.map((app) => (
              <View key={app.id} style={styles.chip}>
                <AppText variant="sm">{app.emoji} {app.label}</AppText>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

function StatBox({ label, value, emoji }) {
  return (
    <Card style={styles.statBox}>
      <AppText variant="lg" style={styles.statEmoji}>{emoji}</AppText>
      <AppText variant="xxl" style={styles.statValue}>{value}</AppText>
      <AppText variant="caption">{label}</AppText>
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
  streakCard: {
    borderColor: colors.border,
  },
  streakCardActive: {
    borderColor: colors.primary,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakNumber: {
    color: colors.primary,
    marginVertical: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    width: '47.5%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  statEmoji: {
    fontSize: 22,
  },
  statValue: {
    color: colors.text,
  },
  rateLabel: {
    marginBottom: spacing.sm,
  },
  rateBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  rateBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  rateValue: {
    marginTop: spacing.xs,
    color: colors.textSub,
    textAlign: 'right',
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: 0,
  },
  appChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
