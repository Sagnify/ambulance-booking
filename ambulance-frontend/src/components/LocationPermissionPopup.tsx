import React from 'react';
import { Modal, View, Text, Button, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  onAllow: () => void;
}

const LocationPermissionPopup: React.FC<Props> = ({ visible, onAllow }) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Enable Location</Text>
          <Text style={styles.message}>
            We need your location to show nearby hospitals.
          </Text>
          <Button title="Allow" onPress={onAllow} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  message: { fontSize: 14, textAlign: 'center', marginBottom: 15 },
});

export default LocationPermissionPopup;
