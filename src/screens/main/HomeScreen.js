import { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import {
  getSettings,
  saveSettings,
  getEvents,
  computeStreak,
  deriveTodayStats,
} from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

export default function HomeScreen() {
  const [loading, setLoading]       = useState(true);
  const [today, setToday]           = useState({ intercepted: 0, completed: 0, skipped: 0 });
  const [streak, setStreak]         = useState({ current: 0, best: 0 });
  const [gatedApps, setGatedApps]   = useState([]);
  const [hiddenAppIds, setHiddenAppIds] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const [settings, events] = await Promise.all([getSettings(), getEvents()]);
        if (!active) return;
        setToday(deriveTodayStats(events));
        setStreak(computeStreak(events));
        const hidden = settings.hiddenAppIds ?? [];
        setHiddenAppIds(hidden);
        // Derive gated apps from event history, excluding manually hidden ones
        const seen = new Map();
        for (const e of events) {
          if (!hidden.includes(e.appId) && !seen.has(e.appId)) {
            seen.set(e.appId, { id: e.appId, label: e.appLabel, emoji: e.appEmoji });
          }
        }
        setGatedApps([...seen.values()]);
        setLoading(false);
      }
      load();
      return () => { active = false; };
    }, [])
  );

  function handleHideApp(app) {
    Alert.alert(
      `remove ${app.label}?`,
      "hides it from this list. your stats history stays intact. it'll reappear if the Shortcut fires again.",
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'remove',
          style: 'destructive',
          onPress: async () => {
            const next = [...hiddenAppIds, app.id];
            setHiddenAppIds(next);
            setGatedApps((prev) => prev.filter((a) => a.id !== app.id));
            await saveSettings({ hiddenAppIds: next });
          },
        },
      ]
    );
  }

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

        {/* Friction success rate */}
        <Card>
          <AppText variant="caption" style={styles.rateLabel}>friction success rate today</AppText>
          <View style={styles.rateBarBg}>
            <View style={[styles.rateBarFill, { width: `${frictionSuccessRate}%` }]} />
          </View>
          <AppText variant="sm" style={styles.rateValue}>{frictionSuccessRate}%</AppText>
        </Card>

        {/* Gated apps */}
        <View style={styles.section}>
          <AppText variant="subheading">gated apps</AppText>
          {gatedApps.length === 0 ? (
            <AppText variant="caption" style={styles.noApps}>
              none yet — apps appear here automatically after their first intercepted session
            </AppText>
          ) : (
            <View style={styles.appChips}>
              {gatedApps.map((app) => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.chip}
                  onLongPress={() => handleHideApp(app)}
                  activeOpacity={0.7}
                >
                  <AppText variant="sm">{app.emoji} {app.label}</AppText>
                  <TouchableOpacity
                    onPress={() => handleHideApp(app)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <AppText variant="xs" style={styles.chipRemove}>✕</AppText>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {gatedApps.length > 0 && (
            <AppText variant="caption" style={styles.chipHint}>
              tap ✕ to remove if you've deleted that Shortcut
            </AppText>
          )}
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
  scroll:           { paddingBottom: spacing.xxl, gap: spacing.md },
  header:           { marginTop: spacing.xl, marginBottom: spacing.sm, gap: spacing.xs },
  streakCard:       { borderColor: colors.border },
  streakCardActive: { borderColor: colors.primary },
  streakRow:        { flexDirection: 'row', alignItems: 'center' },
  streakNumber:     { color: colors.primary, marginVertical: spacing.xs },
  statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statBox:          { width: '47.5%', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  statEmoji:        { fontSize: 22 },
  statValue:        { color: colors.text },
  rateLabel:  { marginBottom: spacing.sm },
  rateBarBg:  { height: 8, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  rateBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  rateValue:  { marginTop: spacing.xs, color: colors.textSub, textAlign: 'right' },
  section:          { gap: spacing.sm },
  noApps:           { color: colors.textDisabled },
  appChips:         { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRemove:  { color: colors.textDisabled, fontSize: 10 },
  chipHint:    { color: colors.textDisabled },
});
