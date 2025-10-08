import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useBooking } from '../../context/BookingContext';

const OngoingBookingBar: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { ongoingBooking, hasOngoingBooking } = useBooking();

  if (!hasOngoingBooking || !ongoingBooking) return null;

  const getStatusColor = () => {
    switch (ongoingBooking.status) {
      case 'Assigned': return '#F59E0B';
      case 'On Route': return '#3B82F6';
      case 'Arrived': return '#10B981';
      default: return '#6B7280';
    }
  };

  const handlePress = () => {
    navigation.navigate('LiveTracking' as never, { 
      bookingData: {
        booking_type: ongoingBooking.booking_type,
        pickup_location: ongoingBooking.pickup_location,
        destination: ongoingBooking.pickup_location
      }
    } as never);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]} 
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <View style={styles.textSection}>
            <Text style={[styles.title, { color: colors.text }]}>
              🚑 {ongoingBooking.booking_type} Booking
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {ongoingBooking.status} • Tap to view
            </Text>
          </View>
        </View>
        <View style={styles.arrow}>
          <Text style={[styles.arrowText, { color: colors.textSecondary }]}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  arrow: {
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 18,
    fontWeight: '300',
  },
});

export default OngoingBookingBar;