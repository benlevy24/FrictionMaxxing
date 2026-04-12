import { Text, StyleSheet } from 'react-native';
import { typography } from '../theme';

// Wrapper around Text that applies Comic Sans and theme styles by default.
// Usage: <AppText variant="heading">Hello</AppText>
export default function AppText({ children, variant = 'body', style, ...props }) {
  return (
    <Text style={[typography[variant] ?? typography.body, style]} {...props}>
      {children}
    </Text>
  );
}
