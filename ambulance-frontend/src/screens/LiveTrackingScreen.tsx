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

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://ambulance-booking-roan.vercel.app/api';

const LiveTrackingScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookingData } = route.params;
  const { colors } = useTheme();
  const webViewRef = useRef(null);
  
  const [booking, setBooking] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isAssigned, setIsAssigned] = useState(false);
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [userLocation] = useState({ latitude: 22.4675, longitude: 88.3732 });
  const [hospitalLocation] = useState({ latitude: 22.4775, longitude: 88.3832 });
  const panelHeight = useRef(new Animated.Value(height * 0.4)).current;
  const [panelPosition, setPanelPosition] = useState(height * 0.4);

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
    console.log('Creating booking with data:', bookingData);
    
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bookingData,
          destination: bookingData.destination || bookingData.pickup_location
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setBooking({ booking_id: result.booking_id });
      } else {
        const errorText = await response.text();
        console.error('Booking API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Booking creation failed:', error);
      Alert.alert('Error', 'Backend not available. Please try again later.');
    }
  };

  const checkBookingStatus = async () => {
    if (!booking) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.booking_id}/status`);
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'Assigned' && result.ambulance) {
          setIsAssigned(true);
          setAssignedDriver(result.ambulance);
          setAmbulanceLocation({
            latitude: userLocation.latitude + 0.01,
            longitude: userLocation.longitude + 0.01
          });
        }
      }
    } catch (error) {
      // Silently ignore API errors for demo
    }
  };

  const autoAssignAmbulance = async () => {
    if (!booking || isAssigned) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/bookings/${booking.booking_id}/auto-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.driver) {
          setIsAssigned(true);
          setAssignedDriver(result.driver);
          setAmbulanceLocation({
            latitude: userLocation.latitude + 0.01,
            longitude: userLocation.longitude + 0.01
          });
        }
      } else {
        console.error('Auto-assignment failed:', response.status);
      }
    } catch (error) {
      console.error('Auto-assignment API error:', error);
    }
  };

  const getThemeColor = () => {
    switch (bookingData.booking_type) {
      case 'Emergency': return '#ff0000';
      case 'Accident': return '#ff6600';
      default: return '#0066cc';
    }
  };

  const onPanGestureEvent = (event) => {
    const { translationY } = event.nativeEvent;
    const maxHeight = height * 0.8;
    const newHeight = Math.max(height * 0.4, Math.min(maxHeight, panelPosition - translationY));
    panelHeight.setValue(newHeight);
  };

  const onPanHandlerStateChange = (event) => {
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
          
          <View style={[styles.hospitalInfo, { backgroundColor: colors.surface }]}>
            <Text style={[styles.hospitalLabel, { color: colors.textSecondary }]}>Hospital:</Text>
            <Text style={[styles.hospitalName, { color: colors.text }]}>{bookingData.destination}</Text>
            <Text style={[styles.hospitalDistance, { color: colors.textSecondary }]}>Pickup: {bookingData.pickup_location}</Text>
          </View>
          
          {!isAssigned ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingTitle, { color: getThemeColor() }]}>
                Assigning Ambulance...
              </Text>
              <View style={styles.loadingSpinner}>
                <Text style={[styles.timerText, { color: getThemeColor() }]}>{timeRemaining}</Text>
              </View>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {timeRemaining > 0 ? 
                  'Hospital is selecting an ambulance for you' : 
                  'Auto-assigning nearest available ambulance...'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.ambulanceStatus}>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Driver:</Text>
                <Text style={[styles.driverText, { color: colors.text }]}>{assignedDriver?.driver_name || 'Assigned'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Vehicle:</Text>
                <Text style={[styles.driverText, { color: colors.text }]}>{assignedDriver?.vehicle_number || 'AMB-001'}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>ETA:</Text>
                <Text style={styles.etaText}>8-12 min</Text>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.callButton}>
                  <Text style={styles.callText}>📞 Call Driver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatButton}>
                  <Text style={styles.chatText}>💬 Live Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
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
          ambulanceLocation={ambulanceLocation}
          showHospitalMarker={true}
          showAmbulanceMarker={isAssigned}
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
  hospitalInfo: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  hospitalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  hospitalDistance: {
    fontSize: 14,
    color: '#666',
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
});

export default LiveTrackingScreen;