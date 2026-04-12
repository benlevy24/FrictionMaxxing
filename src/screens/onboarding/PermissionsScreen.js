import { View, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';

const PERMISSION_POINTS = [
  {
    emoji: '🔒',
    text: 'Screen Time lets us intercept blocked apps before they open.',
  },
  {
    emoji: '👀',
    text: 'We can see which apps you open — but nothing inside them.',
  },
  {
    emoji: '🚫',
    text: 'We never collect or share your data. everything stays on your phone.',
  },
];

export default function PermissionsScreen({ navigation }) {
  function handleGrant() {
    // TODO (task #19 on Mac): trigger real FamilyControls permission request
    // For now, navigate straight to main app
    navigation.getParent()?.navigate('Main');
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <AppText variant="xxl" style={styles.title}>one permission</AppText>
        <AppText variant="caption">
          we need Screen Time access to actually block apps. here's exactly what that means.
        </AppText>
      </View>

      <View style={styles.points}>
        {PERMISSION_POINTS.map((point, i) => (
          <View key={i} style={styles.point}>
            <AppText variant="lg">{point.emoji}</AppText>
            <AppText variant="body" style={styles.pointText}>{point.text}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.notice}>
        <AppText variant="caption" style={styles.noticeText}>
          Apple will show a system prompt — tap "Allow" to continue. you can revoke this anytime in Settings → Screen Time.
        </AppText>
      </View>

      <View style={styles.footer}>
        <Button label="grant access" onPress={handleGrant} />
        <Button
          label="skip for now (app won't block anything)"
          variant="ghost"
          onPress={() => navigation.getParent()?.navigate('Main')}
          style={styles.skip}
        />
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
