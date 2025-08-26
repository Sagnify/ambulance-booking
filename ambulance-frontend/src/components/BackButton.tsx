import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface BackButtonProps {
  onPress?: () => void;
}

export default function BackButton({ onPress }: BackButtonProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress(); // Custom behavior (like prevStep)
    } else {
      navigation.goBack(); // Default behavior
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Ionicons name="chevron-back" size={28} color="black" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 40,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 1000,
  },
});
