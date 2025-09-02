import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface AccidentFormProps {
  accidentData: {
    type: string;
    peopleInvolved: string;
    injuriesVisible: string;
    policeRequired: boolean;
    towRequired: boolean;
  };
  onDataChange: (data: any) => void;
  showTypeDropdown: boolean;
  onDropdownToggle: (show: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  panelHeight: Animated.Value;
  height: number;
}

const AccidentForm: React.FC<AccidentFormProps> = ({
  accidentData,
  onDataChange,
  showTypeDropdown,
  onDropdownToggle,
  onSubmit,
  onCancel,
  panelHeight,
  height,
}) => {
  const { colors } = useTheme();

  const accidentTypes = [
    'Car Crash', 'Motorcycle Accident', 'Bicycle Accident', 'Pedestrian Hit', 
    'Fall/Slip', 'Workplace Injury', 'Sports Injury', 'Other'
  ];

  const handleDropdownToggle = () => {
    const newState = !showTypeDropdown;
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

  const handleTypeSelect = (type: string) => {
    onDataChange({ ...accidentData, type });
    onDropdownToggle(false);
    
    Animated.spring(panelHeight, {
      toValue: height * 0.7,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Accident Details</Text>
      </View>
      
      <View style={styles.formContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Accident Type *</Text>
        <TouchableOpacity 
          style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]} 
          onPress={handleDropdownToggle}
        >
          <Text style={[
            styles.dropdownText, 
            { color: colors.textSecondary },
            accidentData.type && { color: colors.text, fontWeight: '600' }
          ]}>
            {accidentData.type || 'Select accident type...'}
          </Text>
          <Text style={[styles.dropdownArrow, { color: colors.textSecondary }]}>▼</Text>
        </TouchableOpacity>
        
        {showTypeDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {accidentTypes.map((type, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.dropdownItem}
                onPress={() => handleTypeSelect(type)}
              >
                <Text style={[styles.dropdownItemText, { color: colors.text }]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <Text style={[styles.label, { color: colors.text }]}>People Involved *</Text>
        <View style={styles.optionButtons}>
          {['1 Person', '2-3 People', '4+ People'].map((option) => (
            <TouchableOpacity 
              key={option}
              style={[
                styles.optionBtn, 
                { backgroundColor: colors.surface, borderColor: colors.surface },
                accidentData.peopleInvolved === option && { backgroundColor: colors.background, borderColor: colors.primary }
              ]}
              onPress={() => onDataChange({ ...accidentData, peopleInvolved: option })}
            >
              <Text style={[
                styles.optionText, 
                { color: colors.textSecondary },
                accidentData.peopleInvolved === option && { color: colors.text }
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.label, { color: colors.text }]}>Visible Injuries *</Text>
        <View style={styles.optionButtons}>
          {['None Visible', 'Minor Injuries', 'Serious Injuries'].map((option) => (
            <TouchableOpacity 
              key={option}
              style={[
                styles.optionBtn, 
                { backgroundColor: colors.surface, borderColor: colors.surface },
                accidentData.injuriesVisible === option && { backgroundColor: colors.background, borderColor: colors.primary }
              ]}
              onPress={() => onDataChange({ ...accidentData, injuriesVisible: option })}
            >
              <Text style={[
                styles.optionText, 
                { color: colors.textSecondary },
                accidentData.injuriesVisible === option && { color: colors.text }
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.label, { color: colors.text }]}>Additional Services</Text>
        <View style={styles.serviceOptions}>
          <TouchableOpacity 
            style={[styles.serviceOption, { borderColor: colors.border }]}
            onPress={() => onDataChange({ ...accidentData, policeRequired: !accidentData.policeRequired })}
          >
            <Text style={[styles.serviceText, { color: colors.text }]}>🚔 Police Required</Text>
            <View style={[
              styles.checkbox, 
              { borderColor: colors.border },
              accidentData.policeRequired && { backgroundColor: colors.primary }
            ]}>
              {accidentData.policeRequired && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.serviceOption, { borderColor: colors.border }]}
            onPress={() => onDataChange({ ...accidentData, towRequired: !accidentData.towRequired })}
          >
            <Text style={[styles.serviceText, { color: colors.text }]}>🚛 Tow Service</Text>
            <View style={[
              styles.checkbox, 
              { borderColor: colors.border },
              accidentData.towRequired && { backgroundColor: colors.primary }
            ]}>
              {accidentData.towRequired && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.submitButton, 
            (!accidentData.type || !accidentData.peopleInvolved || !accidentData.injuriesVisible) && { backgroundColor: '#666' }
          ]} 
          onPress={onSubmit}
          disabled={!accidentData.type || !accidentData.peopleInvolved || !accidentData.injuriesVisible}
        >
          <Text style={styles.submitText}>DISPATCH AMBULANCE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff6600',
  },
  formContainer: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdown: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginTop: -12,
    marginBottom: 16,
    position: 'absolute',
    top: 90,
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
  optionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceOptions: {
    gap: 12,
    marginBottom: 16,
  },
  serviceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  serviceText: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#ff6600',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});

export default AccidentForm;