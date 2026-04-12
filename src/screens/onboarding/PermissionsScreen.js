import { View, Text, StyleSheet } from 'react-native';

export default function PermissionsScreen() {
  return (
    <View style={styles.container}>
      <Text>Permissions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
