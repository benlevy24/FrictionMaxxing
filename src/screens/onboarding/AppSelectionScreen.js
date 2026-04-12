import { View, Text, StyleSheet } from 'react-native';

export default function AppSelectionScreen() {
  return (
    <View style={styles.container}>
      <Text>App Selection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
