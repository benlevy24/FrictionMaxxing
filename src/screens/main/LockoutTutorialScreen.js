import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import { colors, spacing, radius } from '../../theme';

const STEPS = [
  {
    number: 1,
    title: 'update FrictionMaxxing',
    body: 'lockout mode requires a newer version of the app that includes native iOS Screen Time integration. update when prompted.',
  },
  {
    number: 2,
    title: 'grant Screen Time access',
    body: 'on first launch after updating, FrictionMaxxing will ask for Screen Time permission. tap Allow. this is what gives the app the ability to hard-block other apps.',
    note: 'this is different from the Shortcuts setup — it\'s a one-time system permission, not a per-app automation.',
  },
  {
    number: 3,
    title: 'set your iOS Screen Time limits (optional)',
    body: 'if you\'re using "after screen time limit" mode, go to iOS Settings → Screen Time → App Limits and set daily limits for the apps you want to gate.\n\nif you\'re using "always on" mode, skip this step — friction fires every time regardless.',
  },
  {
    number: 4,
    title: 'that\'s it',
    body: 'FrictionMaxxing handles the rest. when lockout triggers, the app is hard-blocked — beat the game, then walk away or open for your chosen window (1–5 min in Settings). after the window closes, it re-locks and the whole thing starts over next time you open it.',
  },
];

export default function LockoutTutorialScreen({ navigation }) {
  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <AppText variant="caption" style={styles.backText}>‹ settings</AppText>
        </TouchableOpacity>

        <View style={styles.header}>
          <AppText variant="xxl">lockout setup</AppText>
          <AppText variant="base" style={styles.subtitle}>
            lockout mode hard-blocks apps at the OS level until you beat the game.
            unlike friction mode, there's no "open anyway" — you're locked out.
          </AppText>
        </View>

        {/* Coming soon banner */}
        <View style={styles.banner}>
          <AppText style={styles.bannerEmoji}>🔧</AppText>
          <View style={styles.bannerText}>
            <AppText variant="base" style={styles.bannerTitle}>requires app update</AppText>
            <AppText variant="caption" style={styles.bannerSub}>
              lockout mode needs a future update with native iOS integration.
              these steps will be actionable when that update ships.
            </AppText>
          </View>
        </View>

        {STEPS.map((step) => (
          <View key={step.number} style={styles.card}>
            <View style={styles.stepHeader}>
              <View style={styles.badge}>
                <AppText variant="base" style={styles.badgeText}>{step.number}</AppText>
              </View>
              <AppText variant="subheading" style={styles.stepTitle}>{step.title}</AppText>
            </View>
            <AppText variant="base" style={styles.stepBody}>{step.body}</AppText>
            {step.note && (
              <View style={styles.noteBox}>
                <AppText variant="caption" style={styles.noteText}>{step.note}</AppText>
              </View>
            )}
          </View>
        ))}

        {/* How it differs from friction */}
        <View style={styles.compareSection}>
          <AppText variant="subheading" style={styles.compareTitle}>friction vs lockout</AppText>

          <View style={styles.compareRow}>
            <View style={styles.compareCol}>
              <AppText variant="base" style={styles.compareHeader}>🔔  friction</AppText>
              <AppText variant="caption" style={styles.compareBody}>game fires every open</AppText>
              <AppText variant="caption" style={styles.compareBody}>beat it → walk away or open (no re-lock)</AppText>
              <AppText variant="caption" style={styles.compareBody}>set up via iOS Shortcuts</AppText>
              <AppText variant="caption" style={styles.compareBody}>works now</AppText>
            </View>
            <View style={styles.compareDivider} />
            <View style={styles.compareCol}>
              <AppText variant="base" style={styles.compareHeader}>🔒  lockout</AppText>
              <AppText variant="caption" style={styles.compareBody}>app is hard-blocked at OS level</AppText>
              <AppText variant="caption" style={styles.compareBody}>beat it → walk away or get N min, then re-locks</AppText>
              <AppText variant="caption" style={styles.compareBody}>set up via Screen Time permission</AppText>
              <AppText variant="caption" style={[styles.compareBody, styles.compareComingSoon]}>coming soon</AppText>
            </View>
          </View>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll:   { paddingBottom: spacing.xxl, gap: spacing.lg },
  backRow:  { marginTop: spacing.md },
  backText: { color: colors.primary },
  header:   { gap: spacing.xs },
  subtitle: { color: colors.textSub, lineHeight: 22 },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  bannerEmoji: { fontSize: 24, lineHeight: 28 },
  bannerText:  { flex: 1, gap: 4 },
  bannerTitle: { color: colors.primary },
  bannerSub:   { color: colors.primary, opacity: 0.7, lineHeight: 18 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepHeader:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText:  { color: colors.primary, fontWeight: '700' },
  stepTitle:  { flex: 1 },
  stepBody:   { color: colors.textSub, lineHeight: 22 },
  noteBox: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteText: { color: colors.textSub, lineHeight: 18 },

  compareSection: { gap: spacing.md },
  compareTitle:   { color: colors.text },
  compareRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  compareCol:     { flex: 1, padding: spacing.md, gap: spacing.xs },
  compareDivider: { width: 1, backgroundColor: colors.border },
  compareHeader:  { marginBottom: spacing.xs },
  compareBody:    { color: colors.textSub, lineHeight: 18 },
  compareComingSoon: { color: colors.primary, fontStyle: 'italic' },
});
