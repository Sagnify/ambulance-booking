import React from 'react';
import { TouchableOpacity, View, StyleSheet, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

interface LocationSnapButtonProps {
  onPress: () => void;
}

const LocationSnapButton: React.FC<LocationSnapButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.locationButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.locationIconContainer}>
        <View style={styles.locationDot} />
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
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDot: {
    width: 12,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
});

export default LocationSnapButton;