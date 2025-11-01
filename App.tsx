import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, useWindowDimensions, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useFonts, VT323_400Regular } from '@expo-google-fonts/vt323';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';

export default function App() {
  const [fontsLoaded] = useFonts({
    VT323: VT323_400Regular,
  });

  const { width, height } = useWindowDimensions();
  const [numberValue, setNumberValue] = useState(100);
  const [showInputPanel, setShowInputPanel] = useState(false);
  const [inputText, setInputText] = useState('');

  // Metronome state and refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null); // For mobile platforms
  const schedulerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const currentBPMRef = useRef<number>(100);

  // Initialize audio context and load audio file
  useEffect(() => {
    const initAudio = async () => {
      if (Platform.OS === 'web') {
        // Web Audio API for web platform
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const audioContext = new AudioContext();
          audioContextRef.current = audioContext;

          console.log('Audio context created, state:', audioContext.state);

          // Load audio file using Asset for proper path resolution
          const asset = Asset.fromModule(require('./assets/water-drip.wav'));
          await asset.downloadAsync();
          
          console.log('Asset downloaded, URI:', asset.localUri || asset.uri);
          
          const response = await fetch(asset.localUri || asset.uri);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          audioBufferRef.current = audioBuffer;
          
          console.log('Audio buffer loaded successfully, duration:', audioBuffer.duration);
        } catch (error) {
          console.error('Failed to initialize audio:', error);
        }
      } else {
        // expo-av for mobile platforms (iOS/Android)
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
          });

          // Load sound using expo-av
          const { sound } = await Audio.Sound.createAsync(
            require('./assets/water-drip.wav'),
            { shouldPlay: false, isLooping: false }
          );
          
          soundRef.current = sound;
          console.log('Sound loaded successfully for mobile platform');
        } catch (error) {
          console.error('Failed to initialize audio on mobile:', error);
        }
      }
    };

    initAudio();

    return () => {
      // Cleanup
      if (schedulerIntervalRef.current) {
        clearInterval(schedulerIntervalRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Schedule next note (web platform)
  const scheduleNoteWeb = (beatNumber: number, time: number) => {
    if (!audioContextRef.current || !audioBufferRef.current) {
      console.warn('Cannot schedule note: audio context or buffer missing');
      return;
    }

    try {
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();
      
      source.buffer = audioBufferRef.current;
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      gainNode.gain.value = 0.5;
      source.start(time);
    } catch (error) {
      console.error('Error scheduling note:', error);
    }
  };

  // Play note (mobile platform)
  const playNoteMobile = async () => {
    if (!soundRef.current) {
      console.warn('Cannot play note: sound not loaded');
      return;
    }

    try {
      await soundRef.current.replayAsync({ positionMillis: 0 });
    } catch (error) {
      console.error('Error playing note:', error);
    }
  };

  // Lookahead scheduler - runs every 25ms, schedules ~100ms ahead (web only)
  const schedulerWeb = () => {
    if (!isPlayingRef.current || !audioContextRef.current) return;

    const currentTime = audioContextRef.current.currentTime;
    const scheduleAheadTime = 0.25; // Schedule 250ms ahead

    // Calculate beat interval from BPM
    const beatInterval = 60.0 / currentBPMRef.current;

    // Schedule notes in the lookahead window
    while (nextNoteTimeRef.current < currentTime + scheduleAheadTime) {
      scheduleNoteWeb(0, nextNoteTimeRef.current);
      nextNoteTimeRef.current += beatInterval;
    }
  };

  // Timer-based scheduler for mobile platforms
  const schedulerMobile = () => {
    if (!isPlayingRef.current) return;
    playNoteMobile();
  };

  // Start metronome
  const startMetronome = async () => {
    if (Platform.OS === 'web') {
      if (!audioContextRef.current) {
        console.error('Audio context not initialized');
        return;
      }

      if (!audioBufferRef.current) {
        console.error('Audio buffer not loaded');
        return;
      }

      try {
        // Resume audio context if suspended (required for user interaction)
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('Audio context resumed, state:', audioContextRef.current.state);
        }
        
        isPlayingRef.current = true;
        const currentTime = audioContextRef.current.currentTime;
        nextNoteTimeRef.current = currentTime + 0.01; // Start in 10ms
        
        console.log('Starting metronome at BPM:', currentBPMRef.current);
        
        // Start scheduler - runs every 25ms
        schedulerIntervalRef.current = setInterval(schedulerWeb, 25);
      } catch (error) {
        console.error('Error starting metronome:', error);
      }
    } else {
      // Mobile platform
      if (!soundRef.current) {
        console.error('Sound not loaded');
        return;
      }

      try {
        isPlayingRef.current = true;
        
        // Calculate beat interval in milliseconds
        const beatIntervalMs = (60.0 / currentBPMRef.current) * 1000;
        
        console.log('Starting metronome at BPM:', currentBPMRef.current, 'interval:', beatIntervalMs, 'ms');
        
        // Play first beat immediately
        await playNoteMobile();
        
        // Start scheduler - plays at calculated intervals
        schedulerIntervalRef.current = setInterval(schedulerMobile, beatIntervalMs);
      } catch (error) {
        console.error('Error starting metronome on mobile:', error);
      }
    }
  };

  // Stop metronome
  const stopMetronome = () => {
    isPlayingRef.current = false;
    if (schedulerIntervalRef.current) {
      clearInterval(schedulerIntervalRef.current);
      schedulerIntervalRef.current = null;
    }
  };

  // Update BPM effect - restart metronome if playing
  useEffect(() => {
    currentBPMRef.current = numberValue;
    
    if (isPlayingRef.current) {
      if (Platform.OS === 'web' && audioContextRef.current && audioBufferRef.current) {
        stopMetronome();
        // Small delay to ensure clean restart
        setTimeout(async () => {
          if (audioContextRef.current && audioBufferRef.current) {
            nextNoteTimeRef.current = 0; // Reset timing
            await startMetronome();
          }
        }, 10);
      } else if (Platform.OS !== 'web' && soundRef.current) {
        stopMetronome();
        // Small delay to ensure clean restart
        setTimeout(async () => {
          if (soundRef.current) {
            await startMetronome();
          }
        }, 10);
      }
    }
  }, [numberValue]);

  if (!fontsLoaded) {
    return null;
  }

  // Handle click/tap on background areas (not text)
  const handleBackgroundPress = async () => {
    if (showInputPanel) return; // Don't toggle if input panel is open
    
    if (isPlayingRef.current) {
      console.log('Stopping metronome');
      stopMetronome();
    } else {
      console.log('Starting metronome (user interaction)');
      await startMetronome();
    }
  };

  // Calculate text position
  // Upper area flex: 1, Lower area flex: 0.95, Total flex: 1.95
  const totalFlex = 1 + 0.95;
  const upperAreaHeight = height * (1 / totalFlex);
  const lowerAreaHeight = height * (0.95 / totalFlex);
  const textTop = upperAreaHeight + (lowerAreaHeight * 0.25);
  const textLeft = width / 2;

  const handleTextPress = (e: any) => {
    e.stopPropagation(); // Prevent background click handler from firing
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
      <TouchableOpacity 
        activeOpacity={1} 
        style={styles.upperArea} 
        onPress={handleBackgroundPress}
      />
      <TouchableOpacity 
        activeOpacity={1} 
        style={styles.lowerArea} 
        onPress={handleBackgroundPress}
      />
      
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
