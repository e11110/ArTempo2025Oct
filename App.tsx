import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.upperArea} />
      <View style={styles.lowerArea} />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  upperArea: {
    flex: 1,
    backgroundColor: '#4A4A4A',
  },
  lowerArea: {
    flex: 0.95,
    backgroundColor: '#605A5A',
  },
});
