import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSelector from './LanguageSelector';
import MediSwiftLogo from './MediSwiftLogo';

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
  const { t } = useLanguage();
  return (
    <>
      <View style={styles.topContainer}>
        <View style={[styles.addressBar, { backgroundColor: colors.background }]}>
          <View style={styles.logoSection}>
            <MediSwiftLogo size="small" color={colors.primary} />
          </View>
          <View style={styles.userSection}>
            <Text style={[styles.greetingText, { color: colors.textSecondary }]} numberOfLines={1}>
              Hi {userName}!
            </Text>
            <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
              {address}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {profileMenuVisible && (
        <View style={[styles.profileMenu, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => console.log('Profile')}>
            <Text style={[styles.menuText, { color: colors.text }]}>{t('profile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => console.log('Medical History')}>
            <Text style={[styles.menuText, { color: colors.text }]}>{t('medicalHistory')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => console.log('Emergency Contacts')}>
            <Text style={[styles.menuText, { color: colors.text }]}>{t('emergencyContacts')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <Text style={[styles.menuText, { color: colors.text }]}>
              {isDarkMode ? '☀️' : '🌙'} {isDarkMode ? t('lightMode') : t('darkMode')}
            </Text>
          </TouchableOpacity>
          <View style={styles.languageSection}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('language')}</Text>
            <LanguageSelector />
          </View>
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
            <Text style={[styles.menuText, styles.logoutText]}>{t('logout')}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoSection: {
    marginRight: 12,
  },
  userSection: {
    flex: 1,
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
    zIndex: 999998,
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
  languageSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default TopNavigation;