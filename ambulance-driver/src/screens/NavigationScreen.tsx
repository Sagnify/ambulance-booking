import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  AppState,
  Platform,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import FloatingBookingWidget from '../components/FloatingBookingWidget';
import { driverAPI } from '../services/api';
import { Booking } from '../types';
import { useTheme } from '../context/ThemeContext';

const NavigationScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { booking: initialBooking } = route.params as { booking: Booking };
  
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    // Open Google Maps after a short delay
    const timer = setTimeout(() => {
      openGoogleMaps();
    }, 1000);
    
    // Listen for app state changes
    const subscription = AppState.addEventListener('change', setAppState);
    
    // Poll for booking updates
    const pollInterval = setInterval(fetchBookingUpdate, 5000);
    
    return () => {
      clearTimeout(timer);
      subscription?.remove();
      clearInterval(pollInterval);
    };
  }, []);

  const fetchBookingUpdate = async () => {
    try {
      const bookings = await driverAPI.getAssignedBookings();
      const updatedBooking = bookings.find(b => b.id === booking.id);
      if (updatedBooking) {
        setBooking(updatedBooking);
        if (updatedBooking.status === 'Completed') {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Failed to fetch booking update:', error);
    }
  };

  const openGoogleMaps = () => {
    const destination = getNavigationDestination();
    if (destination) {
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${destination.latitude},${destination.longitude}`;
      const url = Platform.select({
        ios: `maps://?q=${destination.label}&ll=${latLng}`,
        android: `geo:${latLng}?q=${latLng}(${destination.label})`
      });
      
      Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${latLng}`);
    }
  };

  const getNavigationDestination = () => {
    if (booking.status === 'Assigned' || booking.status === 'On Route') {
      return {
        latitude: booking.pickup_latitude,
        longitude: booking.pickup_longitude,
        label: 'Patient Pickup Location'
      };
    } else if (booking.status === 'Arrived') {
      return {
        latitude: booking.hospital_latitude || 0,
        longitude: booking.hospital_longitude || 0,
        label: booking.hospital_name || 'Hospital'
      };
    }
    return null;
  };

  const handleStatusUpdate = async (bookingId: number, status: string) => {
    try {
      await driverAPI.updateBookingStatus(bookingId, status);
      setBooking(prev => ({ ...prev, status: status as any }));
      
      // If status changed to Arrived, open maps to hospital
      if (status === 'Arrived') {
        setTimeout(openGoogleMaps, 1000);
      }
      
      // If completed, go back
      if (status === 'Completed') {
        Alert.alert('Pickup Completed', 'Great job! The pickup has been completed.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const handleNavigate = (latitude: number, longitude: number, label: string) => {
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `maps://?q=${label}&ll=${latLng}`,
      android: `geo:${latLng}?q=${latLng}(${label})`
    });
    
    Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${latLng}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <FloatingBookingWidget
        booking={booking}
        onStatusUpdate={handleStatusUpdate}
        onNavigate={handleNavigate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
});

export default NavigationScreen;