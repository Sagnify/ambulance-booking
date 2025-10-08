import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  Text, 
  Platform, 
  StatusBar,
  ScrollView,
  Animated,
  Alert 
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { useRoute, useNavigation } from '@react-navigation/native';
import MapViewComponent from '../components/MapView';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useBooking } from '../../context/BookingContext';
import API, { cancelBooking } from '../../services/api';
import LocationService from '../../services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://ambulance-booking-roan.vercel.app';

const LiveTrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookingData } = route.params as { bookingData: any };
  const { colors } = useTheme();
  const { userToken } = useAuth();
  const { setOngoingBooking } = useBooking();
  const webViewRef = useRef(null);
  
  const { ongoingBooking } = useBooking();
  
  // Initialize state based on existing booking if available
  const [booking, setBooking] = useState<{ booking_id: number; booking_code: string } | null>(
    bookingData.booking_code ? {
      booking_id: bookingData.booking_id || 0,
      booking_code: bookingData.booking_code
    } : null
  );
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isAssigned, setIsAssigned] = useState(
    ongoingBooking?.status === 'Assigned' && bookingData.booking_code ? true : false
  );
  const [isCancelled, setIsCancelled] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  interface Driver {
    driver_name?: string;
    vehicle_number?: string;
    // add other fields as needed
  }
  const [assignedDriver, setAssignedDriver] = useState<Driver | null>(
    ongoingBooking?.ambulance && bookingData.booking_code ? ongoingBooking.ambulance : null
  );
  const [userLocation] = useState({ latitude: 22.4675, longitude: 88.3732 });
  const [hospitalLocation] = useState({ latitude: 22.4775, longitude: 88.3832 });
  const panelHeight = useRef(new Animated.Value(height * 0.4)).current;
  const [panelPosition, setPanelPosition] = useState(height * 0.4);

  useEffect(() => {
    // Check if this is an existing booking or new one
    if (bookingData.booking_code) {
      // Existing booking - set ambulance location if assigned
      if (ongoingBooking?.ambulance && isAssigned) {
        setAmbulanceLocation({
          latitude: userLocation.latitude + 0.01,
          longitude: userLocation.longitude + 0.01
        });
      }
      // Check status for updates
      checkBookingStatus();
    } else {
      // New booking - create it
      createBooking();
    }
    
    startLocationTracking();
    const stopPolling = startPolling();
    
    // Cleanup location tracking and polling when component unmounts
    return () => {
      LocationService.stopBookingTracking();
      stopPolling();
    };
  }, []);

  const startPolling = () => {
    // Poll for booking status updates every 3 seconds
    const pollInterval = setInterval(() => {
      if (booking && !isAssigned && !isCancelled) {
        checkBookingStatus();
      }
    }, 3000);
    
    return () => clearInterval(pollInterval);
  };

  const startLocationTracking = async () => {
    const success = await LocationService.startBookingTracking((location) => {
      console.log('User location updated during booking:', location.coords);
      // Update user location for ambulance to track
      // This location is only tracked during active booking
    });
    
    if (!success) {
      Alert.alert('Location Access', 'Unable to track your location. Ambulance may have difficulty finding you.');
    }
  };

  useEffect(() => {
    if (!isAssigned && !isCancelled && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            checkBookingStatus();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, isAssigned, isCancelled]);

  useEffect(() => {
    if (booking && !isAssigned && !isCancelled) {
      const statusInterval = setInterval(checkBookingStatus, 5000);
      return () => clearInterval(statusInterval);
    }
  }, [booking, isAssigned, isCancelled]);

  // Using polling for real-time updates instead of WebRTC

  const createBooking = async () => {
    console.log('Creating booking with data:', bookingData);
    
    try {
      const response = await API.post('/api/bookings', {
        ...bookingData,
        destination: bookingData.destination || bookingData.pickup_location
      });
      
      const newBooking = { 
        booking_id: response.data.booking_id,
        booking_code: response.data.booking_code
      };
      setBooking(newBooking);
      
      // Set ongoing booking in context
      setOngoingBooking({
        booking_id: response.data.booking_id,
        booking_code: response.data.booking_code,
        status: 'Pending',
        booking_type: bookingData.booking_type,
        pickup_location: bookingData.pickup_location,
        destination: bookingData.destination,
        is_cancelled: false
      });
    } catch (error: any) {
      console.error('Booking creation failed:', error);
      Alert.alert('Error', error.response?.data?.error || 'Booking failed. Please try again.');
    }
  };

  const checkBookingStatus = async () => {
    if (!booking) return;
    
    try {
      const response = await API.get(`/api/bookings/${booking.booking_id}/status`);
      const result = response.data;
      
      if (result.is_cancelled) {
        setIsCancelled(true);
        setCancelReason(result.cancel_reason);
        if (result.status === 'Auto-Cancelled') {
          setOngoingBooking(null); // Clear ongoing booking
          Alert.alert(
            'Booking Auto-Cancelled',
            'Sorry, no ambulance was available. Please try booking with a different hospital.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else if (result.status === 'Assigned' && result.ambulance) {
        setIsAssigned(true);
        setAssignedDriver(result.ambulance);
        setAmbulanceLocation({
          latitude: userLocation.latitude + 0.01,
          longitude: userLocation.longitude + 0.01
        });
        
        // Update ongoing booking with assignment info
        setOngoingBooking({
          booking_id: booking.booking_id,
          booking_code: booking.booking_code,
          status: result.status,
          booking_type: bookingData.booking_type,
          pickup_location: bookingData.pickup_location,
          destination: bookingData.destination,
          is_cancelled: false,
          ambulance: result.ambulance
        });
      } else if (result.status === 'Completed') {
        setOngoingBooking(null); // Clear completed booking
      }
    } catch (error) {
      console.log('Status check failed, booking may not exist in backend');
    }
  };

  const autoAssignAmbulance = async () => {
    if (!booking || isAssigned) return;
    
    try {
      const response = await API.post(`/api/bookings/${booking.booking_id}/auto-assign`);
      const result = response.data;
      
      if (result.driver) {
        setIsAssigned(true);
        setAssignedDriver(result.driver);
        setAmbulanceLocation({
          latitude: userLocation.latitude + 0.01,
          longitude: userLocation.longitude + 0.01
        });
      }
    } catch (error) {
      console.error('Auto-assignment API error:', error);
      // Fallback: simulate assignment for demo
      setIsAssigned(true);
      setAssignedDriver({
        driver_name: 'Demo Driver',
        vehicle_number: 'AMB-001'
      });
      setAmbulanceLocation({
        latitude: userLocation.latitude + 0.01,
        longitude: userLocation.longitude + 0.01
      });
    }
  };

  const getThemeColor = () => {
    switch (bookingData.booking_type) {
      case 'Emergency': return '#ff0000';
      case 'Accident': return '#ff6600';
      default: return '#0066cc';
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            if (booking) {
              try {
                await cancelBooking(booking.booking_id);
                setOngoingBooking(null); // Clear ongoing booking
                Alert.alert('Success', 'Booking cancelled successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'Failed to cancel booking');
              }
            } else {
              setOngoingBooking(null);
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  interface PanGestureEvent {
    nativeEvent: {
      translationY: number;
    };
  }

  const onPanGestureEvent = (event: PanGestureEvent) => {
    const { translationY } = event.nativeEvent;
    const maxHeight = height * 0.8;
    const newHeight = Math.max(height * 0.4, Math.min(maxHeight, panelPosition - translationY));
    panelHeight.setValue(newHeight);
  };

  interface PanHandlerStateChangeEvent {
    nativeEvent: {
      oldState: number;
      translationY: number;
    };
  }

  const onPanHandlerStateChange = (event: PanHandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === 4) {
      const { translationY } = event.nativeEvent;
      const currentHeight = panelPosition - translationY;
      const targetHeight = currentHeight > height * 0.6 ? height * 0.8 : height * 0.4;
      
      setPanelPosition(targetHeight);
      Animated.spring(panelHeight, {
        toValue: targetHeight,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const renderBottomPanel = () => (
    <PanGestureHandler
      onGestureEvent={onPanGestureEvent}
      onHandlerStateChange={onPanHandlerStateChange}
    >
      <Animated.View style={[styles.bottomPanel, { height: panelHeight, backgroundColor: colors.background }]}>
        <View style={styles.handle} />
        
        <ScrollView style={styles.panelContent} showsVerticalScrollIndicator={false}>
          <View style={styles.dashboardHeader}>
            <Text style={[styles.dashboardTitle, { color: isCancelled ? '#DC2626' : getThemeColor() }]}>
              {isCancelled ? '❌ Booking Cancelled' : `🚑 ${bookingData.booking_type} Tracking`}
            </Text>
            {!isCancelled && (
              <TouchableOpacity onPress={handleCancelBooking}>
                <Text style={[styles.cancelText, { color: '#DC2626' }]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Hospital & Driver Hybrid Card */}
          <View style={[styles.hybridCard, { backgroundColor: colors.surface }]}>
            <View style={styles.hospitalSection}>
              <View style={styles.hospitalIcon}>
                <Text style={styles.hospitalIconText}>🏥</Text>
              </View>
              <View style={styles.hospitalDetails}>
                <Text style={[styles.hospitalName, { color: colors.text }]}>{bookingData.destination}</Text>
                <Text style={[styles.hospitalDistance, { color: colors.textSecondary }]}>Pickup: {bookingData.pickup_location}</Text>
              </View>
            </View>
            
            {isAssigned && (
              <>
                <View style={styles.divider} />
                <View style={styles.driverSection}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverAvatarText}>👨⚕️</Text>
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={[styles.driverName, { color: colors.text }]}>{assignedDriver?.driver_name || 'Driver Assigned'}</Text>
                    <Text style={[styles.vehicleNumber, { color: '#059669' }]}>{assignedDriver?.vehicle_number || 'AMB-001'}</Text>
                    <Text style={[styles.etaText, { color: '#DC2626' }]}>ETA: 8-12 min</Text>
                  </View>
                  <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.quickCallButton}>
                      <Text style={styles.quickCallText}>📞</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickChatButton}>
                      <Text style={styles.quickChatText}>💬</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
          
          {/* Status Tracker */}
          <View style={[styles.statusTracker, { backgroundColor: colors.surface }]}>
            <View style={styles.statusHeader}>
              <Text style={[styles.statusTitle, { color: colors.text }]}>Ambulance Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: isCancelled ? '#DC2626' : isAssigned ? '#10B981' : '#F59E0B' }]}>
                <Text style={styles.statusBadgeText}>
                  {isCancelled ? '❌ Cancelled' : isAssigned ? '🚑 Assigned' : '⏳ Assigning'}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusSteps}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: '#10B981' }]} />
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Request Placed</Text>
                  <Text style={[styles.stepTime, { color: colors.textSecondary }]}>Just now</Text>
                </View>
              </View>
              
              <View style={[styles.stepLine, { backgroundColor: isAssigned ? '#10B981' : '#E5E7EB' }]} />
              
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: isAssigned ? '#10B981' : '#E5E7EB' }]} />
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: isAssigned ? colors.text : colors.textSecondary }]}>Ambulance Assigned</Text>
                  <Text style={[styles.stepTime, { color: colors.textSecondary }]}>
                    {isCancelled ? (cancelReason || 'Cancelled') : 
                     isAssigned ? 'Completed' : 
                     timeRemaining > 0 ? `${timeRemaining}s remaining` : 'Processing...'}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.stepLine, { backgroundColor: '#E5E7EB' }]} />
              
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: '#E5E7EB' }]} />
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: colors.textSecondary }]}>On the Way</Text>
                  <Text style={[styles.stepTime, { color: colors.textSecondary }]}>Pending</Text>
                </View>
              </View>
              
              <View style={[styles.stepLine, { backgroundColor: '#E5E7EB' }]} />
              
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: '#E5E7EB' }]} />
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: colors.textSecondary }]}>Arrived</Text>
                  <Text style={[styles.stepTime, { color: colors.textSecondary }]}>Pending</Text>
                </View>
              </View>
            </View>
          </View>
          

          
          {bookingData.emergency_type && (
            <View style={[styles.summaryContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Emergency Type:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{bookingData.emergency_type}</Text>
              </View>
              {bookingData.severity && (
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Severity:</Text>
                  <Text style={[styles.summaryValue, { color: getThemeColor() }]}>{bookingData.severity}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </PanGestureHandler>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={getThemeColor()} />
        
        {/* Header Bar */}
        <Animated.View style={[styles.headerBar, { backgroundColor: getThemeColor() }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>
            {bookingData.booking_type.toUpperCase()} TRACKING
          </Text>
          <View style={styles.placeholder} />
        </Animated.View>
        
        <MapViewComponent 
          webViewRef={webViewRef} 
          userLocation={userLocation}
          hospitalLocation={hospitalLocation}
          ambulanceLocation={ambulanceLocation ?? undefined}
          showHospitalMarker={true}
          showAmbulanceMarker={isAssigned}
          showUserMarker={true}
          showRoute={isAssigned}
        />

        {renderBottomPanel()}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#fff',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  placeholder: {
    width: 40,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1001,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  panelContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  // Hybrid Card Styles
  hybridCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  hospitalSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hospitalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hospitalIconText: {
    fontSize: 24,
  },
  hospitalDetails: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  hospitalDistance: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverDetails: {
    flex: 1,
    marginLeft: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCallText: {
    fontSize: 18,
  },
  quickChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickChatText: {
    fontSize: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  ambulanceStatus: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  etaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00aa00',
  },
  driverText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#00aa00',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  callText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chatButton: {
    flex: 1,
    backgroundColor: '#0066cc',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  summaryContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  
  // Status Tracker Styles
  statusTracker: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusSteps: {
    paddingLeft: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
    paddingVertical: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepTime: {
    fontSize: 14,
  },
  stepLine: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginRight: 16,
  },
  
  // Driver Card Styles
  driverCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverAvatarText: {
    fontSize: 24,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  driverActions: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default LiveTrackingScreen;