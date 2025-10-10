import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useBooking } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';

interface EmergencyButtonsProps {
  onServiceSelect: (service: 'emergency' | 'accident') => void;
  disabled?: boolean;
}

const EmergencyButtons: React.FC<EmergencyButtonsProps> = ({ onServiceSelect, disabled }) => {
  const { colors } = useTheme();
  const { hasOngoingBooking } = useBooking();
  const { t } = useLanguage();
  
  const isDisabled = disabled || hasOngoingBooking;

  return (
    <View style={styles.emergencyButtons}>
      <TouchableOpacity 
        style={[styles.emergencyBtn, { backgroundColor: isDisabled ? colors.textSecondary : colors.primary }]}
        onPress={() => !isDisabled && onServiceSelect('emergency')}
        disabled={isDisabled}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="warning" size={16} color="#fff" style={{ opacity: isDisabled ? 0.6 : 1 }} />
          <Text style={[styles.emergencyBtnText, { opacity: isDisabled ? 0.6 : 1 }]}>{t('emergency')}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.emergencyBtn, { backgroundColor: isDisabled ? colors.textSecondary : colors.primary }]}
        onPress={() => !isDisabled && onServiceSelect('accident')}
        disabled={isDisabled}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialIcons name="local-hospital" size={16} color="#fff" style={{ opacity: isDisabled ? 0.6 : 1 }} />
          <Text style={[styles.emergencyBtnText, { opacity: isDisabled ? 0.6 : 1 }]}>{t('accident')}</Text>
        </View>
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