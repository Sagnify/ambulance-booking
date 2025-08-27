import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  selectedService: 'emergency' | 'accident' | 'hospital' | null;
  onSelectService: (service: 'emergency' | 'accident' | 'hospital') => void;
  onContinue?: () => void;
}

const BottomPanel: React.FC<Props> = ({ selectedService, onSelectService, onContinue }) => {
  return (
    <View style={styles.bottomPanel}>
      <View style={styles.handle} />

      <ScrollView style={styles.panelContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.panelTitle}>Book Ambulance</Text>

        {/* Emergency Option */}
        <TouchableOpacity
          style={[styles.serviceCard, selectedService === 'emergency' && styles.selectedServiceCard]}
          onPress={() => onSelectService('emergency')}
        >
          <View style={styles.serviceIcon}><Text style={styles.serviceEmoji}>🚨</Text></View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Emergency</Text>
            <Text style={styles.serviceDesc}>Immediate medical assistance</Text>
          </View>
          <Text style={styles.serviceArrow}>›</Text>
        </TouchableOpacity>

        {/* Accident Option */}
        <TouchableOpacity
          style={[styles.serviceCard, selectedService === 'accident' && styles.selectedServiceCard]}
          onPress={() => onSelectService('accident')}
        >
          <View style={styles.serviceIcon}><Text style={styles.serviceEmoji}>🚑</Text></View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Accident</Text>
            <Text style={styles.serviceDesc}>Road accident & trauma care</Text>
          </View>
          <Text style={styles.serviceArrow}>›</Text>
        </TouchableOpacity>

        {/* Hospital Selection Option */}
        <TouchableOpacity
          style={[styles.serviceCard, selectedService === 'hospital' && styles.selectedServiceCard]}
          onPress={() => onSelectService('hospital')}
        >
          <View style={styles.serviceIcon}><Text style={styles.serviceEmoji}>🏥</Text></View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Select Hospital</Text>
            <Text style={styles.serviceDesc}>Choose specific hospital</Text>
          </View>
          <Text style={styles.serviceArrow}>›</Text>
        </TouchableOpacity>

        {/* Additional content when service is selected */}
        {selectedService && (
          <View style={styles.selectedContent}>
            <Text style={styles.selectedTitle}>
              {selectedService === 'emergency' && 'Emergency Services'}
              {selectedService === 'accident' && 'Accident Response'}
              {selectedService === 'hospital' && 'Hospital Selection'}
            </Text>
            <Text style={styles.selectedDesc}>
              {selectedService === 'emergency' && 'Dispatching nearest ambulance with emergency medical team...'}
              {selectedService === 'accident' && 'Sending trauma-equipped ambulance with specialized care...'}
              {selectedService === 'hospital' && 'Choose your preferred hospital from the list below...'}
            </Text>

            <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomPanel: { flex: 1, backgroundColor: '#fff' },
  handle: { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginVertical: 8 },
  panelContent: { paddingHorizontal: 20 },
  panelTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#f2f2f2', marginBottom: 10 },
  selectedServiceCard: { backgroundColor: '#e0e0e0' },
  serviceIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  serviceEmoji: { fontSize: 24 },
  serviceInfo: { flex: 1 },
  serviceName: { fontWeight: '600', fontSize: 16 },
  serviceDesc: { fontSize: 12, color: '#555' },
  serviceArrow: { fontSize: 18, color: '#999' },
  selectedContent: { marginTop: 20 },
  selectedTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  selectedDesc: { fontSize: 14, color: '#555', marginBottom: 15 },
  continueButton: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  continueText: { color: '#fff', fontWeight: '600' },
});

export default BottomPanel;
