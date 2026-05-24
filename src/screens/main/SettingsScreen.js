import { useState, useCallback } from 'react';
import { View, ScrollView, Switch, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import {
  getSettings,
  saveSettings,
  clearAllData,
  DEFAULT_ENABLED_GAMES,
} from '../../utils/storage';
import { GAMES } from '../../games/registry';
import { colors, spacing, radius } from '../../theme';

export default function SettingsScreen({ navigation }) {
  const [loading, setLoading]           = useState(true);
  const [enabledGames, setEnabledGames] = useState(DEFAULT_ENABLED_GAMES);
  const [difficulty, setDifficulty]     = useState('medium');
  const [notifications, setNotifications] = useState({ milestones: false });
  const [frictionMode, setFrictionMode]     = useState('always');
  const [timeConstraint, setTimeConstraint] = useState({ enabled: true });
  const [dailyUsageTimer, setDailyUsageTimer] = useState({ enabled: false, minutes: 30 });
  const [dailyQuota, setDailyQuota] = useState({ enabled: false });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (!active) return;
        setEnabledGames(s.enabledGames);
        setDifficulty(s.difficulty ?? 'medium');
        setFrictionMode(s.frictionMode ?? 'always');
        setTimeConstraint(s.timeConstraint ?? { enabled: true });
        setDailyUsageTimer(s.dailyUsageTimer ?? { enabled: false, minutes: 30 });
        setDailyQuota(s.dailyQuota ?? { enabled: false });
        setLoading(false);
      });
      return () => { active = false; };
    }, [])
  );

  async function selectDifficulty(level) {
    setDifficulty(level);
    await saveSettings({ difficulty: level });
  }

  async function selectFrictionMode(mode) {
    setFrictionMode(mode);
    await saveSettings({ frictionMode: mode });
  }

  async function toggleTimeConstraint() {
    const next = { ...timeConstraint, enabled: !timeConstraint.enabled };
    setTimeConstraint(next);
    await saveSettings({ timeConstraint: next });
  }

  async function toggleDailyQuota() {
    const next = { ...dailyQuota, enabled: !dailyQuota.enabled };
    setDailyQuota(next);
    await saveSettings({ dailyQuota: next });
  }

  async function toggleDailyUsageTimer() {
    const next = { ...dailyUsageTimer, enabled: !dailyUsageTimer.enabled };
    setDailyUsageTimer(next);
    await saveSettings({ dailyUsageTimer: next });
  }

  const DAILY_LIMIT_STEPS = [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120];

  async function adjustDailyUsageMinutes(delta) {
    const idx = DAILY_LIMIT_STEPS.indexOf(dailyUsageTimer.minutes);
    const currentIdx = idx === -1 ? 2 : idx; // default to 5 if not found
    const nextIdx = Math.min(DAILY_LIMIT_STEPS.length - 1, Math.max(0, currentIdx + delta));
    const next = { ...dailyUsageTimer, minutes: DAILY_LIMIT_STEPS[nextIdx] };
    setDailyUsageTimer(next);
    await saveSettings({ dailyUsageTimer: next });
  }

  async function toggleGame(id) {
    const enabledCount = enabledGames.filter((g) => g === id).length > 0
      ? enabledGames.length
      : enabledGames.length;
    const isEnabled = enabledGames.includes(id);

    if (isEnabled && enabledGames.length === 1) {
      Alert.alert('at least one game must be enabled', 'otherwise what are we even doing here');
      return;
    }

    const next = isEnabled
      ? enabledGames.filter((g) => g !== id)
      : [...enabledGames, id];
    setEnabledGames(next);
    await saveSettings({ enabledGames: next });
  }

  function handleResetStats() {
    Alert.alert(
      'reset all stats?',
      'this deletes your streak, walk-aways, and all history. cannot be undone.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'reset everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            // Reload settings to defaults
            const s = await getSettings();
            setEnabledGames(s.enabledGames);
            Alert.alert('done', 'stats wiped. fresh start.');
          },
        },
      ]
    );
  }

  const activeGameCount = enabledGames.length;

  if (loading) return <ScreenWrapper />;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <AppText variant="xxl">settings</AppText>
        </View>

        {/* Mode */}
        <Section
          title="mode"
          subtitle="how friction fires"
        >
          <View style={styles.diffRow}>
            {[
              { value: 'always',     label: '🔔  always on'  },
              { value: 'threshold',  label: '⏱  threshold'   },
              { value: 'hard_limit', label: '🔒  time cap'  },
            ].map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.diffPill, frictionMode === value && styles.diffPillActive]}
                onPress={() => selectFrictionMode(value)}
              >
                <AppText
                  variant="caption"
                  style={[styles.diffLabel, frictionMode === value && styles.diffLabelActive]}
                >
                  {label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {frictionMode === 'always' && (
            <View style={styles.lockoutRow}>
              <AppText variant="caption" style={styles.lockoutNote}>
                friction fires every time you open a gated app — no exceptions
              </AppText>
            </View>
          )}

          {frictionMode === 'threshold' && (
            <View style={styles.lockoutRow}>
              <AppText variant="caption" style={styles.lockoutLabel}>per app, per day</AppText>
              <View style={styles.lockoutControls}>
                <TouchableOpacity
                  onPress={() => adjustDailyUsageMinutes(-1)}
                  style={[styles.lockoutArrow, dailyUsageTimer.minutes <= 1 && styles.lockoutArrowDisabled]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  disabled={dailyUsageTimer.minutes <= 1}
                >
                  <AppText style={styles.lockoutArrowText}>‹</AppText>
                </TouchableOpacity>
                <View style={styles.lockoutValue}>
                  <AppText variant="subheading" style={styles.lockoutValueText}>
                    {dailyUsageTimer.minutes} min
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => adjustDailyUsageMinutes(1)}
                  style={[styles.lockoutArrow, dailyUsageTimer.minutes >= 120 && styles.lockoutArrowDisabled]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  disabled={dailyUsageTimer.minutes >= 120}
                >
                  <AppText style={styles.lockoutArrowText}>›</AppText>
                </TouchableOpacity>
              </View>
              <AppText variant="caption" style={styles.lockoutNote}>
                fires friction once you've passed the daily limit — requires mac build
              </AppText>
            </View>
          )}

          {frictionMode === 'hard_limit' && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate('GroupBudgets')}
            >
              <AppText variant="base" style={styles.linkLabel}>⚙️  manage groups</AppText>
              <AppText variant="caption" style={styles.linkSub}>
                set daily budgets — once a group runs out, walk away is the only option
              </AppText>
              <AppText variant="base" style={styles.linkChevron}>›</AppText>
            </TouchableOpacity>
          )}
        </Section>

        {/* Time constraint */}
        <Section
          title="time constraint"
          subtitle="beat a game, then pick how long you're allowed in"
          toggle={{ value: timeConstraint.enabled, onToggle: toggleTimeConstraint }}
        />

        {/* Daily game quota */}
        <Section
          title="game minimum"
          subtitle="beat a minimum number of games before any app opens"
          toggle={{ value: dailyQuota.enabled, onToggle: toggleDailyQuota }}
        >
          {dailyQuota.enabled && (
            <View style={styles.lockoutRow}>
              <AppText variant="caption" style={styles.lockoutNote}>
                easy: 5 games · hard: 10 games{'\n'}
                each app open plays 1 game then closes — accumulate across apps
              </AppText>
            </View>
          )}
        </Section>

        {/* Difficulty */}
        <Section title="difficulty" subtitle="how hard should the games be?">
          <View style={styles.diffRow}>
            {['easy', 'hard'].map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.diffPill, difficulty === level && styles.diffPillActive]}
                onPress={() => selectDifficulty(level)}
              >
                <AppText
                  variant="base"
                  style={[styles.diffLabel, difficulty === level && styles.diffLabelActive]}
                >
                  {level}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* Games */}
        <Section title="games" subtitle={`${activeGameCount} in rotation`}>
          {GAMES.map((game) => (
            <SettingRow
              key={game.id}
              emoji={game.emoji}
              label={game.label}
              value={enabledGames.includes(game.id)}
              onToggle={() => toggleGame(game.id)}
            />
          ))}
        </Section>

        {/* Notifications */}
        <Section
          title="notifications"
          subtitle="off by default — this app is about using your phone less"
        >
          <SettingRow
            emoji="🏆"
            label="milestone alerts"
            sublabel="notify when you hit a walk-away milestone"
            value={notifications.milestones}
            onToggle={() => setNotifications((p) => ({ ...p, milestones: !p.milestones }))}
          />
        </Section>

        {/* Geo-blocking + Schedule */}
        <Section title="free time" subtitle="when friction is paused">
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('GeoBlocking')}
          >
            <AppText variant="base" style={styles.linkLabel}>🌍  free zones</AppText>
            <AppText variant="caption" style={styles.linkSub}>
              pause friction at saved locations (home, gym, etc.)
            </AppText>
            <AppText variant="base" style={styles.linkChevron}>›</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Schedule')}
          >
            <AppText variant="base" style={styles.linkLabel}>🕐  schedule</AppText>
            <AppText variant="caption" style={styles.linkSub}>
              set hours when friction is active (e.g. 8 AM – 5 PM)
            </AppText>
            <AppText variant="base" style={styles.linkChevron}>›</AppText>
          </TouchableOpacity>
        </Section>

        {/* Setup */}
        <Section title="setup">
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Tutorial')}>
            <AppText variant="base" style={styles.linkLabel}>📋  setup guide</AppText>
            <AppText variant="caption" style={styles.linkSub}>
              connect via Shortcuts — one automation per app
            </AppText>
            <AppText variant="base" style={styles.linkChevron}>›</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('UsageEstimates')}>
            <AppText variant="base" style={styles.linkLabel}>⏱  usage estimates</AppText>
            <AppText variant="caption" style={styles.linkSub}>
              enter your Screen Time averages to track minutes saved
            </AppText>
            <AppText variant="base" style={styles.linkChevron}>›</AppText>
          </TouchableOpacity>
        </Section>

        {/* Dev */}
        <Section title="dev" subtitle="testing only">
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Game')}>
            <AppText variant="base" style={styles.linkLabel}>🎮  play a random game</AppText>
            <AppText variant="caption" style={styles.linkSub}>
              preview the game screen as if a Shortcut fired
            </AppText>
            <AppText variant="base" style={styles.linkChevron}>›</AppText>
          </TouchableOpacity>
        </Section>

        {/* Danger zone */}
        <Section title="danger zone">
          <TouchableOpacity style={styles.destructiveRow} onPress={handleResetStats}>
            <AppText variant="base" style={styles.destructiveLabel}>🗑️  reset all stats</AppText>
            <AppText variant="caption" style={styles.destructiveSub}>
              wipes streak, walk-aways, and all history
            </AppText>
          </TouchableOpacity>
        </Section>

      </ScrollView>
    </ScreenWrapper>
  );
}

