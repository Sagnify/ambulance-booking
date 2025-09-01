import React from 'react';
import { TouchableOpacity, View, StyleSheet, Dimensions, Text } from 'react-native';
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
      <View style={styles.locationIconContainer}>
        <View style={styles.crosshair}>
          <View style={[styles.crosshairHorizontal, { backgroundColor: colors.text }]} />
          <View style={[styles.crosshairVertical, { backgroundColor: colors.text }]} />
          <View style={[styles.crosshairCenter, { backgroundColor: colors.text }]} />
        </View>
      </View>
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
  locationIconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshair: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#000',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#000',
  },
  crosshairCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
});

export default LocationSnapButton;