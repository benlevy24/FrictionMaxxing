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
import { initNative } from '../../native/startup';
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
  const [dailyOpenLimit, setDailyOpenLimit] = useState({ enabled: false, limit: 3 });
  const [groupTimeCap, setGroupTimeCap]     = useState({ enabled: false });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (!active) return;
        setEnabledGames(s.enabledGames);
        setDifficulty(s.difficulty ?? 'medium');
        setFrictionMode(s.frictionMode === 'hard_limit' ? 'always' : (s.frictionMode ?? 'always'));
        setTimeConstraint(s.timeConstraint ?? { enabled: true });
        setDailyUsageTimer(s.dailyUsageTimer ?? { enabled: false, minutes: 30 });
        setDailyQuota(s.dailyQuota ?? { enabled: false });
        setDailyOpenLimit(s.dailyOpenLimit ?? { enabled: false, limit: 3 });
        setGroupTimeCap(s.groupTimeCap ?? { enabled: false });
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

  const OPEN_LIMIT_STEPS = [1, 2, 3, 5, 7, 10, 15, 20];

  async function toggleDailyOpenLimit() {
    const next = { ...dailyOpenLimit, enabled: !dailyOpenLimit.enabled };
    setDailyOpenLimit(next);
    await saveSettings({ dailyOpenLimit: next });
  }

  async function adjustOpenLimit(delta) {
    const idx = OPEN_LIMIT_STEPS.indexOf(dailyOpenLimit.limit);
    const currentIdx = idx === -1 ? 2 : idx;
    const nextIdx = Math.min(OPEN_LIMIT_STEPS.length - 1, Math.max(0, currentIdx + delta));
    const next = { ...dailyOpenLimit, limit: OPEN_LIMIT_STEPS[nextIdx] };
    setDailyOpenLimit(next);
    await saveSettings({ dailyOpenLimit: next });
  }

  async function toggleGroupTimeCap() {
    const next = { ...groupTimeCap, enabled: !groupTimeCap.enabled };
    setGroupTimeCap(next);
    await saveSettings({ groupTimeCap: next });
  }

  async function toggleDailyUsageTimer() {
    const next = { ...dailyUsageTimer, enabled: !dailyUsageTimer.enabled };
    setDailyUsageTimer(next);
    await saveSettings({ dailyUsageTimer: next });
    initNative(); // re-sync native monitoring state
  }

  const DAILY_LIMIT_STEPS = [1, 2, 5, 10, 15, 20, 30, 45, 60, 90, 120];

  async function adjustDailyUsageMinutes(delta) {
    const idx = DAILY_LIMIT_STEPS.indexOf(dailyUsageTimer.minutes);
    const currentIdx = idx === -1 ? 2 : idx; // default to 5 if not found
    const nextIdx = Math.min(DAILY_LIMIT_STEPS.length - 1, Math.max(0, currentIdx + delta));
    const next = { ...dailyUsageTimer, minutes: DAILY_LIMIT_STEPS[nextIdx] };
    setDailyUsageTimer(next);
    await saveSettings({ dailyUsageTimer: next });
    initNative(); // re-sync monitoring threshold
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
      'this deletes your high score, walk-aways, and all history. cannot be undone.',
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
          subtitle="when does friction fire?"
        >
          <View style={styles.diffRow}>
            {[
              { value: 'always',    label: '🔔  always on' },
              { value: 'threshold', label: '⏱  threshold'  },
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
                friction fires every time you open a friction app — no exceptions
              </AppText>
            </View>
          )}

          {frictionMode === 'threshold' && (
            <View style={styles.lockoutRow}>
              <AppText variant="caption" style={styles.lockoutLabel}>daily limit per app</AppText>
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
                once you've spent {dailyUsageTimer.minutes} min in any friction app today, friction fires every time you try to reopen it. the same limit applies to all friction apps — per-app customization coming later.{'\n\n'}enforcement requires DeviceActivityMonitor (mac build task #20). this setting is saved but not yet active.
              </AppText>
            </View>
          )}
        </Section>

        {/* Group time cap */}
        <Section
          title="🛑  group time cap"
          subtitle="once a group's daily budget runs out, walk away is the only option"
          toggle={{ value: groupTimeCap.enabled, onToggle: toggleGroupTimeCap }}
        >
          {groupTimeCap.enabled && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => navigation.navigate('GroupBudgets')}
            >
              <AppText variant="base" style={styles.linkLabel}>⚙️  manage groups</AppText>
              <AppText variant="caption" style={styles.linkSub}>
                assign apps to groups and set a shared daily minute budget
              </AppText>
              <AppText variant="base" style={styles.linkChevron}>›</AppText>
            </TouchableOpacity>
          )}
        </Section>

        {/* Time constraint */}
        <Section
          title="⏳  time constraint"
          subtitle="beat a game, then pick how long you're allowed in"
          toggle={{ value: timeConstraint.enabled, onToggle: toggleTimeConstraint }}
        >
          {timeConstraint.enabled && (
            <View style={styles.lockoutRow}>
              <AppText variant="caption" style={styles.lockoutNote}>
                30 sec · 1 min · 90 sec · 2.5 min · 5 min{'\n'}
                you choose the session length after beating the game
              </AppText>
            </View>
          )}
        </Section>

        {/* Daily game quota */}
        <Section
          title="🎲  game minimum"
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

        {/* Daily open limit */}
        <Section
          title="🔒  daily open limit"
          subtitle="lock an app to N opens per day — after that, walk away is the only option"
          toggle={{ value: dailyOpenLimit.enabled, onToggle: toggleDailyOpenLimit }}
        >
          {dailyOpenLimit.enabled && (
            <View style={styles.lockoutRow}>
              <AppText variant="caption" style={styles.lockoutLabel}>max opens per app per day</AppText>
              <View style={styles.lockoutControls}>
                <TouchableOpacity
                  onPress={() => adjustOpenLimit(-1)}
                  style={[styles.lockoutArrow, dailyOpenLimit.limit <= 1 && styles.lockoutArrowDisabled]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  disabled={dailyOpenLimit.limit <= 1}
                >
                  <AppText style={styles.lockoutArrowText}>‹</AppText>
                </TouchableOpacity>
                <View style={styles.lockoutValue}>
                  <AppText variant="subheading" style={styles.lockoutValueText}>
                    {dailyOpenLimit.limit}x
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => adjustOpenLimit(1)}
                  style={[styles.lockoutArrow, dailyOpenLimit.limit >= 20 && styles.lockoutArrowDisabled]}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  disabled={dailyOpenLimit.limit >= 20}
                >
                  <AppText style={styles.lockoutArrowText}>›</AppText>
                </TouchableOpacity>
              </View>
              <AppText variant="caption" style={styles.lockoutNote}>
                applies to all friction apps — same limit for each
              </AppText>
            </View>
          )}
        </Section>

        {/* Difficulty */}
        <Section title="🥵  difficulty" subtitle="how hard should the games be?">
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
              wipes high score, walk-aways, and all history
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
