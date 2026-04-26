import { View, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';

const HOW_IT_WORKS = [
  {
    emoji: '📱',
    text: 'when you open Instagram (or any gated app), Shortcuts redirects you here automatically.',
  },
  {
    emoji: '🎮',
    text: 'you get a random annoying mini-game. beat it, then decide: open anyway or walk away.',
  },
  {
    emoji: '🔓',
    text: 'nothing is hard-blocked — it\'s friction, not a lock. the choice is always yours.',
  },
];

export default function PermissionsScreen({ navigation }) {
  function openSetupGuide() {
    navigation.getParent()?.reset({
      index: 1,
      routes: [{ name: 'Main' }, { name: 'Tutorial' }],
    });
  }

  function skipForNow() {
    navigation.getParent()?.navigate('Main');
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <AppText variant="xxl" style={styles.title}>last step: shortcuts</AppText>
        <AppText variant="caption">
          FrictionMaxxing works through iOS Shortcuts automations — one per app. here's what that means.
        </AppText>
      </View>

      <View style={styles.points}>
        {HOW_IT_WORKS.map((point, i) => (
          <View key={i} style={styles.point}>
            <AppText variant="lg">{point.emoji}</AppText>
            <AppText variant="body" style={styles.pointText}>{point.text}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.notice}>
        <AppText variant="caption" style={styles.noticeText}>
          takes about 2 minutes per app. you can always find it later under Settings → Setup Guide.
        </AppText>
      </View>

      <View style={styles.footer}>
        <Button label="open setup guide" onPress={openSetupGuide} />
        <Button label="skip for now" variant="ghost" onPress={skipForNow} style={styles.skip} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  points: {
    flex: 1,
    gap: spacing.lg,
  },
  point: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  pointText: {
    flex: 1,
    lineHeight: 22,
  },
  notice: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  noticeText: {
    lineHeight: 20,
  },
  footer: {
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  skip: {
    alignSelf: 'center',
  },
});
