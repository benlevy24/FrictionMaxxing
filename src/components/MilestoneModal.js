import { View, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import AppText from './AppText';
import Button from './Button';
import { colors, spacing, radius } from '../theme';

export default function MilestoneModal({ visible, message, onDismiss }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <View style={styles.sheet}>
          <AppText style={styles.trophy}>🏆</AppText>
          <AppText variant="subheading" style={styles.title}>milestone unlocked</AppText>
          <AppText variant="body" style={styles.message}>{message}</AppText>
          <Button label="nice" onPress={onDismiss} style={styles.btn} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  trophy: {
    fontSize: 48,
  },
  title: {
    color: colors.primary,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    color: colors.textSub,
  },
  btn: {
    width: '100%',
    marginTop: spacing.sm,
  },
});
