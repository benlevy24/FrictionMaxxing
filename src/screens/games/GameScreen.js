import { View, Text, StyleSheet } from 'react-native';

// Full-screen modal shown when user tries to open a blocked app.
// Will randomly pick and render an enabled game from the game library.
export default function GameScreen() {
  return (
    <View style={styles.container}>
      <Text>Game (placeholder)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
