import React, { useState, useEffect, useRef } from 'react';
import { 
  View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, Platform, Animated 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { ExpoWebSpeechRecognition } from 'expo-speech-recognition';

interface HospitalSearchProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  searchRadius: number;
  onRadiusPress: () => void;
  showRadiusControl: boolean;
  onRadiusChange: (radius: number) => void;
  isSearching?: boolean;
}

const HospitalSearch: React.FC<HospitalSearchProps> = ({
  searchText,
  onSearchChange,
  searchRadius,
  onRadiusPress,
  showRadiusControl,
  onRadiusChange,
  isSearching = false,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSearching) {
      const animate = () => {
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          })
        ]).start(() => {
          if (isSearching) animate();
        });
      };
      animate();
    } else {
      progressAnim.setValue(0);
    }
  }, [isSearching]);

  const handleMicPress = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web: Use native Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          const recognition = new SpeechRecognition();
          
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-US';
          
          recognition.onstart = () => setIsListening(true);
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            onSearchChange(transcript);
            setIsListening(false);
          };
          recognition.onerror = () => {
            setIsListening(false);
            Alert.alert('Error', 'Voice recognition failed');
          };
          recognition.onend = () => setIsListening(false);
          
          recognition.start();
        } else {
          Alert.alert('Not Supported', 'Voice search not supported in this browser');
        }
      } else {
        // Mobile: Use ExpoWebSpeechRecognition
        const recognition = new ExpoWebSpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          if (event.results && event.results.length > 0) {
            const transcript = event.results[0][0].transcript;
            onSearchChange(transcript);
          }
          setIsListening(false);
        };
        recognition.onerror = () => {
          setIsListening(false);
          Alert.alert('Error', 'Voice recognition failed');
        };
        recognition.onend = () => setIsListening(false);
        
        if (isListening) {
          recognition.stop();
        } else {
          recognition.start();
        }
      }
    } catch (error) {
      console.error('Error with voice search:', error);
      Alert.alert('Error', 'Voice search failed');
      setIsListening(false);
    }
  };

  return (
    <View>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, paddingRight: searchText ? 88 : 48 }]}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={onSearchChange}
          />
          {searchText ? (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => onSearchChange('')}
            >
              <MaterialIcons 
                name="close" 
                size={18} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity 
            style={styles.micButton}
            onPress={handleMicPress}
          >
            <MaterialIcons 
              name={isListening ? "stop" : "mic"} 
              size={18} 
              color={isListening ? '#ff0000' : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.radiusSelector, { backgroundColor: colors.surface }]}
          onPress={onRadiusPress}
        >
          <Text style={[styles.radiusText, { color: colors.text }]}>{searchRadius}km</Text>
          <Text style={[styles.radiusArrow, { color: colors.textSecondary }]}>▼</Text>
        </TouchableOpacity>
      </View>
      
      {isSearching && (
        <View style={styles.loadingContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: colors.primary,
                  transform: [{
                    translateX: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 100]
                    })
                  }]
                }
              ]} 
            />
          </View>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('searchingHospitals')}</Text>
        </View>
      )}
      
      {showRadiusControl && (
        <View style={styles.radiusOptions}>
          {[2, 5, 10, 15, 20].map((radius) => (
            <TouchableOpacity
              key={radius}
              style={[
                styles.radiusOption, 
                { backgroundColor: searchRadius === radius ? colors.primary : colors.surface }
              ]}
              onPress={() => onRadiusChange(radius)}
            >
              <Text style={[
                styles.radiusOptionText, 
                { color: searchRadius === radius ? (isDarkMode ? colors.background : '#fff') : colors.textSecondary }
              ]}>
                {radius}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 52,
    padding: 8,
  },
  micButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  radiusSelector: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  radiusArrow: {
    fontSize: 10,
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  radiusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  radiusOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    width: '50%',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default HospitalSearch;