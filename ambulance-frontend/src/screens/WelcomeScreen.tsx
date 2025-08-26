import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  const [contentVisible, setContentVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);

  useEffect(() => {
    // Staggered animations
    const showContent = () => {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          800,
          LayoutAnimation.Types.easeOut,
          LayoutAnimation.Properties.opacity
        )
      );
      setContentVisible(true);
    };

    const showButtons = () => {
      setTimeout(() => {
        LayoutAnimation.configureNext(
          LayoutAnimation.create(
            600,
            LayoutAnimation.Types.easeOut,
            LayoutAnimation.Properties.scaleXY
          )
        );
        setButtonsVisible(true);
      }, 400);
    };

    showContent();
    showButtons();
  }, []);

  const handleLoginPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('Login');
  };

  const handleSignupPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('Signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.container}>
        {/* Main Content */}
        <View style={[
          styles.contentContainer, 
          { opacity: contentVisible ? 1 : 0 }
        ]}>
          <Text style={styles.title}>MediSwift</Text>
          <Text style={styles.tagline}>
            Fast ambulance service at your fingertips
          </Text>
        </View>

        {/* Buttons */}
        <View style={[
          styles.buttonContainer,
          { 
            opacity: buttonsVisible ? 1 : 0, 
            transform: [{ translateY: buttonsVisible ? 0 : 30 }] 
          }
        ]}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLoginPress}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignupPress}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryButtonText}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 60,
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  title: {
    fontSize: 64,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -2,
    textAlign: 'center',
    marginBottom: 24,
  },
  tagline: {
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 28,
    maxWidth: '90%',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});