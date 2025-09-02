import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

const LiveTrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookingData } = route.params;
  
  const [booking, setBooking] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isAssigned, setIsAssigned] = useState(false);

  useEffect(() => {
    createBooking();
  }, []);

  useEffect(() => {
    if (!isAssigned && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            autoAssignAmbulance();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, isAssigned]);

  useEffect(() => {
    if (booking) {
      const statusCheck = setInterval(() => {
        checkBookingStatus();
      }, 2000);
      return () => clearInterval(statusCheck);
    }
  }, [booking]);

  const createBooking = async () => {
    try {
      const API_BASE_URL = 'https://your-backend-url.vercel.app'; // Replace with actual URL
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      
      const data = await response.json();
      setBooking(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to create booking');
    }
  };

  const checkBookingStatus = async () => {
    if (!booking) return;
    
    try {
      const API_BASE_URL = 'https://your-backend-url.vercel.app'; // Replace with actual URL
      const response = await fetch(`${API_BASE_URL}/api/bookings/${booking.booking_id}/status`);
      const data = await response.json();
      
      if (data.status === 'Assigned' && !isAssigned) {
        setIsAssigned(true);
        setTimeRemaining(0);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const autoAssignAmbulance = async () => {
    if (!booking || isAssigned) return;
    
    try {
      const API_BASE_URL = 'https://your-backend-url.vercel.app'; // Replace with actual URL
      const response = await fetch(`${API_BASE_URL}/api/bookings/${booking.booking_id}/auto-assign`, {
        method: 'POST'
      });
      
      if (response.ok) {
        setIsAssigned(true);
        checkBookingStatus();
      }
    } catch (error) {
      console.error('Auto-assignment failed:', error);
    }
  };

  const getThemeColor = () => {
    switch (bookingData.booking_type) {
      case 'Emergency': return '#ff0000';
      case 'Accident': return '#ff6600';
      default: return '#0066cc';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: getThemeColor() }]}>
        <Text style={styles.headerText}>
          {bookingData.booking_type.toUpperCase()} TRACKING
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Booking Status</Text>
          
          {!isAssigned ? (
            <View style={styles.waitingSection}>
              <Text style={styles.waitingText}>Waiting for ambulance assignment...</Text>
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>{timeRemaining}</Text>
                <Text style={styles.timerLabel}>seconds remaining</Text>
              </View>
              <Text style={styles.autoAssignText}>
                {timeRemaining > 0 ? 
                  'Hospital is selecting an ambulance for you' : 
                  'Auto-assigning nearest available ambulance...'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.assignedSection}>
              <Text style={styles.assignedText}>✅ Ambulance Assigned!</Text>
              <Text style={styles.driverInfo}>Driver details will appear here</Text>
            </View>
          )}
        </View>

        <View style={styles.bookingDetails}>
          <Text style={styles.detailsTitle}>Booking Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>{bookingData.booking_type}</Text>
          </View>
          {bookingData.emergency_type && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Emergency:</Text>
              <Text style={styles.detailValue}>{bookingData.emergency_type}</Text>
            </View>
          )}
          {bookingData.severity && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Severity:</Text>
              <Text style={[styles.detailValue, { color: getThemeColor() }]}>{bookingData.severity}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pickup:</Text>
            <Text style={styles.detailValue}>{bookingData.pickup_location}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelText}>Cancel Booking</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  waitingSection: {
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ff6600',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
  },
  autoAssignText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  assignedSection: {
    alignItems: 'center',
  },
  assignedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00aa00',
    marginBottom: 10,
  },
  driverInfo: {
    fontSize: 14,
    color: '#666',
  },
  bookingDetails: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cancelButton: {
    margin: 20,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LiveTrackingScreen;