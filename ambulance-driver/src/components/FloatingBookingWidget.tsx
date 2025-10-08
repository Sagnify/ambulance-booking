import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { Booking } from '../types';
import { useTheme } from '../context/ThemeContext';

interface FloatingBookingWidgetProps {
  booking: Booking;
  onStatusUpdate: (bookingId: number, status: string) => void;
  onNavigate: (latitude: number, longitude: number, label: string) => void;
}

const { width } = Dimensions.get('window');

const FloatingBookingWidget: React.FC<FloatingBookingWidgetProps> = ({
  booking,
  onStatusUpdate,
  onNavigate,
}) => {
  const { theme } = useTheme();

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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'assigned': return '#FF9500';
      case 'on route': return '#007AFF';
      case 'arrived': return '#34C759';
      default: return '#8E8E93';
    }
  };

  const getNextAction = () => {
    switch (booking.status) {
      case 'Assigned':
        return { text: '🚗 Start', action: 'On Route' };
      case 'On Route':
        return { text: '📍 Arrived', action: 'Arrived' };
      case 'Arrived':
        return { text: '✅ Complete', action: 'Completed' };
      default:
        return null;
    }
  };

  const destination = getNavigationDestination();
  const nextAction = getNextAction();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <View style={styles.bookingInfo}>
          <Text style={[styles.bookingCode, { color: theme.text }]}>
            #{booking.booking_code || booking.id}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[styles.patientName, { color: theme.text }]}>
          {booking.patient_name || 'Patient'}
        </Text>
      </View>

      <View style={styles.actions}>
        {destination && (
          <TouchableOpacity
            style={[styles.actionButton, styles.navigateButton]}
            onPress={() => onNavigate(destination.latitude, destination.longitude, destination.label)}
          >
            <Text style={styles.actionButtonText}>🗺️</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.callButton]}
          onPress={() => Linking.openURL(`tel:${booking.patient_phone || booking.user_phone}`)}
        >
          <Text style={styles.actionButtonText}>📞</Text>
        </TouchableOpacity>

        {nextAction && (
          <TouchableOpacity
            style={[styles.actionButton, styles.statusButton]}
            onPress={() => onStatusUpdate(booking.id, nextAction.action)}
          >
            <Text style={styles.actionButtonText}>{nextAction.text}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  header: {
    marginBottom: 12,
  },
  bookingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookingCode: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  patientName: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateButton: {
    backgroundColor: '#5856D6',
  },
  callButton: {
    backgroundColor: '#34C759',
  },
  statusButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FloatingBookingWidget;