import { View, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { colors, spacing } from '../../theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <AppText variant="xxl" style={styles.emoji}>🧱</AppText>
        <AppText variant="xxl" style={styles.title}>Friction Maxxing</AppText>
        <AppText variant="caption" style={styles.sub}>
          yes, you need a maze to stop opening instagram
        </AppText>
      </View>

      <View style={styles.footer}>
        <AppText variant="caption" style={styles.fine}>
          works on iOS 16+. free to download.
        </AppText>
        <Button label="let's go" onPress={() => navigation.navigate('HowItWorks')} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    color: colors.text,
  },
  sub: {
    lineHeight: 20,
  },
  footer: {
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  fine: {
    textAlign: 'center',
    color: colors.textDisabled,
  },
});
