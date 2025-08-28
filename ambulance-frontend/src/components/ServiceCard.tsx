import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ServiceCardProps {
  emoji: string;
  name: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ emoji, name, description, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.serviceCard, selected && styles.selectedServiceCard]}
      onPress={onPress}
    >
      <View style={styles.serviceIcon}>
        <Text style={styles.serviceEmoji}>{emoji}</Text>
      </View>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{name}</Text>
        <Text style={styles.serviceDesc}>{description}</Text>
      </View>
      <Text style={styles.serviceArrow}>›</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedServiceCard: {
    borderColor: '#000',
    backgroundColor: '#fafafa',
  },
  serviceIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceEmoji: {
    fontSize: 24,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 14,
    color: '#666',
  },
  serviceArrow: {
    fontSize: 20,
    color: '#ccc',
    marginLeft: 8,
  },
});

export default ServiceCard;