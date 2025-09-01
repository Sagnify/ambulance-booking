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
  TextInput,
  Keyboard 
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import LocationSnapButton from '../components/LocationSnapButton';
import TopNavigation from '../components/TopNavigation';
import MapViewComponent from '../components/MapView';
import ServiceCard from '../components/ServiceCard';
import EmergencyModal from '../components/EmergencyModal';
import SlideToBook from '../components/SlideToBook';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import API from '../../services/api';
import { useNavigation } from '@react-navigation/native';


const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const { logout, userId, userToken } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation();
  const [address, setAddress] = useState('Fetching location...');
  const [userLocation, setUserLocation] = useState({ 
    latitude: 22.4675, 
    longitude: 88.3732 
  });
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<'emergency' | 'accident' | null>(null);
  // Removed unused sheetRef for BottomSheet
  const panelHeight = useRef(new Animated.Value(height * 0.5)).current;
  const [panelPosition, setPanelPosition] = useState(height * 0.5);

  const [hospitalSearch, setHospitalSearch] = useState('');
  const [filteredHospitals, setFilteredHospitals] = useState<any[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [userName, setUserName] = useState('User');
  const [cachedLocation, setCachedLocation] = useState<{latitude: number, longitude: number, timestamp: number} | null>(null);
  const webViewRef = useRef<any>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [showEmergencyDashboard, setShowEmergencyDashboard] = useState(false);
  const [emergencyData, setEmergencyData] = useState({
    condition: '',
    severity: '',
    instructions: ''
  });
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);
  const [showHospitalSelection, setShowHospitalSelection] = useState(false);
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<{name: string, distance: string, eta: string, lat: number, lng: number} | null>(null);
  const [ambulanceETA, setAmbulanceETA] = useState('8-12 min');
  const [hospitalData, setHospitalData] = useState<any[]>([]);
  const [ambulanceData, setAmbulanceData] = useState<any[]>([]);
  const [searchRadius, setSearchRadius] = useState(5);
  const [showRadiusControl, setShowRadiusControl] = useState(false);
  const [selectedHospitalForBooking, setSelectedHospitalForBooking] = useState<any>(null);
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [bookingHospitalData, setBookingHospitalData] = useState<any>(null);


  // Get user location and nearby services
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setAddress('Location permission denied');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ 
          accuracy: Location.Accuracy.High
        });
        const { latitude, longitude } = loc.coords;

        setUserLocation({ latitude, longitude });

        // Reverse geocoding
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });

        if (reverseGeocode.length > 0) {
          const location = reverseGeocode[0];
          const readableAddress = `${location.street || ''} ${location.city || ''}, ${location.region || ''}`.trim();
          setAddress(readableAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        
        // Fetch nearby hospitals and ambulances
        await fetchNearbyServices(latitude, longitude, searchRadius);
      } catch (error) {
        console.error('Location error:', error);
        setAddress('Current location');
      }
    };

    getLocation();
  }, []);
  
  // Fetch nearby hospitals and ambulances from API
  const fetchNearbyServices = async (lat: number, lng: number, radius: number = searchRadius) => {
    try {
      // Try to fetch from API - replace with actual endpoints
      const [hospitalsResponse, ambulancesResponse] = await Promise.allSettled([
        API.get(`/api/hospitals/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
        API.get(`/api/ambulances/nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
      ]);
      
      // Set hospital data if API succeeds
      if (hospitalsResponse.status === 'fulfilled' && hospitalsResponse.value.data.hospitals) {
        setHospitalData(hospitalsResponse.value.data.hospitals);
        setFilteredHospitals(hospitalsResponse.value.data.hospitals);
      } else {
        setHospitalData([]);
        setFilteredHospitals([]);
      }
      
      // Set ambulance data if API succeeds
      if (ambulancesResponse.status === 'fulfilled' && ambulancesResponse.value.data.ambulances) {
        setAmbulanceData(ambulancesResponse.value.data.ambulances);
      } else {
        setAmbulanceData([]);
      }
    } catch (error) {
      console.log('API not available, no hospitals to show');
      setHospitalData([]);
      setFilteredHospitals([]);
      setAmbulanceData([]);
    }
  };
  
  const handleRadiusChange = async (newRadius: number) => {
    setSearchRadius(newRadius);
    await fetchNearbyServices(userLocation.latitude, userLocation.longitude, newRadius);
  };
  
  // Handle hospital search and map coordination
  const handleHospitalSearch = (searchText: string) => {
    setHospitalSearch(searchText);
    
    if (searchText.trim() === '') {
      setFilteredHospitals(hospitalData);
      // Show all hospitals on map
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ type: 'showNormalHospitals' }));
      }
    } else {
      const filtered = hospitalData.filter(hospital => 
        hospital.name.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredHospitals(filtered);
      
      // Update map to show only filtered hospitals
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ 
          type: 'showFilteredHospitals', 
          hospitals: filtered 
        }));
      }
    }
  };
  
  // Handle hospital selection from list
  const handleHospitalSelect = (hospital: any) => {
    // Center map on selected hospital
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ 
        type: 'centerOnHospital', 
        hospital: hospital 
      }));
    }
    // Show slide to book for selected hospital (no panel adjustment)
    setSelectedHospitalForBooking(hospital);
  };
  
  // Handle slide to book completion
  const handleSlideToBookComplete = () => {
    setBookingHospitalData(selectedHospitalForBooking); // Store hospital data
    setSelectedHospitalForBooking(null); // Hide slider
    setShowBookingConfirmation(true);
    
    setPanelPosition(height * 0.45);
    Animated.spring(panelHeight, {
      toValue: height * 0.45,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };
  
  // Handle booking cancellation
  const handleBookingCancel = () => {
    setShowBookingConfirmation(false);
    setBookingHospitalData(null);
    setSelectedHospitalForBooking(null);
    
    setPanelPosition(height * 0.5);
    Animated.spring(panelHeight, {
      toValue: height * 0.5,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Get user data
  useEffect(() => {
    const getUserData = async () => {
      if (!userId || !userToken) {
        console.log('No user ID or token available');
        return;
      }
      
      try {
        const response = await API.get(`/api/auth/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        });
        if (response.data.user) {
          setUserName(response.data.user.name || 'User');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to generic name if API fails
        setUserName('User');
      }
    };
    getUserData();
  }, [userId, userToken]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Raise panel when keyboard is shown
      const newHeight = height - e.endCoordinates.height + 50;
      setPanelPosition(newHeight);
      Animated.spring(panelHeight, {
        toValue: newHeight,
        useNativeDriver: false,
        tension: 80,
        friction: 10,
      }).start();
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      // Return to normal panel height when keyboard is hidden
      const newHeight = height * 0.5;
      setPanelPosition(newHeight);
      Animated.spring(panelHeight, {
        toValue: newHeight,
        useNativeDriver: false,
        tension: 80,
        friction: 10,
      }).start();
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleServiceSelect = (service: 'emergency' | 'accident') => {
    setSelectedService(service);
    if (service === 'emergency') {
      setShowEmergencyModal(true);
    }
    console.log('Selected service:', service);
  };

  const handleEmergencyConfirm = () => {
    // Dismiss keyboard to prevent blinking
    Keyboard.dismiss();
    setShowEmergencyModal(false);
    setShowEmergencyForm(true);
    setPanelPosition(height * 0.6);
    Animated.spring(panelHeight, {
      toValue: height * 0.6,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleEmergencySubmit = () => {
    setShowEmergencyForm(false);
    setShowHospitalSelection(true);
    
    // Pan down to show more map during hospital selection
    setPanelPosition(height * 0.5);
    Animated.spring(panelHeight, {
      toValue: height * 0.5,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    
    // Find nearest hospital from API data
    setTimeout(() => {
      let nearestHospital;
      
      if (hospitalData.length > 0) {
        // Use nearest hospital from API (already sorted by distance)
        const apiHospital = hospitalData[0];
        // Calculate ETA based on distance (assuming 30 km/h average speed in city)
        const distanceKm = parseFloat(apiHospital.distance);
        const etaMinutes = Math.round((distanceKm / 30) * 60) + 3; // +3 min for dispatch
        const etaRange = `${etaMinutes}-${etaMinutes + 4}`;
        
        nearestHospital = {
          name: apiHospital.name,
          distance: apiHospital.distance,
          eta: etaRange + ' min',
          lat: apiHospital.latitude,
          lng: apiHospital.longitude
        };
      } else {
        // Fallback if no API data
        nearestHospital = {
          name: 'Emergency Services',
          distance: 'Unknown',
          eta: '10-15 min',
          lat: userLocation.latitude + 0.01,
          lng: userLocation.longitude + 0.01
        };
      }
      
      setSelectedHospital(nearestHospital);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'showEmergencyHospital',
          hospital: nearestHospital
        }));
      }
      setShowHospitalSelection(false);
      setShowFinalConfirmation(true);
      
      // Pan down to show map with selected hospital
      setPanelPosition(height * 0.38);
      Animated.spring(panelHeight, {
        toValue: height * 0.38,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    }, 2000);
  };

  const handleFinalConfirm = () => {
    setShowFinalConfirmation(false);
    setShowEmergencyDashboard(true);
    setPanelPosition(height * 0.5);
    Animated.spring(panelHeight, {
      toValue: height * 0.5,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    // Route is already shown when hospital was selected
  };

  const conditions = [
    'Heart Attack', 'Stroke', 'Breathing Problems', 'Chest Pain', 
    'Severe Injury', 'Unconscious', 'Severe Bleeding', 'Other'
  ];

  const handleEmergencyCancel = () => {
    setShowEmergencyModal(false);
    setShowEmergencyForm(false);
    setShowEmergencyDashboard(false);
    setShowHospitalSelection(false);
    setShowFinalConfirmation(false);
    setSelectedService(null);
    setSelectedHospital(null);
    setEmergencyData({ condition: '', severity: '', instructions: '' });
    
    // Return to initial panel height
    setPanelPosition(height * 0.5);
    Animated.spring(panelHeight, {
      toValue: height * 0.5,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    
    // Revert map to normal mode
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({ type: 'showNormalHospitals' }));
    }
  };



  const handleLogout = () => {
    setProfileMenuVisible(false);
    logout();
  };

  const snapToCurrentLocation = () => {
    console.log('Snap button pressed!');
    if (webViewRef.current) {
      webViewRef.current.postMessage('centerOnUser');
    }
  };

  const onPanGestureEvent = (event: any) => {
    const { translationY } = event.nativeEvent;
    const maxHeight = height * 0.8;
    const newHeight = Math.max(height * 0.5, Math.min(maxHeight, panelPosition - translationY));
    panelHeight.setValue(newHeight);
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === 4) {
      const { translationY } = event.nativeEvent;
      const currentHeight = panelPosition - translationY;
      
      let targetHeight;
      if (keyboardHeight > 0) {
        // When keyboard is active, maintain raised position
        targetHeight = height - keyboardHeight + 50;
      } else {
        targetHeight = currentHeight > height * 0.6 ? height * 0.8 : height * 0.5;
      }
      
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
        {showHospitalSelection ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>Finding Nearest Hospital...</Text>
            <View style={styles.loadingSpinner}>
              <Text style={styles.spinnerText}>🏥</Text>
            </View>
            <Text style={styles.loadingText}>Searching for the best available hospital</Text>
          </View>
        ) : showFinalConfirmation ? (
          <View>
            <View style={styles.confirmationHeader}>
              <Text style={styles.confirmationTitle}>Confirm Emergency Dispatch</Text>
            </View>
            
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Condition:</Text>
                <Text style={styles.summaryValue}>{emergencyData.condition}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Severity:</Text>
                <Text style={[styles.summaryValue, styles.severityValue]}>{emergencyData.severity}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Hospital:</Text>
                <Text style={styles.summaryValue}>{selectedHospital?.name}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Distance:</Text>
                <Text style={styles.summaryValue}>{selectedHospital?.distance}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>ETA:</Text>
                <Text style={styles.summaryValue}>{selectedHospital?.eta}</Text>
              </View>
            </View>
            
            <View style={styles.finalButtons}>
              <TouchableOpacity style={styles.backToFormButton} onPress={() => {
                setShowFinalConfirmation(false);
                setShowEmergencyForm(true);
                setPanelPosition(height * 0.6);
                Animated.spring(panelHeight, {
                  toValue: height * 0.6,
                  useNativeDriver: false,
                  tension: 100,
                  friction: 8,
                }).start();
              }}>
                <Text style={styles.backToFormText}>‹ Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.finalConfirmButton} onPress={handleFinalConfirm}>
                <Text style={styles.finalConfirmText}>🚨 BOOK AMBULANCE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showEmergencyForm ? (
          <View>
            <View style={styles.emergencyHeader}>
              <TouchableOpacity onPress={() => {
                handleEmergencyCancel();
              }} style={styles.backButton}>
                <Text style={styles.backIcon}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.emergencyTitle}>Emergency Details</Text>
            </View>
            
            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Severity Level *</Text>
              <View style={styles.severityButtons}>
                <TouchableOpacity 
                  style={[styles.severityBtn, emergencyData.severity === 'Critical' && styles.selectedSeverity]}
                  onPress={() => setEmergencyData({...emergencyData, severity: 'Critical'})}
                >
                  <Text style={[styles.severityText, emergencyData.severity === 'Critical' && styles.selectedSeverityText]}>Critical</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.severityBtn, emergencyData.severity === 'Urgent' && styles.selectedSeverity]}
                  onPress={() => setEmergencyData({...emergencyData, severity: 'Urgent'})}
                >
                  <Text style={[styles.severityText, emergencyData.severity === 'Urgent' && styles.selectedSeverityText]}>Urgent</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.severityBtn, emergencyData.severity === 'Moderate' && styles.selectedSeverity]}
                  onPress={() => setEmergencyData({...emergencyData, severity: 'Moderate'})}
                >
                  <Text style={[styles.severityText, emergencyData.severity === 'Moderate' && styles.selectedSeverityText]}>Moderate</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.formLabel}>Visible Symptoms *</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity 
                  style={styles.dropdown} 
                  onPress={() => {
                    const newDropdownState = !showConditionDropdown;
                    setShowConditionDropdown(newDropdownState);
                    
                    if (newDropdownState) {
                      // Expand panel fully when dropdown opens
                      const targetHeight = height * 0.95;
                      setPanelPosition(targetHeight);
                      Animated.spring(panelHeight, {
                        toValue: targetHeight,
                        useNativeDriver: false,
                        tension: 100,
                        friction: 8,
                      }).start();
                    }
                  }}
                >
                  <Text style={[styles.dropdownText, emergencyData.condition && styles.selectedText]}>
                    {emergencyData.condition || 'Select symptoms...'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                
                {showConditionDropdown && (
                  <View style={styles.dropdownList}>
                    {conditions.map((condition, index) => (
                      <TouchableOpacity 
                        key={index}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setEmergencyData({...emergencyData, condition});
                          setShowConditionDropdown(false);
                          
                          // Normalize panel when option is selected
                          const targetHeight = height * 0.6;
                          setPanelPosition(targetHeight);
                          Animated.spring(panelHeight, {
                            toValue: targetHeight,
                            useNativeDriver: false,
                            tension: 100,
                            friction: 8,
                          }).start();
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{condition}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={[styles.dispatchButton, (!emergencyData.condition || !emergencyData.severity) && styles.disabledButton]} 
                onPress={handleEmergencySubmit}
                disabled={!emergencyData.condition || !emergencyData.severity}
              >
                <Text style={styles.dispatchText}>CONTINUE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showEmergencyDashboard ? (
          <View>
            <View style={styles.dashboardHeader}>
              <Text style={styles.dashboardTitle}>🚨 Emergency Active</Text>
              <TouchableOpacity onPress={() => {
                handleEmergencyCancel();
              }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalLabel}>Dispatched to:</Text>
              <Text style={styles.hospitalName}>City General Hospital</Text>
              <Text style={styles.hospitalDistance}>2.3 km away</Text>
            </View>
            
            <View style={styles.ambulanceStatus}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Ambulance ETA:</Text>
                <Text style={styles.etaText}>{ambulanceETA}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Driver:</Text>
                <Text style={styles.driverText}>Rajesh Kumar</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Vehicle:</Text>
                <Text style={styles.vehicleText}>DL-01-AB-1234</Text>
              </View>
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

        ) : showBookingConfirmation ? (
          <View style={styles.bookingConfirmationContainer}>
            <View style={styles.bookingHeader}>
              <TouchableOpacity onPress={handleBookingCancel} style={styles.backButton}>
                <Text style={styles.backIcon}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.bookingTitle}>Book Ambulance</Text>
            </View>
            
            <View style={styles.hospitalCard}>
              <Text style={styles.hospitalCardName}>{bookingHospitalData?.name}</Text>
              <Text style={styles.hospitalCardDistance}>{bookingHospitalData?.distance} km</Text>
            </View>
            
            <View style={styles.ambulanceCard}>
              <View style={styles.ambulanceRow}>
                <Text style={styles.ambulanceLabel}>Status</Text>
                <Text style={styles.ambulanceValue}>Available</Text>
              </View>
              <View style={styles.ambulanceRow}>
                <Text style={styles.ambulanceLabel}>ETA</Text>
                <Text style={styles.ambulanceValue}>8-12 min</Text>
              </View>
              <View style={styles.ambulanceRow}>
                <Text style={styles.ambulanceLabel}>Driver</Text>
                <Text style={styles.ambulanceValue}>Rajesh Kumar</Text>
              </View>
            </View>
            
            <View style={styles.bookingButtonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleBookingCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Find Hospitals</Text>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="Search hospitals nearby..."
                placeholderTextColor={colors.textSecondary}
                value={hospitalSearch}
                onChangeText={handleHospitalSearch}
              />
              <TouchableOpacity 
                style={[styles.radiusSelector, { backgroundColor: colors.surface }]}
                onPress={() => setShowRadiusControl(!showRadiusControl)}
              >
                <Text style={[styles.radiusText, { color: colors.text }]}>{searchRadius}km</Text>
                <Text style={[styles.radiusArrow, { color: colors.textSecondary }]}>▼</Text>
              </TouchableOpacity>
            </View>
            
            {/* Radius Options */}
            {showRadiusControl && (
              <View style={styles.radiusOptions}>
                {[2, 5, 10, 15, 20].map((radius) => (
                  <TouchableOpacity
                    key={radius}
                    style={[styles.radiusOption, { backgroundColor: searchRadius === radius ? colors.primary : colors.surface }, searchRadius === radius && styles.selectedRadiusOption]}
                    onPress={() => {
                      handleRadiusChange(radius);
                      setShowRadiusControl(false);
                    }}
                  >
                    <Text style={[styles.radiusOptionText, { color: searchRadius === radius ? (isDarkMode ? colors.background : '#fff') : colors.textSecondary }, searchRadius === radius && styles.selectedRadiusOptionText]}>
                      {radius}km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Emergency Services */}
            <View style={styles.emergencyButtons}>
              <TouchableOpacity 
                style={[styles.emergencyBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleServiceSelect('emergency')}
              >
                <Text style={[styles.emergencyBtnText, { color: '#fff' }]}>🚨 Emergency</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.emergencyBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleServiceSelect('accident')}
              >
                <Text style={[styles.emergencyBtnText, { color: '#fff' }]}>🚑 Accident</Text>
              </TouchableOpacity>
            </View>
            
            {/* Hospital List */}
            <ScrollView style={styles.hospitalList} showsVerticalScrollIndicator={false}>
              {filteredHospitals.length > 0 ? (
                filteredHospitals.map((hospital, index) => (
                  <TouchableOpacity 
                    key={hospital.id || index} 
                    style={[
                      styles.hospitalItem,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedHospitalForBooking?.id === hospital.id && { borderColor: colors.primary, backgroundColor: colors.surface }
                    ]}
                    onPress={() => handleHospitalSelect(hospital)}
                  >
                    <View style={styles.hospitalHeader}>
                      <Text style={[styles.hospitalName, { color: colors.text }]}>{hospital.name}</Text>
                      <Text style={[styles.hospitalDistance, { color: colors.textSecondary }]}>{hospital.distance} km</Text>
                    </View>
                    <Text style={[styles.hospitalType, { color: '#007AFF' }]}>{hospital.type}</Text>
                    <Text style={[styles.hospitalServices, { color: colors.textSecondary }]}>Emergency: {hospital.emergency_services ? 'Available' : 'Not Available'}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.noHospitalsText, { color: colors.textSecondary }]}>No hospitals found in {searchRadius}km radius</Text>
              )}
            </ScrollView>
          </View>
        )}
      </ScrollView>
      </Animated.View>
    </PanGestureHandler>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <MapViewComponent 
        webViewRef={webViewRef} 
        userLocation={userLocation}
        mapMode={showEmergencyDashboard || showFinalConfirmation ? 'emergency' : 'normal'}
        selectedHospital={selectedHospital}
        hospitalData={hospitalData}
        ambulanceData={ambulanceData}
      />

      {/* Location Snap Button */}
      <LocationSnapButton onPress={snapToCurrentLocation} />
      
      <TopNavigation 
        userName={userName}
        address={address}
        profileMenuVisible={profileMenuVisible}
        onProfilePress={() => setProfileMenuVisible(!profileMenuVisible)}
        onLogout={handleLogout}
      />

      {renderBottomPanel()}
      
      {/* Floating Slide to Book - Only on initial hospital list page */}
      {selectedHospitalForBooking && !showBookingConfirmation && 
       !showEmergencyForm && !showEmergencyDashboard && !showHospitalSelection && !showFinalConfirmation && (
        <SlideToBook 
          hospitalName={selectedHospitalForBooking.name}
          onSlideComplete={handleSlideToBookComplete}
        />
      )}
      
      <EmergencyModal
        visible={showEmergencyModal}
        onCancel={handleEmergencyCancel}
        onConfirm={handleEmergencyConfirm}
      />
    </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#fff',
  },
  bottomSheetContent: {
    flex: 1,
    backgroundColor: '#fff',
  },



  // Bottom Panel (Fixed)
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Safe area
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
  panelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 20,
  },



  // Selected Content
  selectedContent: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  selectedDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Common Styles
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  radiusSelector: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  radiusArrow: {
    fontSize: 10,
    color: '#666',
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  radiusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  selectedRadiusOption: {
    backgroundColor: '#000',
  },
  radiusOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  selectedRadiusOptionText: {
    color: '#fff',
  },
  hospitalList: {
    flex: 1,
    paddingVertical: 8,
  },
  hospitalItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 12,
  },
  selectedHospitalItem: {
    borderColor: '#000',
    borderWidth: 2,
    backgroundColor: '#f8f8f8',
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
  hospitalType: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hospitalServices: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  emergencyButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  emergencyBtn: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emergencyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  noHospitalsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },



  // Emergency Form
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff0000',
  },
  formContainer: {
    gap: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#666',
  },
  selectedText: {
    color: '#000',
    fontWeight: '600',
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
    marginBottom: 20,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#000',
  },
  selectedSeverity: {
    backgroundColor: '#fff',
    borderColor: '#000',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: '#f8f8f8',
  },
  severityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedSeverityText: {
    color: '#000',
  },
  dispatchButton: {
    backgroundColor: '#ff0000',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  dispatchText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // Emergency Dashboard
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff0000',
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
  vehicleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
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

  // Hospital Selection Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff0000',
    marginBottom: 20,
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  spinnerText: {
    fontSize: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Final Confirmation
  confirmationHeader: {
    marginBottom: 20,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff0000',
    textAlign: 'center',
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
  severityValue: {
    color: '#ff0000',
  },
  finalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  backToFormButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backToFormText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  finalConfirmButton: {
    flex: 2,
    backgroundColor: '#ff0000',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  finalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  
  // Booking Confirmation Styles
  bookingConfirmationContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  hospitalCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  hospitalCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  hospitalCardDistance: {
    fontSize: 14,
    color: '#666',
  },
  ambulanceCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  ambulanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ambulanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  ambulanceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  bookingButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },



});

export default HomeScreen;