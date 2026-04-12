import { View, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { colors, spacing } from '../../theme';

const STEPS = [
  {
    emoji: '📱',
    title: 'pick your poison',
    body: 'choose which apps you want to make annoying to open. instagram, tiktok, doomscrolling — all of them.',
  },
  {
    emoji: '🎮',
    title: 'get a game',
    body: 'every time you try to open a blocked app, you get a random mini-game. and yes, some of them are designed to be frustrating.',
  },
  {
    emoji: '🏳️',
    title: 'beat it or give up',
    body: 'finish the game and you get in. or close the app and do something else. your call.',
  },
];

export default function HowItWorksScreen({ navigation }) {
  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <AppText variant="xxl" style={styles.title}>how it works</AppText>
        <AppText variant="caption">it's not complicated. it's just annoying. on purpose.</AppText>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepLeft}>
              <AppText variant="xl">{step.emoji}</AppText>
              {i < STEPS.length - 1 && <View style={styles.connector} />}
            </View>
            <View style={styles.stepContent}>
              <AppText variant="subheading" style={styles.stepTitle}>{step.title}</AppText>
              <AppText variant="caption" style={styles.stepBody}>{step.body}</AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Button label="got it, let's go" onPress={() => navigation.navigate('AppSelection')} />
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
  steps: {
    flex: 1,
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stepLeft: {
    alignItems: 'center',
    width: 40,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
    minHeight: spacing.xl,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  stepTitle: {
    color: colors.text,
  },
  stepBody: {
    lineHeight: 20,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
