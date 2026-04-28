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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (!active) return;
        setEnabledGames(s.enabledGames);
        setDifficulty(s.difficulty ?? 'medium');
        setLoading(false);
      });
      return () => { active = false; };
    }, [])
  );

  async function selectDifficulty(level) {
    setDifficulty(level);
    await saveSettings({ difficulty: level });
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

        {/* Geo-blocking */}
        <Section title="geo-blocking" subtitle="location-based">
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('GeoBlocking')}
          >
            <AppText variant="base" style={styles.linkLabel}>🌍  free zones</AppText>
            <AppText variant="caption" style={styles.linkSub}>
              block friction at saved locations (home, gym, etc.)
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

function Section({ title, subtitle, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="subheading">{title}</AppText>
        {subtitle && <AppText variant="caption">{subtitle}</AppText>}
      </View>
      <Card style={styles.sectionCard}>{children}</Card>
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
  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
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
  destructiveRow:   { paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: spacing.xs },
  destructiveLabel: { color: colors.danger },
  destructiveSub:   { color: colors.textDisabled },
  linkRow:          { paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: spacing.xs },
  linkLabel:        { color: colors.text },
  linkSub:          { color: colors.textDisabled },
  linkChevron:      { color: colors.textDisabled, alignSelf: 'flex-end' },
});
