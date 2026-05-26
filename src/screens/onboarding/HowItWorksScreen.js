import { View, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { colors, spacing } from '../../theme';

const STEPS = [
  {
    emoji: '📱',
    title: 'open a gated app',
    body: 'set up a Shortcuts automation for any app you want to slow down. after that, every time you open it, iOS redirects you here automatically. no manual list — apps show up as you use them.',
  },
  {
    emoji: '⏳',
    title: 'a moment to reconsider',
    body: 'before the game even starts, you see how many times you\'ve tried to open this app in the last 24 hours and when your last attempt was. sometimes that\'s enough. you can walk away right here — no game required.',
  },
  {
    emoji: '🎮',
    title: 'beat a game',
    body: 'if you\'re still here, you get a random mini-game. tic-tac-toe, a maze, hangperson, math problems — 10 games in rotation. some are designed to be frustrating on purpose.',
  },
  {
    emoji: '🤔',
    title: 'your call',
    body: 'beat the game and you still get to choose: walk away (the real win) or open the app anyway. no judgment either way. well. a little judgment.',
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
        <Button label="got it, let's go" onPress={() => navigation.navigate('Permissions')} />
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
