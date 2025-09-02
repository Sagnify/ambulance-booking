import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface EmergencyFormProps {
  emergencyData: {
    condition: string;
    severity: string;
    instructions: string;
  };
  onDataChange: (data: any) => void;
  showConditionDropdown: boolean;
  onDropdownToggle: (show: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  panelHeight: Animated.Value;
  height: number;
}

const EmergencyForm: React.FC<EmergencyFormProps> = ({
  emergencyData,
  onDataChange,
  showConditionDropdown,
  onDropdownToggle,
  onSubmit,
  onCancel,
  panelHeight,
  height,
}) => {
  const { colors } = useTheme();

  const conditions = [
    'Heart Attack', 'Stroke', 'Breathing Problems', 'Chest Pain', 
    'Severe Injury', 'Unconscious', 'Severe Bleeding', 'Other'
  ];

  const handleDropdownToggle = () => {
    const newState = !showConditionDropdown;
    onDropdownToggle(newState);
    
    if (newState) {
      Animated.spring(panelHeight, {
        toValue: height * 0.95,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const handleConditionSelect = (condition: string) => {
    onDataChange({ ...emergencyData, condition });
    onDropdownToggle(false);
    
    Animated.spring(panelHeight, {
      toValue: height * 0.6,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <View>
      <View style={styles.emergencyHeader}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.emergencyTitle}>Emergency Details</Text>
      </View>
      
      <View style={styles.formContainer}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Severity Level *</Text>
        <View style={styles.severityButtons}>
          {['Critical', 'Urgent', 'Moderate'].map((severity) => (
            <TouchableOpacity 
              key={severity}
              style={[
                styles.severityBtn, 
                { backgroundColor: colors.surface, borderColor: colors.surface },
                emergencyData.severity === severity && { backgroundColor: colors.background, borderColor: colors.primary }
              ]}
              onPress={() => onDataChange({ ...emergencyData, severity })}
            >
              <Text style={[
                styles.severityText, 
                { color: colors.textSecondary },
                emergencyData.severity === severity && { color: colors.text }
              ]}>
                {severity}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.formLabel, { color: colors.text }]}>Visible Symptoms *</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={handleDropdownToggle}
          >
            <Text style={[
              styles.dropdownText, 
              { color: colors.textSecondary },
              emergencyData.condition && { color: colors.text, fontWeight: '600' }
            ]}>
              {emergencyData.condition || 'Select symptoms...'}
            </Text>
            <Text style={[styles.dropdownArrow, { color: colors.textSecondary }]}>▼</Text>
          </TouchableOpacity>
          
          {showConditionDropdown && (
            <View style={[styles.dropdownList, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {conditions.map((condition, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.dropdownItem}
                  onPress={() => handleConditionSelect(condition)}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{condition}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.dispatchButton, 
            (!emergencyData.condition || !emergencyData.severity) && { backgroundColor: '#666' }
          ]} 
          onPress={onSubmit}
          disabled={!emergencyData.condition || !emergencyData.severity}
        >
          <Text style={styles.dispatchText}>CONTINUE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff0000',
  },
  formContainer: {
    gap: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 20,
  },
  dropdown: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
  },
  dropdownArrow: {
    fontSize: 12,
  },
  dropdownList: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  dispatchButton: {
    backgroundColor: '#ff0000',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  dispatchText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

export default EmergencyForm;