import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { driverAPI } from '../services/api';
import { locationService, LocationData } from '../services/location';
import { Booking } from '../types';
import ProfileModal from '../components/ProfileModal';

const HomeScreen: React.FC = () => {
  const { driver } = useAuth();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(driver?.is_available || false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    initializeLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (driver) {
        fetchBookings();
      }
    }, [driver])
  );

  const initializeLocation = async () => {
    try {
      const hasPermission = await locationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Location permission is required for this app');
        return;
      }

      const location = await locationService.getCurrentLocation();
      setCurrentLocation(location);

      if (driver) {
        await driverAPI.updateLocation(location.latitude, location.longitude);
      }

      // Start watching location
      locationService.watchLocation(async (newLocation) => {
        setCurrentLocation(newLocation);
        if (driver) {
          await driverAPI.updateLocation(newLocation.latitude, newLocation.longitude);
        }
      });
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const fetchBookings = async () => {
    if (!driver) return;

    setIsLoading(true);
    try {
      const assignedBookings = await driverAPI.getAssignedBookings();
      setBookings(assignedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvailabilityToggle = async (value: boolean) => {
    if (!driver) return;

    try {
      await driverAPI.setAvailability(value);
      setIsAvailable(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const handleBookingAction = async (bookingId: number, action: string) => {
    try {
      await driverAPI.updateBookingStatus(bookingId, action);
      fetchBookings(); // Refresh bookings
    } catch (error) {
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const openGoogleMaps = (latitude: number, longitude: number, label: string) => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `maps://?q=${label}&ll=${latLng}`,
      android: `geo:${latLng}?q=${latLng}(${label})`
    });
    
    Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${latLng}`);
  };

  const getNavigationDestination = (booking: Booking) => {
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



  const renderBookingItem = ({ item }: { item: Booking }) => (
    <View style={[styles.bookingCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
      {/* Header with booking code and type */}
      <View style={styles.bookingHeader}>
        <View style={styles.bookingTitleRow}>
          <Text style={[styles.bookingCode, { color: theme.text }]}>#{item.booking_code || item.id}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.booking_type) }]}>
            <Text style={styles.typeBadgeText}>{item.booking_type?.toUpperCase() || 'REGULAR'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Patient Information */}
      <View style={styles.patientSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PATIENT INFO</Text>
        <View style={styles.patientRow}>
          <Text style={[styles.patientName, { color: theme.text }]}>👤 {item.patient_name || item.user_name || 'Unknown Patient'}</Text>
          <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL(`tel:${item.patient_phone || item.user_phone}`)}>
            <Text style={styles.callButtonText}>📞</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.patientPhone, { color: theme.textSecondary }]}>{item.patient_phone || item.user_phone}</Text>
        {item.user_name && item.user_name !== item.patient_name && (
          <Text style={[styles.userInfo, { color: theme.textSecondary }]}>📱 Booked by: {item.user_name} ({item.user_phone})</Text>
        )}
        {item.emergency_type && (
          <Text style={[styles.emergencyType, { color: '#FF3B30' }]}>⚠️ {item.emergency_type}</Text>
        )}
        {item.severity && (
          <Text style={[styles.severity, { color: getSeverityColor(item.severity) }]}>🔥 Severity: {item.severity}</Text>
        )}
      </View>

      {/* Location Information */}
      <View style={styles.locationSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PICKUP LOCATION</Text>
        <Text style={[styles.pickupLocation, { color: theme.text }]}>📍 {item.pickup_location || 'Location not specified'}</Text>
        {item.pickup_latitude && item.pickup_longitude && (
          <TouchableOpacity onPress={() => Alert.alert('Coordinates', `${item.pickup_latitude.toFixed(6)}, ${item.pickup_longitude.toFixed(6)}`)}>
            <Text style={[styles.coordinates, { color: theme.primary }]}>📌 View Coordinates</Text>
          </TouchableOpacity>
        )}
        {item.destination && (
          <Text style={[styles.destination, { color: theme.textSecondary }]}>🏥 To: {item.destination}</Text>
        )}
      </View>

      {/* Hospital Information */}
      <View style={styles.hospitalSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>HOSPITAL</Text>
        <Text style={[styles.hospitalName, { color: theme.text }]}>🏥 {item.hospital_name}</Text>
        {item.hospital_address && (
          <Text style={[styles.hospitalAddress, { color: theme.textSecondary }]}>{item.hospital_address}</Text>
        )}
        {item.hospital_contact && (
          <TouchableOpacity onPress={() => Alert.alert('Call Hospital', `Call ${item.hospital_contact}`)}>
            <Text style={[styles.hospitalContact, { color: theme.primary }]}>📞 {item.hospital_contact}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Timing Information */}
      <View style={styles.timingSection}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>TIMING</Text>
        <Text style={[styles.requestedTime, { color: theme.textSecondary }]}>🕒 Requested: {new Date(item.requested_at).toLocaleString()}</Text>
        {item.assigned_at && (
          <Text style={[styles.assignedTime, { color: theme.textSecondary }]}>✅ Assigned: {new Date(item.assigned_at).toLocaleString()}</Text>
        )}
        {item.auto_assigned && (
          <Text style={[styles.autoAssigned, { color: '#FF9500' }]}>🤖 Auto-assigned</Text>
        )}
      </View>

      {/* Navigation and Action Buttons */}
      <View style={styles.actionButtons}>
        {(item.status === 'Assigned' || item.status === 'On Route' || item.status === 'Arrived') && (() => {
          const destination = getNavigationDestination(item);
          return destination && (
            <TouchableOpacity
              style={[styles.actionButton, styles.navigateButton]}
              onPress={() => openGoogleMaps(destination.latitude, destination.longitude, destination.label)}
            >
              <Text style={styles.actionButtonText}>🗺️ Navigate</Text>
            </TouchableOpacity>
          );
        })()}
        
        {item.status === 'Assigned' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => handleBookingAction(item.id, 'On Route')}
            >
              <Text style={styles.actionButtonText}>🚗 Start Journey</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.floatingNavButton]}
              onPress={() => navigation.navigate('Navigation' as never, { booking: item } as never)}
            >
              <Text style={styles.actionButtonText}>🌍 Floating Nav</Text>
            </TouchableOpacity>
          </>
        )}
        
        {item.status === 'On Route' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.arrivedButton]}
            onPress={() => handleBookingAction(item.id, 'Arrived')}
          >
            <Text style={styles.actionButtonText}>📍 Mark Arrived</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'Arrived' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleBookingAction(item.id, 'Completed')}
          >
            <Text style={styles.actionButtonText}>✅ Complete Pickup</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'assigned': return '#FF9500';
      case 'on route': return '#007AFF';
      case 'arrived': return '#34C759';
      case 'completed': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'emergency': return '#FF3B30';
      case 'accident': return '#FF9500';
      case 'regular': return '#007AFF';
      default: return '#8E8E93';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#FFCC00';
      case 'low': return '#34C759';
      default: return '#8E8E93';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View>
          <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.driverName, { color: theme.text }]}>{driver?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowProfile(true)} style={[styles.profileButton, { backgroundColor: theme.primary }]}>
          <Text style={styles.profileButtonText}>
            {driver?.name?.charAt(0).toUpperCase() || 'D'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statusCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
        <View style={styles.availabilityRow}>
          <Text style={[styles.availabilityLabel, { color: theme.text }]}>Available for bookings</Text>
          <Switch
            value={isAvailable}
            onValueChange={handleAvailabilityToggle}
            trackColor={{ false: '#767577', true: '#34C759' }}
            thumbColor={isAvailable ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {currentLocation && (
          <Text style={[styles.locationText, { color: theme.textSecondary }]}>
            📍 Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      <View style={styles.bookingsSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Assigned Bookings ({bookings.length})</Text>
        
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchBookings} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No bookings assigned</Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Pull to refresh</Text>
            </View>
          }
        />
      </View>
      
      <ProfileModal 
        visible={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 16,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  availabilityLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 14,
  },
  bookingsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  bookingCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bookingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingCode: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Section styles
  patientSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  locationSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  hospitalSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  timingSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  
  // Patient info styles
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  callButton: {
    backgroundColor: '#34C759',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 16,
  },
  patientPhone: {
    fontSize: 14,
    marginBottom: 4,
  },
  emergencyType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  severity: {
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  
  // Location styles
  pickupLocation: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  coordinates: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  destination: {
    fontSize: 14,
  },
  
  // Hospital styles
  hospitalName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  hospitalAddress: {
    fontSize: 13,
    marginBottom: 4,
  },
  hospitalContact: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Timing styles
  requestedTime: {
    fontSize: 13,
    marginBottom: 2,
  },
  assignedTime: {
    fontSize: 13,
    marginBottom: 2,
  },
  autoAssigned: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Action button styles
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  navigateButton: {
    backgroundColor: '#5856D6',
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  arrivedButton: {
    backgroundColor: '#34C759',
  },
  completeButton: {
    backgroundColor: '#FF9500',
  },
  floatingNavButton: {
    backgroundColor: '#AF52DE',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
});

export default HomeScreen;