import { View, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { spacing } from '../theme';

// Temporary stand-in used by all games until tasks #12–15 build the real ones.
// Props: { onComplete, gameLabel, gameEmoji }
export default function PlaceholderGame({ onComplete, gameLabel, gameEmoji }) {
  return (
    <View style={styles.container}>
      <AppText style={styles.emoji}>{gameEmoji ?? '🎮'}</AppText>
      <AppText variant="subheading">{gameLabel ?? 'game'}</AppText>
      <AppText variant="caption" style={styles.note}>
        (coming soon — tasks #12–15)
      </AppText>
      <Button label="(dev) complete" variant="ghost" onPress={onComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 48,
  },
  note: {
    opacity: 0.4,
  },
});
