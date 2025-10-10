import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Platform, Text, Animated, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ExpoWebSpeechRecognition } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import LocationService from '../../services/locationService';

interface VoiceAutomationProps {
  onBookingComplete: (bookingData: any) => void;
  hospitalData: any[];
  onEmergencySelect: (type: 'emergency' | 'accident') => void;
  onHospitalSelect: (hospital: any) => void;
}

type ConversationStep = 'start' | 'service_type' | 'emergency_details' | 'hospital_selection' | 'confirmation';

const VoiceAutomation: React.FC<VoiceAutomationProps> = ({ 
  onBookingComplete, 
  hospitalData, 
  onEmergencySelect, 
  onHospitalSelect 
}) => {
  const { colors } = useTheme();
  const { userName } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState<ConversationStep>('start');
  const [conversationData, setConversationData] = useState<any>({});
  const [showConversation, setShowConversation] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  
  // Wave animations
  const wave1 = useRef(new Animated.Value(0.3)).current;
  const wave2 = useRef(new Animated.Value(0.5)).current;
  const wave3 = useRef(new Animated.Value(0.7)).current;
  const wave4 = useRef(new Animated.Value(0.4)).current;
  const wave5 = useRef(new Animated.Value(0.6)).current;

  // Wave animation effect
  useEffect(() => {
    if (isSpeaking) {
      const animateWaves = () => {
        const createWaveAnimation = (wave: Animated.Value, duration: number) => {
          return Animated.loop(
            Animated.sequence([
              Animated.timing(wave, {
                toValue: 1,
                duration: duration,
                useNativeDriver: false,
              }),
              Animated.timing(wave, {
                toValue: 0.2,
                duration: duration,
                useNativeDriver: false,
              }),
            ])
          );
        };

        Animated.parallel([
          createWaveAnimation(wave1, 600),
          createWaveAnimation(wave2, 800),
          createWaveAnimation(wave3, 700),
          createWaveAnimation(wave4, 900),
          createWaveAnimation(wave5, 750),
        ]).start();
      };
      animateWaves();
    } else {
      wave1.setValue(0.3);
      wave2.setValue(0.5);
      wave3.setValue(0.7);
      wave4.setValue(0.4);
      wave5.setValue(0.6);
    }
  }, [isSpeaking]);

  const speak = (text: string) => {
    setCurrentMessage(text);
    setIsSpeaking(true);
    
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => {
        setIsSpeaking(false);
        setTimeout(() => startListening(), 500);
      };
      speechSynthesis.speak(utterance);
    } else {
      Speech.speak(text, {
        rate: 0.9,
        pitch: 1,
        onDone: () => {
          setIsSpeaking(false);
          setTimeout(() => startListening(), 500);
        },
      });
    }
  };

  const processVoiceResponse = async (text: string) => {
    setIsProcessing(true);
    const lowerText = text.toLowerCase();

    switch (currentStep) {
      case 'start':
        speak('What type of service do you need? Say Emergency for medical emergency or Accident for accident response.');
        setCurrentStep('service_type');
        break;

      case 'service_type':
        if (lowerText.includes('emergency') || lowerText.includes('medical')) {
          setConversationData({ ...conversationData, type: 'emergency' });
          speak('What is the medical emergency? Describe the condition.');
          setCurrentStep('emergency_details');
        } else if (lowerText.includes('accident') || lowerText.includes('crash')) {
          setConversationData({ ...conversationData, type: 'accident' });
          speak('What type of accident occurred? Describe the situation.');
          setCurrentStep('emergency_details');
        } else {
          speak('Please say Emergency or Accident.');
        }
        break;

      case 'emergency_details':
        const emergencyType = detectEmergencyType(lowerText);
        setConversationData({ ...conversationData, details: emergencyType });
        
        if (hospitalData.length > 0) {
          const topHospitals = hospitalData.slice(0, 3);
          const hospitalNames = topHospitals.map(h => h.name).join(', ');
          speak(`I found nearby hospitals: ${hospitalNames}. Which hospital would you prefer? Say the hospital name or say nearest for the closest one.`);
          setCurrentStep('hospital_selection');
        } else {
          speak('No hospitals found. Should I book the nearest available hospital?');
          setCurrentStep('confirmation');
        }
        break;

      case 'hospital_selection':
        let selectedHospital = null;
        
        if (lowerText.includes('nearest') || lowerText.includes('closest')) {
          selectedHospital = hospitalData[0];
        } else if (lowerText.includes('choose') || lowerText.includes('select') || lowerText.includes('list')) {
          setConversationData({ ...conversationData, showHospitalList: true });
          return; // Don't proceed, show hospital list
        } else {
          selectedHospital = hospitalData.find(h => 
            lowerText.includes(h.name.toLowerCase().split(' ')[0])
          ) || hospitalData[0];
        }
        
        setConversationData({ ...conversationData, hospital: selectedHospital });
        speak(`Booking ambulance to ${selectedHospital.name}. Should I confirm this booking? Say yes to confirm or no to cancel.`);
        setCurrentStep('confirmation');
        break;

      case 'confirmation':
        if (lowerText.includes('yes') || lowerText.includes('confirm') || lowerText.includes('book')) {
          await completeBooking();
        } else {
          speak('Booking cancelled. Tap the voice button to start over.');
          resetConversation();
        }
        break;
    }
    
    setIsProcessing(false);
  };

  const detectEmergencyType = (text: string) => {
    const emergencyKeywords = {
      'chest pain|heart attack|cardiac': { type: 'Cardiac Emergency', severity: 'Critical' },
      'accident|crash|collision': { type: 'Accident', severity: 'High' },
      'breathing|asthma|respiratory': { type: 'Respiratory Emergency', severity: 'High' },
      'bleeding|cut|wound': { type: 'Trauma', severity: 'Medium' },
      'unconscious|fainted|collapsed': { type: 'Medical Emergency', severity: 'Critical' },
      'burn|fire|scalding': { type: 'Burn Injury', severity: 'High' },
      'stroke|paralysis|numbness': { type: 'Stroke', severity: 'Critical' },
      'pregnancy|labor|delivery': { type: 'Maternity Emergency', severity: 'High' }
    };

    for (const [keywords, emergency] of Object.entries(emergencyKeywords)) {
      const regex = new RegExp(keywords, 'i');
      if (regex.test(text)) {
        return emergency;
      }
    }
    return { type: 'General Emergency', severity: 'Medium' };
  };

  const completeBooking = async () => {
    const location = await LocationService.getCurrentLocation();
    const userLocation = location ? {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : { latitude: 22.4675, longitude: 88.3732 };

    const bookingData = {
      hospital_id: conversationData.hospital?.id || 1,
      pickup_location: 'Current Location (Voice Assistant)',
      pickup_latitude: userLocation.latitude,
      pickup_longitude: userLocation.longitude,
      destination: conversationData.hospital?.name || 'Nearest Hospital',
      booking_type: conversationData.type === 'emergency' ? 'Emergency' : 'Accident',
      emergency_type: conversationData.details?.type || 'General Emergency',
      severity: conversationData.details?.severity || 'Medium',
      patient_name: userName || 'Voice User',
      patient_phone: '+91-9876543210'
    };

    speak('Ambulance booked successfully! Redirecting to tracking.');
    setTimeout(() => {
      onBookingComplete(bookingData);
      resetConversation();
    }, 2000);
  };

  const startListening = () => {
    if (isSpeaking || isProcessing) return;
    
    try {
      if (Platform.OS === 'web') {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          const newRecognition = new SpeechRecognition();
          
          newRecognition.continuous = false;
          newRecognition.interimResults = false;
          newRecognition.lang = 'en-US';
          
          newRecognition.onstart = () => setIsListening(true);
          newRecognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            processVoiceResponse(transcript);
            setIsListening(false);
          };
          newRecognition.onerror = () => setIsListening(false);
          newRecognition.onend = () => setIsListening(false);
          
          setRecognition(newRecognition);
          newRecognition.start();
        }
      } else {
        const newRecognition = new ExpoWebSpeechRecognition();
        
        newRecognition.lang = 'en-US';
        newRecognition.continuous = false;
        newRecognition.interimResults = false;
        
        newRecognition.onstart = () => setIsListening(true);
        newRecognition.onresult = (event: any) => {
          if (event.results && event.results.length > 0) {
            const transcript = event.results[0][0].transcript;
            processVoiceResponse(transcript);
          }
          setIsListening(false);
        };
        newRecognition.onerror = () => setIsListening(false);
        newRecognition.onend = () => setIsListening(false);
        
        setRecognition(newRecognition);
        newRecognition.start();
      }
    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const resetConversation = () => {
    if (recognition) recognition.stop();
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
    } else {
      Speech.stop();
    }
    setCurrentStep('start');
    setConversationData({});
    setShowConversation(false);
    setIsSpeaking(false);
    setIsListening(false);
    setCurrentMessage('');
  };

  const selectHospital = (hospital: any) => {
    setConversationData({ ...conversationData, hospital, showHospitalList: false });
    speak(`You selected ${hospital.name}. Should I confirm this booking? Say yes to confirm or no to cancel.`);
    setCurrentStep('confirmation');
  };

  const handleVoicePress = async () => {
    if (currentStep === 'start') {
      setShowConversation(true);
      speak('Hello! I\'m your voice assistant. I can help you book an ambulance.');
      setTimeout(() => processVoiceResponse('start'), 2000);
      return;
    }

    if (isListening) {
      stopListening();
    } else if (!isSpeaking) {
      startListening();
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={[
          styles.floatingButton, 
          { 
            backgroundColor: isListening ? '#ff0000' : isProcessing ? '#ff6600' : colors.primary,
            transform: [{ scale: isListening ? 1.1 : 1 }]
          }
        ]}
        onPress={handleVoicePress}
        disabled={isProcessing}
      >
        <MaterialIcons 
          name={isListening ? "stop" : isProcessing ? "hourglass-empty" : "mic"} 
          size={28} 
          color="#fff" 
        />
      </TouchableOpacity>
      
      {showConversation && (
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.aiContainer, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <MaterialIcons name="smart-toy" size={24} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>AI Voice Assistant</Text>
              <TouchableOpacity onPress={resetConversation}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {conversationData.showHospitalList ? (
              <View style={styles.hospitalListContainer}>
                <Text style={[styles.hospitalListTitle, { color: colors.text }]}>Select Hospital:</Text>
                <ScrollView style={styles.hospitalScroll}>
                  {hospitalData.slice(0, 5).map((hospital, index) => (
                    <TouchableOpacity 
                      key={hospital.id}
                      style={[styles.hospitalItem, { backgroundColor: colors.surface }]}
                      onPress={() => selectHospital(hospital)}
                    >
                      <Text style={[styles.hospitalName, { color: colors.text }]}>{hospital.name}</Text>
                      <Text style={[styles.hospitalDistance, { color: colors.textSecondary }]}>{hospital.distance} km</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <>
                <View style={styles.waveContainer}>
                  {isSpeaking ? (
                    <View style={styles.waves}>
                      <Animated.View style={[styles.wave, { height: wave1.interpolate({ inputRange: [0, 1], outputRange: [20, 60] }) }]} />
                      <Animated.View style={[styles.wave, { height: wave2.interpolate({ inputRange: [0, 1], outputRange: [20, 80] }) }]} />
                      <Animated.View style={[styles.wave, { height: wave3.interpolate({ inputRange: [0, 1], outputRange: [20, 70] }) }]} />
                      <Animated.View style={[styles.wave, { height: wave4.interpolate({ inputRange: [0, 1], outputRange: [20, 90] }) }]} />
                      <Animated.View style={[styles.wave, { height: wave5.interpolate({ inputRange: [0, 1], outputRange: [20, 65] }) }]} />
                    </View>
                  ) : isListening ? (
                    <View style={styles.listeningIndicator}>
                      <MaterialIcons name="mic" size={40} color={colors.primary} />
                      <Text style={[styles.listeningText, { color: colors.text }]}>Listening...</Text>
                    </View>
                  ) : (
                    <View style={styles.waitingIndicator}>
                      <MaterialIcons name="smart-toy" size={40} color={colors.textSecondary} />
                      <Text style={[styles.waitingText, { color: colors.textSecondary }]}>Tap mic to respond</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.messageContainer}>
                  <Text style={[styles.aiMessage, { color: colors.text }]}>{currentMessage}</Text>
                </View>
                
                <View style={styles.controls}>
                  <TouchableOpacity 
                    style={[styles.micButton, { backgroundColor: isListening ? '#ff0000' : colors.primary }]}
                    onPress={handleVoicePress}
                    disabled={isSpeaking}
                  >
                    <MaterialIcons 
                      name={isListening ? "stop" : "mic"} 
                      size={24} 
                      color="#fff" 
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 250,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1002,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  aiContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  waveContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  waves: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wave: {
    width: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  listeningIndicator: {
    alignItems: 'center',
    gap: 12,
  },
  listeningText: {
    fontSize: 16,
    fontWeight: '500',
  },
  waitingIndicator: {
    alignItems: 'center',
    gap: 12,
  },
  waitingText: {
    fontSize: 14,
  },
  messageContainer: {
    minHeight: 60,
    justifyContent: 'center',
    marginBottom: 24,
  },
  aiMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hospitalListContainer: {
    maxHeight: 300,
  },
  hospitalListTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  hospitalScroll: {
    maxHeight: 200,
  },
  hospitalItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  hospitalDistance: {
    fontSize: 14,
  },
});

export default VoiceAutomation;