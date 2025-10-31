import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, useWindowDimensions } from 'react-native';
import { useState } from 'react';
import { useFonts, VT323_400Regular } from '@expo-google-fonts/vt323';

export default function App() {
  const [fontsLoaded] = useFonts({
    VT323: VT323_400Regular,
  });

  const { width, height } = useWindowDimensions();
  const [numberValue, setNumberValue] = useState(100);
  const [showInputPanel, setShowInputPanel] = useState(false);
  const [inputText, setInputText] = useState('');

  if (!fontsLoaded) {
    return null;
  }

  // Calculate text position
  // Upper area flex: 1, Lower area flex: 0.95, Total flex: 1.95
  const totalFlex = 1 + 0.95;
  const upperAreaHeight = height * (1 / totalFlex);
  const lowerAreaHeight = height * (0.95 / totalFlex);
  const textTop = upperAreaHeight + (lowerAreaHeight * 0.25);
  const textLeft = width / 2;

  const handleTextPress = () => {
    setInputText(numberValue.toString());
    setShowInputPanel(true);
  };

  const handleInputSubmit = () => {
    const parsedValue = parseInt(inputText, 10);
    
    if (isNaN(parsedValue)) {
      setShowInputPanel(false);
      return;
    }

    // Clamp to 1-300 range
    let clampedValue = parsedValue;
    if (clampedValue < 1) {
      clampedValue = 1;
    } else if (clampedValue > 300) {
      clampedValue = 300;
    }

    setNumberValue(clampedValue);
    setShowInputPanel(false);
  };

  const handleInputChange = (text: string) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    setInputText(numericText);
  };

  return (
    <View style={styles.container}>
      <View style={styles.upperArea} />
      <View style={styles.lowerArea} />
      
      <TouchableOpacity 
        onPress={handleTextPress} 
        style={[
          styles.textContainer, 
          { 
            left: textLeft, 
            top: textTop,
            marginLeft: -50,
          }
        ]}
      >
        <Text style={styles.numberText}>{numberValue}</Text>
      </TouchableOpacity>

      <Modal
        visible={showInputPanel}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInputPanel(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInputPanel(false)}
        >
          <View style={styles.inputPanel}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={handleInputChange}
              keyboardType="numeric"
              autoFocus={true}
              onSubmitEditing={handleInputSubmit}
              returnKeyType="done"
              placeholder="Enter number (1-300)"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleInputSubmit}>
              <Text style={styles.submitButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    width: 100,
  },
  numberText: {
    fontFamily: 'VT323',
    color: '#FFFFFF',
    fontSize: 24,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    width: '100%',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'VT323',
  },
  submitButton: {
    backgroundColor: '#4A4A4A',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
