import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  LayoutAnimation,
  UIManager,
  Alert
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import BackButton from '../components/BackButton';
import { useAuth } from '../../context/AuthContext';
import API  from '../../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { setUserLoggedIn } = useAuth();
  const [step, setStep] = useState(1); // Step 1: Phone, Step 2: OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [contentVisible, setContentVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // For Web Alert Fallback
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          600,
          LayoutAnimation.Types.easeOut,
          LayoutAnimation.Properties.opacity
        )
      );
      setContentVisible(true);
    }, 100);
  }, [step]);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep(step - 1);
    }
  };


  const handlePhoneContinue = async () => {
    setLoading(true);
    try {
      if (!phoneNumber || phoneNumber.length < 8) {
        showAlert('Error', 'Please enter a valid phone number.');
        return;
      }

      console.log('Checking user and sending OTP to:', phoneNumber);

      // Check if user exists and send OTP for login
      const response = await API.post('/api/auth/login', {
        phone_number: phoneNumber,
      });

      console.log('API Response:', response.data);

      if (response.status === 200) {
        nextStep(); // Move to OTP input step
      }
    } catch (error: any) {
      console.error('Error in login:', error);

      // Check if user not found (404 error)
      if (error.response?.status === 404) {
        Alert.alert(
          'User Not Found',
          'No account found with this phone number. Would you like to sign up?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => navigation.navigate('Signup') }
          ]
        );
      } else if (error.response?.data?.error) {
        showAlert('Error', error.response.data.error);
      } else {
        showAlert('Error', 'Could not connect to server.');
      }
    }
    setLoading(false);
  };


  const handleOtpVerify = async () => {
    setLoading(true);
    try {
      if (!otp || otp.length < 4) {
        showAlert('Error', 'Please enter a valid OTP.');
        return;
      }

      console.log('Verifying OTP:', otp);

      // Verify OTP for login
      const response = await API.post('/api/auth/login/verify', {
        phone_number: phoneNumber,
        otp: otp,
      });

      console.log('API Response:', response.data);

      if (response.status === 200) {
        setUserLoggedIn(true);
        console.log("Login successful, redirecting to home page...");
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);

      if (error.response?.data?.error) {
        showAlert('Error', error.response.data.error);
      } else {
        showAlert('Error', 'Could not connect to server.');
      }
    }
    setLoading(false);
  };

  const handleSignupNavigation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    navigation.navigate('Signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <BackButton onPress={prevStep} />

      <View
        style={[
          styles.contentContainer,
          { opacity: contentVisible ? 1 : 0 }
        ]}
      >
        {step === 1 && (
          <>
            <Text style={styles.welcomeText}>Welcome Back</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoCapitalize="none"
                placeholderTextColor="#A0A0A0"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: phoneNumber.length > 0 ? '#000000' : '#E0E0E0' }
              ]}
              onPress={handlePhoneContinue}
              disabled={phoneNumber.length === 0 || loading}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.loginButtonText,
                  { color: phoneNumber.length > 0 ? '#FFFFFF' : '#A0A0A0' }
                ]}
              >
                {loading ? 'Checking...' : 'Continue'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkContainer}
              onPress={handleSignupNavigation}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>Create a new account</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.welcomeText}>Verify OTP</Text>
            <Text style={styles.subtitle}>Sent to {phoneNumber}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                placeholderTextColor="#A0A0A0"
              />
            </View>
            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: otp.length > 0 ? '#000000' : '#E0E0E0' }
              ]}
              onPress={handleOtpVerify}
              disabled={otp.length === 0 || loading}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.loginButtonText,
                  { color: otp.length > 0 ? '#FFFFFF' : '#A0A0A0' }
                ]}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center'
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 40,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30
  },
  inputContainer: {
    marginBottom: 30
  },
  inputLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
    fontWeight: '500'
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  loginButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3
  },
  linkContainer: {
    alignItems: 'center',
    paddingVertical: 10
  },
  linkText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline'
  }
});
