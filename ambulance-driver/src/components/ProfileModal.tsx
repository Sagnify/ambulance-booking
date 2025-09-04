import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  const { driver, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => {
            onClose();
            logout();
          }
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 24,
      width: '80%',
      maxWidth: 300,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatarText: {
      color: '#fff',
      fontSize: 24,
      fontWeight: 'bold',
    },
    driverName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    driverId: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    optionText: {
      fontSize: 16,
      color: theme.text,
    },
    buttons: {
      gap: 12,
    },
    button: {
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    logoutButton: {
      backgroundColor: '#FF3B30',
    },
    closeButton: {
      backgroundColor: theme.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    logoutButtonText: {
      color: '#fff',
    },
    closeButtonText: {
      color: theme.text,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {driver?.name?.charAt(0).toUpperCase() || 'D'}
              </Text>
            </View>
            <Text style={styles.driverName}>{driver?.name}</Text>
            <Text style={styles.driverId}>ID: {driver?.login_id}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.option}>
              <Text style={styles.optionText}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#767577', true: theme.primary }}
                thumbColor={isDark ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
              <Text style={[styles.buttonText, styles.logoutButtonText]}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.closeButton]} onPress={onClose}>
              <Text style={[styles.buttonText, styles.closeButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default ProfileModal;