import { useState } from 'react';
import { View, ScrollView, Switch, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { colors, spacing, radius } from '../../theme';

// Mock state — will be persisted via AsyncStorage in task #16
const DEFAULT_BLOCKED_APPS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸', enabled: true },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵', enabled: true },
  { id: 'youtube', label: 'YouTube', emoji: '▶️', enabled: true },
  { id: 'x', label: 'X / Twitter', emoji: '🐦', enabled: true },
  { id: 'facebook', label: 'Facebook', emoji: '👍', enabled: true },
  { id: 'snapchat', label: 'Snapchat', emoji: '👻', enabled: true },
  { id: 'reddit', label: 'Reddit', emoji: '🤖', enabled: true },
  { id: 'threads', label: 'Threads', emoji: '🧵', enabled: false },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼', enabled: false },
  { id: 'pinterest', label: 'Pinterest', emoji: '📌', enabled: false },
];

const DEFAULT_GAMES = [
  { id: 'tictactoe', label: 'Unbeatable Tic Tac Toe', emoji: '❌', enabled: true },
  { id: 'maze', label: 'Confusing Maze', emoji: '🌀', enabled: true },
  { id: 'hangman', label: 'Obscure Hangman', emoji: '🪢', enabled: true },
  { id: 'math', label: 'Annoying Math', emoji: '🔢', enabled: true },
];

export default function SettingsScreen() {
  const [blockedApps, setBlockedApps] = useState(DEFAULT_BLOCKED_APPS);
  const [games, setGames] = useState(DEFAULT_GAMES);
  const [notifications, setNotifications] = useState({
    milestones: false,
  });

  function toggleApp(id) {
    setBlockedApps((prev) =>
      prev.map((app) => (app.id === id ? { ...app, enabled: !app.enabled } : app))
    );
  }

  function toggleGame(id) {
    const enabled = games.filter((g) => g.enabled);
    const target = games.find((g) => g.id === id);
    if (target.enabled && enabled.length === 1) {
      Alert.alert('at least one game must be enabled', 'otherwise what are we even doing here');
      return;
    }
    setGames((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  }

  function toggleNotification(key) {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
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
          onPress: () => {
            // TODO (task #16): clear AsyncStorage stats keys
            Alert.alert('done', 'stats wiped. fresh start.');
          },
        },
      ]
    );
  }

  const activeAppCount = blockedApps.filter((a) => a.enabled).length;
  const activeGameCount = games.filter((g) => g.enabled).length;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <AppText variant="xxl">settings</AppText>
        </View>

        {/* Blocked apps */}
        <Section
          title="blocked apps"
          subtitle={`${activeAppCount} active`}
        >
          {blockedApps.map((app) => (
            <SettingRow
              key={app.id}
              emoji={app.emoji}
              label={app.label}
              value={app.enabled}
              onToggle={() => toggleApp(app.id)}
            />
          ))}
        </Section>

        {/* Games */}
        <Section
          title="games"
          subtitle={`${activeGameCount} in rotation`}
        >
          {games.map((game) => (
            <SettingRow
              key={game.id}
              emoji={game.emoji}
              label={game.label}
              value={game.enabled}
              onToggle={() => toggleGame(game.id)}
            />
          ))}
        </Section>

        {/* Notifications */}
        <Section title="notifications" subtitle="off by default — this app is about using your phone less">
          <SettingRow
            emoji="🏆"
            label="milestone alerts"
            sublabel="notify when you hit a walk-away milestone"
            value={notifications.milestones}
            onToggle={() => toggleNotification('milestones')}
          />
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
      <Card style={styles.sectionCard}>
        {children}
      </Card>
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
  scroll: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowEmoji: {
    width: 28,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  destructiveRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  destructiveLabel: {
    color: colors.danger,
  },
  destructiveSub: {
    color: colors.textDisabled,
  },
});
