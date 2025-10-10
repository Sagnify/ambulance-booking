import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface MediSwiftLogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const MediSwiftLogo: React.FC<MediSwiftLogoProps> = ({ size = 'medium', color = '#3B82F6' }) => {
  const getSize = () => {
    switch (size) {
      case 'small': return { icon: 20, text: 16 };
      case 'large': return { icon: 32, text: 24 };
      default: return { icon: 24, text: 18 };
    }
  };

  const { icon, text } = getSize();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <MaterialIcons name="local-hospital" size={icon} color="#fff" />
      </View>
      <Text style={[styles.text, { fontSize: text, color }]}>MediSwift</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    borderRadius: 6,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default MediSwiftLogo;