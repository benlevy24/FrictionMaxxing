import { TouchableOpacity, StyleSheet } from 'react-native';
import AppText from './AppText';
import { colors, spacing, radius } from '../theme';

// variant: 'primary' | 'secondary' | 'ghost'
export default function Button({ label, onPress, variant = 'primary', disabled, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
    >
      <AppText variant="base" style={styles[`${variant}Text`]}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },

  primary: { backgroundColor: colors.primary },
  primaryText: { color: '#fff' },

  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text },

  ghost: { backgroundColor: 'transparent' },
  ghostText: { color: colors.primary },

  disabled: { opacity: 0.4 },
});
