import React from 'react';
import { TouchableOpacity, View, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');

interface LocationSnapButtonProps {
  onPress: () => void;
}

const LocationSnapButton: React.FC<LocationSnapButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity 
      style={[styles.locationButton, { backgroundColor: colors.background }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name="gps-fixed" 
        size={24} 
        color={colors.text} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  locationButton: {
    position: 'absolute',
    bottom: height * 0.5,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 5,
  },

});

export default LocationSnapButton;