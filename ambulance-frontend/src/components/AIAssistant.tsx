import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { ExpoWebSpeechRecognition } from 'expo-speech-recognition';
import LocationService from '../../services/locationService';

interface AIAssistantProps {
  visible: boolean;
  onClose: () => void;
  onBookingComplete: (bookingData: any) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ visible, onClose, onBookingComplete }) => {
  const { colors } = useTheme();
  const { t, currentLanguage } = useLanguage();
  const { userName } = useAuth();
  const [messages, setMessages] = useState([
    { type: 'ai', text: 'Hi! I can help you book an ambulance. Tell me what happened or describe your emergency.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userLocation, setUserLocation] = useState({ latitude: 22.4675, longitude: 88.3732 });
  const scrollRef = useRef<ScrollView>(null);

  // Get user location when component mounts
  React.useEffect(() => {
    const getCurrentLocation = async () => {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    };
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  const processEmergencyText = async (text: string) => {
    setIsProcessing(true);
    
    // Simple AI logic to extract emergency info
    const emergencyKeywords = {
      'chest pain|heart attack|cardiac': { type: 'Cardiac Emergency', severity: 'Critical', hospital: 'cardiac' },
      'accident|crash|collision': { type: 'Accident', severity: 'High', hospital: 'trauma' },
      'breathing|asthma|respiratory': { type: 'Respiratory Emergency', severity: 'High', hospital: 'general' },
      'bleeding|cut|wound': { type: 'Trauma', severity: 'Medium', hospital: 'trauma' },
      'unconscious|fainted|collapsed': { type: 'Medical Emergency', severity: 'Critical', hospital: 'general' },
      'burn|fire|scalding': { type: 'Burn Injury', severity: 'High', hospital: 'trauma' },
      'stroke|paralysis|numbness': { type: 'Stroke', severity: 'Critical', hospital: 'neuro' },
      'pregnancy|labor|delivery': { type: 'Maternity Emergency', severity: 'High', hospital: 'maternity' }
    };

    let detectedEmergency = { type: 'General Emergency', severity: 'Medium', hospital: 'general' };
    
    for (const [keywords, emergency] of Object.entries(emergencyKeywords)) {
      const regex = new RegExp(keywords, 'i');
      if (regex.test(text)) {
        detectedEmergency = emergency;
        break;
      }
    }

    // AI response
    const aiResponse = `I understand this is a ${detectedEmergency.type} with ${detectedEmergency.severity} severity. I'll book the nearest ${detectedEmergency.hospital} hospital for you. Confirming booking now...`;
    
    setMessages(prev => [...prev, { type: 'ai', text: aiResponse }]);
    
    setTimeout(() => {
      const bookingData = {
        hospital_id: 1,
        pickup_location: 'Current Location (AI Assisted)',
        pickup_latitude: userLocation.latitude,
        pickup_longitude: userLocation.longitude,
        destination: 'Nearest Hospital',
        booking_type: 'Emergency',
        emergency_type: detectedEmergency.type,
        severity: detectedEmergency.severity,
        patient_name: userName || 'AI User',
        patient_phone: '+91-9876543210'
      };
      
      setMessages(prev => [...prev, { type: 'ai', text: '✅ Ambulance booked successfully! Redirecting to tracking...' }]);
      
      setTimeout(() => {
        onBookingComplete(bookingData);
      }, 1500);
    }, 2000);
    
    setIsProcessing(false);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    setMessages(prev => [...prev, { type: 'user', text: inputText }]);
    await processEmergencyText(inputText);
    setInputText('');
  };

  const handleVoiceInput = async () => {
    try {
      const recognition = new ExpoWebSpeechRecognition();
      recognition.lang = currentLanguage === 'en' ? 'en-US' : 
                       currentLanguage === 'hi' ? 'hi-IN' :
                       currentLanguage === 'bn' ? 'bn-BD' : 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        if (event.results?.[0]?.[0]?.transcript) {
          const transcript = event.results[0][0].transcript;
          setMessages(prev => [...prev, { type: 'user', text: transcript }]);
          processEmergencyText(transcript);
        }
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      
      recognition.start();
    } catch (error) {
      console.error('Voice input error:', error);
      setIsListening(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <MaterialIcons name="smart-toy" size={24} color="#fff" />
        <Text style={styles.headerText}>AI Emergency Assistant</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        ref={scrollRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
      >
        {messages.map((message, index) => (
          <View key={index} style={[
            styles.messageRow,
            message.type === 'user' ? styles.userMessageRow : styles.aiMessageRow
          ]}>
            <View style={[
              styles.messageBubble,
              message.type === 'user' 
                ? { backgroundColor: colors.primary } 
                : { backgroundColor: colors.surface }
            ]}>
              <Text style={[
                styles.messageText,
                { color: message.type === 'user' ? '#fff' : colors.text }
              ]}>
                {message.text}
              </Text>
            </View>
          </View>
        ))}
        
        {isProcessing && (
          <View style={styles.aiMessageRow}>
            <View style={[styles.messageBubble, { backgroundColor: colors.surface }]}>
              <Text style={[styles.messageText, { color: colors.text }]}>
                🤖 Analyzing emergency... Please wait
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          placeholder="Describe your emergency..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.voiceButton, { backgroundColor: isListening ? '#ff0000' : colors.primary }]}
          onPress={handleVoiceInput}
        >
          <MaterialIcons 
            name={isListening ? "stop" : "mic"} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={handleSendMessage}
        >
          <MaterialIcons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    gap: 12,
  },
  headerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageRow: {
    marginBottom: 12,
  },
  userMessageRow: {
    alignItems: 'flex-end',
  },
  aiMessageRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIAssistant;