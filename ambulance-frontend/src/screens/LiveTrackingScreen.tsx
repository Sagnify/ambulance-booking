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
import API from '../../services/api';
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
  const webViewRef = useRef(null);
  
  const [booking, setBooking] = useState<{ booking_id: number } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isAssigned, setIsAssigned] = useState(false);
  const [ambulanceLocation, setAmbulanceLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  interface Driver {
    driver_name?: string;
    vehicle_number?: string;
    // add other fields as needed
  }
  const [assignedDriver, setAssignedDriver] = useState<Driver | null>(null);
  const [userLocation] = useState({ latitude: 22.4675, longitude: 88.3732 });
  const [hospitalLocation] = useState({ latitude: 22.4775, longitude: 88.3832 });
  const panelHeight = useRef(new Animated.Value(height * 0.4)).current;
  const [panelPosition, setPanelPosition] = useState(height * 0.4);

  useEffect(() => {
    createBooking();
    startLocationTracking();
    initializeWebRTC();
    
    // Cleanup location tracking when component unmounts
    return () => {
      LocationService.stopBookingTracking();
      if ((global as any).peerpyrtcClient) {
        (global as any).peerpyrtcClient.closeConnection();
      }
    };
  }, []);

  const initializeWebRTC = async () => {
    try {
      const { WebRTCConnection } = require('peerpyrtc-client');
      const userId = await AsyncStorage.getItem('userId');
      
      if (userId && bookingData.hospital_id) {
        const rtc = new WebRTCConnection(`hospital_${bookingData.hospital_id}`, {
          peerId: `user_${userId}`,
          debug: true
        });
        
        rtc.onOpen = () => {
          console.log('✅ LiveTracking WebRTC Connected');
        };
        
        rtc.onMessage = (senderId, message, event) => {
          console.log('📨 Received from hospital:', event, message);
          if (event === 'ambulance_assigned') {
            setIsAssigned(true);
            setAssignedDriver(message.driver);
          }
        };
        
        rtc.onError = (error) => {
          console.error('❌ LiveTracking WebRTC Error (non-blocking):', error);
        };
        
        await rtc.connect();
        (global as any).peerpyrtcClient = rtc;
      }
    } catch (error) {
      console.error('WebRTC initialization failed (non-blocking):', error);
      // Continue without WebRTC - app still works
    }
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
    if (!isAssigned && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Skip auto-assignment since manual assignment from hospital works
            console.log('Timer expired - waiting for manual assignment from hospital');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, isAssigned]);

  // Removed polling - using WebRTC for real-time updates

  const createBooking = async () => {
    console.log('Creating booking with data:', bookingData);
    
    try {
      const response = await API.post('/api/bookings', {
        ...bookingData,
        destination: bookingData.destination || bookingData.pickup_location
      });
      
      setBooking({ booking_id: response.data.booking_id });
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
      
      if (result.status === 'Assigned' && result.ambulance) {
        setIsAssigned(true);
        setAssignedDriver(result.ambulance);
        setAmbulanceLocation({
          latitude: userLocation.latitude + 0.01,
          longitude: userLocation.longitude + 0.01
        });
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
            <Text style={[styles.dashboardTitle, { color: getThemeColor() }]}>
              🚑 {bookingData.booking_type} Tracking
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
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
              <View style={[styles.statusBadge, { backgroundColor: isAssigned ? '#10B981' : '#F59E0B' }]}>
                <Text style={styles.statusBadgeText}>
                  {isAssigned ? '🚑 Assigned' : '⏳ Assigning'}
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
                    {isAssigned ? 'Completed' : timeRemaining > 0 ? `${timeRemaining}s remaining` : 'Processing...'}
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