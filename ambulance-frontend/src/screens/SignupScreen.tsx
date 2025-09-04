import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, LayoutAnimation,
  Platform, UIManager, Alert
} from 'react-native';
import BackButton from '../components/BackButton';
import API  from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// const API_BASE = 'http://localhost:5000/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [visible, setVisible] = useState(false);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setVisible(true);
    }, 100);
  }, [step]);

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const sendOTP = async () => {
    setLoading(true);
    try {
      const response = await API.post('/api/auth/signup', {
        phone_number: phone
      });
      nextStep();
    } catch (error: any) {
      console.log('Signup error:', error.response?.data || error.message);
      let message = 'Network error';
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        message = 'Server is currently unavailable. Please try again later.';
      } else if (error.response?.data?.error?.message) {
        message = error.response.data.error.message;
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.response?.status >= 500) {
        message = 'Server is experiencing issues. Please try again later.';
      }
      Alert.alert('Error', message);
    }
    setLoading(false);
  };

  const verifyOTP = async () => {
    setLoading(true);
    try {
      const response = await API.post('/api/auth/signup/verify', {
        phone_number: phone,
        otp
      });
      
      // Store user data from signup response
      const { user_id, access_token, token } = response.data;
      const authToken = access_token || token; // Support both formats
      setUserId(user_id.toString());
      setUserToken(authToken);
      
      nextStep();
    } catch (error: any) {
      console.log('Verify error:', error.response?.data || error.message);
      let message = 'Network error';
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        message = 'Server is currently unavailable. Please try again later.';
      } else if (error.response?.data?.error?.message) {
        message = error.response.data.error.message;
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (error.response?.status >= 500) {
        message = 'Server is experiencing issues. Please try again later.';
      }
      Alert.alert('Error', message);
    }
    setLoading(false);
  };

  const { setUserLoggedIn, setUserData } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);

  const updateProfile = async () => {
    setLoading(true);
    try {
      const response = await API.put('/api/auth/profile', {
        name,
        address
      }, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      // Store user data and set as logged in
      if (userId && userToken) {
        await setUserData(userId, userToken, name);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update profile';
      Alert.alert('Error', message);
    }
    setLoading(false);
  };

  const handleLocationAccess = (granted: boolean) => {
    if (granted) {
      nextStep(); // go to address step
    } else {
      console.log('User skipped location');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      {step === 1 ? (
        <BackButton /> // default navigation back
      ) : (
        <BackButton onPress={prevStep} /> // go back one step
      )}

      

      <View style={[styles.container, { opacity: visible ? 1 : 0 }]}>
        {step === 1 && (
          <>
            <Text style={styles.title}>Let's Get Started</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#A0A0A0"
              />
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: phone ? '#000' : '#E0E0E0' }]}
              disabled={!phone || loading}
              onPress={sendOTP}
            >
              <Text style={[styles.buttonText, { color: phone ? '#FFF' : '#A0A0A0' }]}>
                {loading ? 'Sending...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>Sent to {phone}</Text>
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
              style={[styles.button, { backgroundColor: otp ? '#000' : '#E0E0E0' }]}
              disabled={!otp || loading}
              onPress={verifyOTP}
            >
              <Text style={[styles.buttonText, { color: otp ? '#FFF' : '#A0A0A0' }]}>
                {loading ? 'Verifying...' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>What's Your Name?</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#A0A0A0"
              />
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: name ? '#000' : '#E0E0E0' }]}
              disabled={!name}
              onPress={nextStep}
            >
              <Text style={[styles.buttonText, { color: name ? '#FFF' : '#A0A0A0' }]}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.title}>Allow Location Access?</Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#000', marginBottom: 20 }]} onPress={() => handleLocationAccess(true)}>
              <Text style={[styles.buttonText, { color: '#FFF' }]}>Allow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, { backgroundColor: '#E0E0E0' }]} onPress={() => handleLocationAccess(false)}>
              <Text style={[styles.buttonText, { color: '#333' }]}>Skip</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 5 && (
          <>
            <Text style={styles.title}>Enter Your Address</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Your Address"
                value={address}
                onChangeText={setAddress}
                multiline
                placeholderTextColor="#A0A0A0"
              />
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: address ? '#000' : '#E0E0E0' }]}
              disabled={!address || loading}
              onPress={updateProfile}
            >
              <Text style={[styles.buttonText, { color: address ? '#FFF' : '#A0A0A0' }]}>
                {loading ? 'Creating...' : 'Finish'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 40 },
  title: { fontSize: 32, fontWeight: '700', color: '#000', marginBottom: 20, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  inputContainer: { marginBottom: 30 },
  label: { fontSize: 16, color: '#333', marginBottom: 8, fontWeight: '500' },
  input: {
    height: 56, backgroundColor: '#F8F8F8', borderRadius: 12, paddingHorizontal: 20,
    fontSize: 16, color: '#000', borderWidth: 1, borderColor: '#F0F0F0'
  },
  button: {
    height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
    shadowRadius: 8, elevation: 3, marginBottom: 10
  },
  buttonText: { fontSize: 18, fontWeight: '600' }
});
