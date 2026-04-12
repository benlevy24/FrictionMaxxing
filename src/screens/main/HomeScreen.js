import { View, ScrollView, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';

// Placeholder data — will be replaced by AsyncStorage in task #16
const MOCK_BLOCKED_APPS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️' },
  { id: 'x', label: 'X / Twitter', emoji: '🐦' },
  { id: 'facebook', label: 'Facebook', emoji: '👍' },
  { id: 'snapchat', label: 'Snapchat', emoji: '👻' },
  { id: 'reddit', label: 'Reddit', emoji: '🤖' },
];

const MOCK_TODAY = {
  intercepted: 14,
  completed: 9,
  skipped: 5,
};

const MOCK_STREAK = 4;

export default function HomeScreen({ navigation }) {
  const completionRate =
    MOCK_TODAY.intercepted > 0
      ? Math.round((MOCK_TODAY.completed / MOCK_TODAY.intercepted) * 100)
      : 0;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <AppText variant="xxl">today</AppText>
          <AppText variant="caption">you've been annoyed {MOCK_TODAY.intercepted} times</AppText>
        </View>

        {/* Streak */}
        <Card style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View>
              <AppText variant="caption">current streak</AppText>
              <AppText variant="xxl" style={styles.streakNumber}>
                {MOCK_STREAK} 🔥
              </AppText>
              <AppText variant="caption">days without giving up</AppText>
            </View>
          </View>
        </Card>

        {/* Today's stats */}
        <View style={styles.statsRow}>
          <StatBox label="intercepted" value={MOCK_TODAY.intercepted} emoji="🚧" />
          <StatBox label="completed" value={MOCK_TODAY.completed} emoji="✅" />
          <StatBox label="rage-quit" value={MOCK_TODAY.skipped} emoji="🏳️" />
        </View>

        {/* Completion rate */}
        <Card>
          <AppText variant="caption" style={styles.rateLabel}>completion rate today</AppText>
          <View style={styles.rateBarBg}>
            <View style={[styles.rateBarFill, { width: `${completionRate}%` }]} />
          </View>
          <AppText variant="sm" style={styles.rateValue}>{completionRate}%</AppText>
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
            {MOCK_BLOCKED_APPS.map((app) => (
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
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
