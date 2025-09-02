import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface EmergencyButtonsProps {
  onServiceSelect: (service: 'emergency' | 'accident') => void;
}

const EmergencyButtons: React.FC<EmergencyButtonsProps> = ({ onServiceSelect }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.emergencyButtons}>
      <TouchableOpacity 
        style={[styles.emergencyBtn, { backgroundColor: colors.primary }]}
        onPress={() => onServiceSelect('emergency')}
      >
        <Text style={styles.emergencyBtnText}>🚨 Emergency</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.emergencyBtn, { backgroundColor: colors.primary }]}
        onPress={() => onServiceSelect('accident')}
      >
        <Text style={styles.emergencyBtnText}>🚑 Accident</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  emergencyButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  emergencyBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emergencyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default EmergencyButtons;