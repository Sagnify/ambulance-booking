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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { driverAPI } from '../services/api';
import { locationService, LocationData } from '../services/location';
import { Booking } from '../types';

const HomeScreen: React.FC = () => {
  const { driver, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(driver?.is_available || false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);

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
        await driverAPI.updateLocation(driver.id, location.latitude, location.longitude);
      }

      // Start watching location
      locationService.watchLocation(async (newLocation) => {
        setCurrentLocation(newLocation);
        if (driver) {
          await driverAPI.updateLocation(driver.id, newLocation.latitude, newLocation.longitude);
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
      const assignedBookings = await driverAPI.getAssignedBookings(driver.id);
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
      await driverAPI.setAvailability(driver.id, value);
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

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout },
      ]
    );
  };

  const renderBookingItem = ({ item }: { item: Booking }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingId}>Booking #{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <Text style={styles.detailText}>📞 {item.user_phone}</Text>
        <Text style={styles.detailText}>🏥 {item.hospital_name}</Text>
        <Text style={styles.detailText}>📍 Pickup: {item.pickup_latitude.toFixed(4)}, {item.pickup_longitude.toFixed(4)}</Text>
        <Text style={styles.detailText}>🕒 {new Date(item.created_at).toLocaleString()}</Text>
      </View>

      <View style={styles.actionButtons}>
        {item.status === 'assigned' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleBookingAction(item.id, 'en_route')}
          >
            <Text style={styles.actionButtonText}>Start Journey</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'en_route' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.arrivedButton]}
            onPress={() => handleBookingAction(item.id, 'arrived')}
          >
            <Text style={styles.actionButtonText}>Mark Arrived</Text>
          </TouchableOpacity>
        )}
        
        {item.status === 'arrived' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleBookingAction(item.id, 'completed')}
          >
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#FF9500';
      case 'en_route': return '#007AFF';
      case 'arrived': return '#34C759';
      case 'completed': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.driverName}>{driver?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityLabel}>Available for bookings</Text>
          <Switch
            value={isAvailable}
            onValueChange={handleAvailabilityToggle}
            trackColor={{ false: '#767577', true: '#34C759' }}
            thumbColor={isAvailable ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {currentLocation && (
          <Text style={styles.locationText}>
            📍 Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>

      <View style={styles.bookingsSection}>
        <Text style={styles.sectionTitle}>Assigned Bookings ({bookings.length})</Text>
        
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
              <Text style={styles.emptyText}>No bookings assigned</Text>
              <Text style={styles.emptySubtext}>Pull to refresh</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
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
    color: '#333',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  bookingsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  arrivedButton: {
    backgroundColor: '#34C759',
  },
  completeButton: {
    backgroundColor: '#8E8E93',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});

export default HomeScreen;