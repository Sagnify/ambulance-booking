import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { createBooking } from '../../services/api';

interface BookingConfirmationScreenProps {
  route: {
    params: {
      hospital: any;
    };
  };
  navigation: any;
}

const BookingConfirmationScreen: React.FC<BookingConfirmationScreenProps> = ({ route, navigation }) => {
  const { hospital } = route.params;

  const handleConfirmBooking = async () => {
    try {
      const bookingData = {
        hospital_id: hospital.id,
        pickup_location: 'Current Location',
        pickup_latitude: 28.6139,
        pickup_longitude: 77.2090,
        booking_type: 'emergency',
        emergency_type: 'medical',
        severity: 'high'
        // Remove hardcoded patient_name and patient_phone - let backend use user's data
      };
      
      const result = await createBooking(bookingData);
      console.log('Booking created with WebRTC:', result);
      
      navigation.navigate('LiveTracking', { bookingId: result.booking_id });
    } catch (error) {
      console.error('Booking failed:', error);
      navigation.navigate('Home');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Booking Confirmation</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.bookingDetails}>
          <Text style={styles.bookingHospital}>{hospital?.name}</Text>
          <Text style={styles.bookingDistance}>{hospital?.distance} km away</Text>
          <Text style={styles.bookingType}>{hospital?.type}</Text>
        </View>

        <View style={styles.ambulanceAvailability}>
          <Text style={styles.availabilityTitle}>Ambulance Availability</Text>
          <View style={styles.ambulanceInfo}>
            <Text style={styles.ambulanceStatus}>✅ Available</Text>
            <Text style={styles.ambulanceEta}>ETA: 8-12 minutes</Text>
            <Text style={styles.ambulanceDriver}>Driver: Rajesh Kumar</Text>
            <Text style={styles.ambulanceVehicle}>Vehicle: DL-01-AB-1234</Text>
          </View>
        </View>

        <View style={styles.bookingActions}>
          <TouchableOpacity style={styles.cancelBookingButton} onPress={handleCancel}>
            <Text style={styles.cancelBookingText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBookingButton} onPress={handleConfirmBooking}>
            <Text style={styles.confirmBookingText}>Confirm Booking</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 20,
    color: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookingDetails: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bookingHospital: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  bookingDistance: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  bookingType: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  ambulanceAvailability: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  ambulanceInfo: {
    gap: 8,
  },
  ambulanceStatus: {
    fontSize: 14,
    color: '#666',
  },
  ambulanceEta: {
    fontSize: 14,
    color: '#666',
  },
  ambulanceDriver: {
    fontSize: 14,
    color: '#666',
  },
  ambulanceVehicle: {
    fontSize: 14,
    color: '#666',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBookingButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBookingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmBookingButton: {
    flex: 2,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBookingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default BookingConfirmationScreen;