function Section({ title, subtitle, toggle, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <AppText variant="subheading">{title}</AppText>
          {subtitle && <AppText variant="caption">{subtitle}</AppText>}
        </View>
        {toggle && (
          <Switch
            value={toggle.value}
            onValueChange={toggle.onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        )}
      </View>
      {children && <Card style={styles.sectionCard}>{children}</Card>}
    </View>
  );
}

function SettingRow({ emoji, label, sublabel, value, onToggle }) {
  return (
    <View style={styles.row}>
      <AppText variant="base" style={styles.rowEmoji}>{emoji}</AppText>
      <View style={styles.rowText}>
        <AppText variant="base">{label}</AppText>
        {sublabel && <AppText variant="caption">{sublabel}</AppText>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:         { paddingBottom: spacing.xxl, gap: spacing.lg },
  header:         { marginTop: spacing.xl },
  section:        { gap: spacing.sm },
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeaderText: { flex: 1, gap: 2 },
  sectionCard:    { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowEmoji:         { width: 28, textAlign: 'center' },
  rowText:          { flex: 1, gap: 2 },
  diffRow:          { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  diffPill: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  diffPillActive:   { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
  diffLabel:        { color: colors.textSub },
  diffLabelActive:  { color: colors.primary },
  lockoutRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  lockoutLabel:         { color: colors.textSub },
  lockoutControls:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lockoutArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockoutArrowDisabled: { opacity: 0.3 },
  lockoutArrowText:     { fontSize: 20, color: colors.text, lineHeight: 24 },
  lockoutValue: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  lockoutValueText:     { color: colors.primary },
  lockoutNote:          { color: colors.textDisabled, fontStyle: 'italic' },
  destructiveRow:   { paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: spacing.xs },
  destructiveLabel: { color: colors.danger },
  destructiveSub:   { color: colors.textDisabled },
  linkRow:          { paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: spacing.xs },
  linkLabel:        { color: colors.text },
  linkSub:          { color: colors.textDisabled },
  linkChevron:      { color: colors.textDisabled, alignSelf: 'flex-end' },
});
