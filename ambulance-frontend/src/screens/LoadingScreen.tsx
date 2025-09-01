import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import * as Location from 'expo-location';
import { useTheme } from '../../context/ThemeContext';

interface LoadingScreenProps {
  onLoadingComplete: (address: string, location: { latitude: number; longitude: number }) => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoadingComplete }) => {
  const { colors } = useTheme();
  const [address, setAddress] = useState('Fetching your location...');
  const [loadingStep, setLoadingStep] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Initial fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      })
    ]).start();

    // Start pulse animation
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start(() => pulse());
    };
    pulse();

    getLocationAndProceed();
  }, []);

  const getLocationAndProceed = async () => {
    try {
      setLoadingStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Location access denied');
        setLoadingStep(2);
        await new Promise(resolve => setTimeout(resolve, 1500));
        onLoadingComplete('Location access denied', { latitude: 22.4675, longitude: 88.3732 });
        return;
      }

      setLoadingStep(2);
      setAddress('Getting your precise location...');
      await new Promise(resolve => setTimeout(resolve, 800));

      const loc = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High
      });
      const { latitude, longitude } = loc.coords;

      setLoadingStep(3);
      setAddress('Finding nearby hospitals...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Reverse geocoding
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let readableAddress = 'Current location';
      if (reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        readableAddress = `${location.street || ''} ${location.city || ''}, ${location.region || ''}`.trim() || 
                         `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      setAddress(readableAddress);
      setLoadingStep(4);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Final fade out and complete
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onLoadingComplete(readableAddress, { latitude, longitude });
      });

    } catch (error) {
      console.error('Location error:', error);
      setAddress('Unable to get location');
      setLoadingStep(4);
      await new Promise(resolve => setTimeout(resolve, 1500));
      onLoadingComplete('Current location', { latitude: 22.4675, longitude: 88.3732 });
    }
  };

  const getLoadingText = () => {
    switch (loadingStep) {
      case 0: return 'Welcome to Emergency Care';
      case 1: return 'Requesting location access...';
      case 2: return 'Getting your precise location...';
      case 3: return 'Finding nearby hospitals...';
      case 4: return 'Almost ready!';
      default: return 'Loading...';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#ff0000" />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.iconContainer,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Text style={styles.ambulanceIcon}>🚑</Text>
        </Animated.View>
        
        <Text style={[styles.appName, { color: colors.text }]}>Emergency Care</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>Fast. Reliable. Life-saving.</Text>
        
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>{getLoadingText()}</Text>
          <Text style={[styles.addressText, { color: colors.textSecondary }]}>{address}</Text>
          
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    backgroundColor: '#ff0000',
                    width: `${(loadingStep / 4) * 100}%`
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 30,
  },
  ambulanceIcon: {
    fontSize: 80,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginBottom: 60,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    minHeight: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff0000',
    borderRadius: 2,
  },
});

export default LoadingScreen;