import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface TopNavigationProps {
  userName: string;
  address: string;
  profileMenuVisible: boolean;
  onProfilePress: () => void;
  onLogout: () => void;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ 
  userName, 
  address, 
  profileMenuVisible, 
  onProfilePress, 
  onLogout 
}) => {
  const { isDarkMode, toggleTheme, colors } = useTheme();
  return (
    <>
      <View style={styles.topContainer}>
        <View style={[styles.addressBar, { backgroundColor: colors.background }]}>
          <Text style={[styles.greetingText, { color: colors.textSecondary }]} numberOfLines={1}>
            Hi {userName}!
          </Text>
          <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
            {address}
          </Text>
        </View>

        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {profileMenuVisible && (
        <View style={[styles.profileMenu, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => console.log('Profile')}>
            <Text style={[styles.menuText, { color: colors.text }]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => console.log('Medical History')}>
            <Text style={[styles.menuText, { color: colors.text }]}>Medical History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => console.log('Emergency Contacts')}>
            <Text style={[styles.menuText, { color: colors.text }]}>Emergency Contacts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <Text style={[styles.menuText, { color: colors.text }]}>
              {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  topContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  addressBar: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  profileButton: {
    width: 44,
    height: 44,
    backgroundColor: '#000',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileIcon: {
    fontSize: 18,
    color: '#fff',
  },
  profileMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 180,
    paddingVertical: 8,
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  logoutText: {
    color: '#ff0000',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    marginHorizontal: 16,
  },
});

export default TopNavigation;