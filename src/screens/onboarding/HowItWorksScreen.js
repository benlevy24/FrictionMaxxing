import { View, Text, StyleSheet } from 'react-native';

export default function HowItWorksScreen() {
  return (
    <View style={styles.container}>
      <Text>How It Works</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
