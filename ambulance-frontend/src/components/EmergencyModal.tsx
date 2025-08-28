import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface EmergencyModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const EmergencyModal: React.FC<EmergencyModalProps> = ({ visible, onCancel, onConfirm }) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.emergencyModal}>
        <Text style={styles.modalTitle}>🚨 Emergency Alert</Text>
        <Text style={styles.modalText}>Are you sure this is a medical emergency?</Text>
        <Text style={styles.warningText}>False emergency calls may result in penalties</Text>
        
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
            <Text style={styles.confirmButtonText}>YES, EMERGENCY</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  emergencyModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff0000',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#ff0000',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default EmergencyModal;