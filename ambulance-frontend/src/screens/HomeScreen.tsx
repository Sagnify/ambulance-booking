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
  Keyboard 
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import LocationSnapButton from '../components/LocationSnapButton';
import TopNavigation from '../components/TopNavigation';
import MapViewComponent from '../components/MapView';
import EmergencyModal from '../components/EmergencyModal';
import SlideToBook from '../components/SlideToBook';
import HospitalSearch from '../components/HospitalSearch';
import EmergencyButtons from '../components/EmergencyButtons';
import HospitalList from '../components/HospitalList';
import EmergencyForm from '../components/EmergencyForm';
import AccidentForm from '../components/AccidentForm';
import LoadingScreen from './LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import API from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import LocationService from '../../services/locationService';


const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const { logout } = useAuth();
  const { isDarkMode, colors } = useTheme();
  const navigation = useNavigation<any>();
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
  const [userPhone, setUserPhone] = useState('+91-9876543210');
  const [cachedLocation, setCachedLocation] = useState<{latitude: number, longitude: number, timestamp: number} | null>(null);
  const webViewRef = useRef<any>(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [showEmergencyDashboard, setShowEmergencyDashboard] = useState(false);
  const [showAccidentForm, setShowAccidentForm] = useState(false);
  const [emergencyData, setEmergencyData] = useState({
    condition: '',
    severity: '',
    instructions: ''
  });
  const [accidentData, setAccidentData] = useState({
    type: '',
    peopleInvolved: '',
    injuriesVisible: '',
    policeRequired: false,
    towRequired: false
  });
  const [showConditionDropdown, setShowConditionDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showHospitalSelection, setShowHospitalSelection] = useState(false);
  const [showAccidentHospitalSelection, setShowAccidentHospitalSelection] = useState(false);
  const [showFinalConfirmation, setShowFinalConfirmation] = useState(false);
  const [showAccidentConfirmation, setShowAccidentConfirmation] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<{id: number, name: string, distance: string, eta: string, lat: number, lng: number} | null>(null);
  const [ambulanceETA, setAmbulanceETA] = useState('8-12 min');
  const [hospitalData, setHospitalData] = useState<any[]>([]);
  const [ambulanceData, setAmbulanceData] = useState<any[]>([]);
  const [searchRadius, setSearchRadius] = useState(5);
  const [showRadiusControl, setShowRadiusControl] = useState(false);
  const [selectedHospitalForBooking, setSelectedHospitalForBooking] = useState<any>(null);
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [bookingHospitalData, setBookingHospitalData] = useState<any>(null);
  const emergencyPulse = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(true);


  // Handle loading completion
  const handleLoadingComplete = async (fetchedAddress: string, location: { latitude: number; longitude: number }) => {
    setAddress(fetchedAddress);
    setUserLocation(location);
    
    // Fetch nearby hospitals using current location
    await fetchNearbyServices(location.latitude, location.longitude, searchRadius);
    
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  // Get current location for nearby hospitals (one-time request)
  const updateLocationForHospitals = async () => {
    const location = await LocationService.getCurrentLocation();
    if (location) {
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
      setUserLocation(newLocation);
      await fetchNearbyServices(newLocation.latitude, newLocation.longitude, searchRadius);
    }
  };
  
  // Fetch nearby hospitals and ambulances from API
  const fetchNearbyServices = async (lat: number, lng: number, radius: number = searchRadius) => {
    try {
      console.log(`Fetching hospitals near ${lat}, ${lng} within ${radius}km`);
      
      // Fetch hospitals from API
      const hospitalsResponse = await fetch(
        `https://ambulance-booking-roan.vercel.app/api/hospitals/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
      );
      
      if (hospitalsResponse.ok) {
        const hospitalsData = await hospitalsResponse.json();
        console.log('Hospitals API response:', hospitalsData);
        
        if (hospitalsData.hospitals && Array.isArray(hospitalsData.hospitals)) {
          setHospitalData(hospitalsData.hospitals);
          setFilteredHospitals(hospitalsData.hospitals);
          console.log(`Found ${hospitalsData.hospitals.length} nearby hospitals`);
        } else {
          console.log('No hospitals found in response');
          setHospitalData([]);
          setFilteredHospitals([]);
        }
      } else {
        console.error('Hospitals API failed:', hospitalsResponse.status);
        setHospitalData([]);
        setFilteredHospitals([]);
      }
      
      // Set empty ambulance data for now (endpoint doesn't exist yet)
      setAmbulanceData([]);
      
    } catch (error) {
      console.error('Error fetching nearby services:', error);
      setHospitalData([]);
      setFilteredHospitals([]);
      setAmbulanceData([]);
    }
  };
  
  const handleRadiusChange = async (newRadius: number) => {
    setSearchRadius(newRadius);
    await fetchNearbyServices(userLocation.latitude, userLocation.longitude, newRadius);
  };
  
  // Handle hospital search - global search across all hospitals
  const handleHospitalSearch = async (searchText: string) => {
    setHospitalSearch(searchText);
    
    if (searchText.trim() === '') {
      // Show nearby hospitals when search is empty
      setFilteredHospitals(hospitalData);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ type: 'showNormalHospitals' }));
      }
    } else {
      // Global search - fetch all hospitals and filter
      try {
        const response = await fetch('https://ambulance-booking-roan.vercel.app/api/hospitals');
        if (response.ok) {
          const allHospitals = await response.json();
          const filtered = allHospitals.filter((hospital: any) => 
            hospital.name.toLowerCase().includes(searchText.toLowerCase()) ||
            hospital.address.toLowerCase().includes(searchText.toLowerCase())
          );
          
          // Calculate distance for global search results
          const hospitalsWithDistance = filtered.map((hospital: any) => {
            const distance = ((hospital.latitude - userLocation.latitude) ** 2 + 
                            (hospital.longitude - userLocation.longitude) ** 2) ** 0.5 * 111;
            return {
              ...hospital,
              distance: distance.toFixed(2)
            };
          });
          
          setFilteredHospitals(hospitalsWithDistance);
          
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({ 
              type: 'showFilteredHospitals', 
              hospitals: hospitalsWithDistance 
            }));
          }
        }
      } catch (error) {
        console.error('Global hospital search failed:', error);
        // Fallback to local search
        const filtered = hospitalData.filter(hospital => 
          hospital.name.toLowerCase().includes(searchText.toLowerCase())
        );
        setFilteredHospitals(filtered);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  // Get user name from auth context
  const { userName: authUserName, setUserData, userId: authUserId, userToken: authUserToken } = useAuth();
  
  useEffect(() => {
    console.log('Auth userName:', authUserName);
    // If no name in storage but we have user data, set a default name
    if (!authUserName && authUserId && authUserToken) {
      setUserData(authUserId, authUserToken, 'Sagnik Chakraborty');
      setUserName('Sagnik Chakraborty');
    } else {
      setUserName(authUserName || 'Sagnik Chakraborty');
    }
    setUserPhone('+91-9876543210');
  }, [authUserName, authUserId, authUserToken]);

  // Emergency/Accident pulse animation
  useEffect(() => {
    let pulseAnimation: any;
    
    if (showEmergencyForm || showEmergencyDashboard || showHospitalSelection || showFinalConfirmation || showAccidentForm || showAccidentConfirmation || showAccidentHospitalSelection) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(emergencyPulse, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(emergencyPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ]).start(() => pulse());
      };
      pulse();
    } else {
      emergencyPulse.setValue(1);
    }
    
    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [showEmergencyForm, showEmergencyDashboard, showHospitalSelection, showFinalConfirmation, showAccidentForm, showAccidentConfirmation, showAccidentHospitalSelection]);

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
    } else if (service === 'accident') {
      setShowAccidentForm(true);
      setPanelPosition(height * 0.7);
      Animated.spring(panelHeight, {
        toValue: height * 0.7,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
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
          id: apiHospital.id,
          name: apiHospital.name,
          distance: apiHospital.distance,
          eta: etaRange + ' min',
          lat: apiHospital.latitude,
          lng: apiHospital.longitude
        };
      } else {
        // Fallback if no API data
        nearestHospital = {
          id: 1,
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
      setPanelPosition(height * 0.45);
      Animated.spring(panelHeight, {
        toValue: height * 0.45,
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



  const handleAccidentSubmit = () => {
    setShowAccidentForm(false);
    setShowAccidentHospitalSelection(true);
    
    setPanelPosition(height * 0.5);
    Animated.spring(panelHeight, {
      toValue: height * 0.5,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
    
    // Find nearest trauma center for accidents
    setTimeout(() => {
      let nearestHospital;
      
      if (hospitalData.length > 0) {
        // Prioritize trauma centers for accidents
        const traumaCenters = hospitalData.filter(h => h.type?.toLowerCase().includes('trauma') || h.emergency_services);
        const targetHospital = traumaCenters.length > 0 ? traumaCenters[0] : hospitalData[0];
        
        const distanceKm = parseFloat(targetHospital.distance);
        const etaMinutes = Math.round((distanceKm / 35) * 60) + 5; // Slightly faster for accidents
        const etaRange = `${etaMinutes}-${etaMinutes + 3}`;
        
        nearestHospital = {
          id: targetHospital.id,
          name: targetHospital.name,
          distance: targetHospital.distance,
          eta: etaRange + ' min',
          lat: targetHospital.latitude,
          lng: targetHospital.longitude
        };
      } else {
        nearestHospital = {
          id: 1,
          name: 'Trauma Center',
          distance: 'Unknown',
          eta: '8-12 min',
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
      setShowAccidentHospitalSelection(false);
      setShowAccidentConfirmation(true);
      
      setPanelPosition(height * 0.45);
      Animated.spring(panelHeight, {
        toValue: height * 0.45,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    }, 2000);
  };

  const handleAccidentConfirm = () => {
    setShowAccidentConfirmation(false);
    setShowEmergencyDashboard(true);
    setPanelPosition(height * 0.5);
    Animated.spring(panelHeight, {
      toValue: height * 0.5,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Booking confirmation handlers
  const handleNormalBookingConfirm = () => {
    const bookingData = {
      hospital_id: bookingHospitalData?.id || 1,
      pickup_location: address,
      pickup_latitude: userLocation.latitude,
      pickup_longitude: userLocation.longitude,
      destination: bookingHospitalData?.name,
      booking_type: 'Normal',
      patient_name: userName,
      patient_phone: userPhone
    };
    
    navigation.navigate('LiveTracking', { bookingData });
  };

  const handleEmergencyBookingConfirm = () => {
    const bookingData = {
      hospital_id: selectedHospital?.id || 1,
      pickup_location: address,
      pickup_latitude: userLocation.latitude,
      pickup_longitude: userLocation.longitude,
      destination: selectedHospital?.name,
      booking_type: 'Emergency',
      emergency_type: emergencyData.condition,
      severity: emergencyData.severity,
      patient_name: userName,
      patient_phone: userPhone
    };
    
    navigation.navigate('LiveTracking', { bookingData });
  };

  const handleAccidentBookingConfirm = () => {
    const bookingData = {
      hospital_id: selectedHospital?.id || 1,
      pickup_location: address,
      pickup_latitude: userLocation.latitude,
      pickup_longitude: userLocation.longitude,
      destination: selectedHospital?.name,
      booking_type: 'Accident',
      severity: accidentData.injuriesVisible,
      accident_details: {
        type: accidentData.type,
        peopleInvolved: accidentData.peopleInvolved,
        injuriesVisible: accidentData.injuriesVisible,
        policeRequired: accidentData.policeRequired,
        towRequired: accidentData.towRequired
      },
      patient_name: userName,
      patient_phone: userPhone
    };
    
    navigation.navigate('LiveTracking', { bookingData });
  };

  const handleEmergencyCancel = () => {
    setShowEmergencyModal(false);
    setShowEmergencyForm(false);
    setShowEmergencyDashboard(false);
    setShowAccidentForm(false);
    setShowHospitalSelection(false);
    setShowAccidentHospitalSelection(false);
    setShowFinalConfirmation(false);
    setShowAccidentConfirmation(false);
    setSelectedService(null);
    setSelectedHospital(null);
    setEmergencyData({ condition: '', severity: '', instructions: '' });
    setAccidentData({ type: '', peopleInvolved: '', injuriesVisible: '', policeRequired: false, towRequired: false });
    
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

  const snapToCurrentLocation = async () => {
    console.log('Snap button pressed!');
    if (webViewRef.current) {
      webViewRef.current.postMessage('centerOnUser');
    }
    // Also update location for nearby hospitals
    await updateLocationForHospitals();
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
      } else if (showAccidentConfirmation || showFinalConfirmation) {
        // During confirmation, snap between 45% and 60%
        targetHeight = currentHeight > height * 0.525 ? height * 0.6 : height * 0.45;
      } else {
        // Normal behavior
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
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching for the best available hospital</Text>
          </View>
        ) : showAccidentHospitalSelection ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.accidentLoadingTitle}>Finding Nearest Trauma Center...</Text>
            <View style={styles.loadingSpinner}>
              <Text style={styles.spinnerText}>🚛</Text>
            </View>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Locating trauma center and dispatching response team</Text>
          </View>
        ) : showFinalConfirmation ? (
          <View>
            <View style={styles.confirmationHeader}>
              <Text style={styles.confirmationTitle}>Confirm Emergency Dispatch</Text>
            </View>
            
            <View style={[styles.summaryContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Condition:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{emergencyData.condition}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Severity:</Text>
                <Text style={[styles.summaryValue, styles.severityValue]}>{emergencyData.severity}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Hospital:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedHospital?.name}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Distance:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedHospital?.distance}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>ETA:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedHospital?.eta}</Text>
              </View>
            </View>
            
            <View style={styles.finalButtons}>
              <TouchableOpacity style={[styles.backToFormButton, { backgroundColor: colors.surface }]} onPress={() => {
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
                <Text style={[styles.backToFormText, { color: colors.textSecondary }]}>‹ Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.finalConfirmButton} onPress={handleEmergencyBookingConfirm}>
                <Text style={styles.finalConfirmText}>🚨 BOOK AMBULANCE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showEmergencyForm ? (
          <EmergencyForm
            emergencyData={emergencyData}
            onDataChange={setEmergencyData}
            showConditionDropdown={showConditionDropdown}
            onDropdownToggle={setShowConditionDropdown}
            onSubmit={handleEmergencySubmit}
            onCancel={handleEmergencyCancel}
            panelHeight={panelHeight}
            height={height}
          />
        ) : showAccidentForm ? (
          <AccidentForm
            accidentData={accidentData}
            onDataChange={setAccidentData}
            showTypeDropdown={showTypeDropdown}
            onDropdownToggle={setShowTypeDropdown}
            onSubmit={handleAccidentSubmit}
            onCancel={handleEmergencyCancel}
            panelHeight={panelHeight}
            height={height}
          />
        ) : showAccidentConfirmation ? (
          <View>
            <View style={styles.confirmationHeader}>
              <Text style={styles.accidentConfirmationTitle}>Confirm Accident Response</Text>
            </View>
            
            <View style={[styles.summaryContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Accident Type:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{accidentData.type}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>People Involved:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{accidentData.peopleInvolved}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Injuries:</Text>
                <Text style={[styles.summaryValue, styles.accidentSeverityValue]}>{accidentData.injuriesVisible}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Hospital:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedHospital?.name}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Distance:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedHospital?.distance}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>ETA:</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedHospital?.eta}</Text>
              </View>
              {(accidentData.policeRequired || accidentData.towRequired) && (
                <View style={styles.additionalServices}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Additional Services:</Text>
                  {accidentData.policeRequired && (
                    <Text style={[styles.serviceItem, { color: colors.text }]}>• Police Dispatch</Text>
                  )}
                  {accidentData.towRequired && (
                    <Text style={[styles.serviceItem, { color: colors.text }]}>• Tow Service</Text>
                  )}
                </View>
              )}
            </View>
            
            <View style={styles.finalButtons}>
              <TouchableOpacity style={[styles.backToFormButton, { backgroundColor: colors.surface }]} onPress={() => {
                setShowAccidentConfirmation(false);
                setShowAccidentForm(true);
                setPanelPosition(height * 0.7);
                Animated.spring(panelHeight, {
                  toValue: height * 0.7,
                  useNativeDriver: false,
                  tension: 100,
                  friction: 8,
                }).start();
              }}>
                <Text style={[styles.backToFormText, { color: colors.textSecondary }]}>‹ Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.accidentConfirmButton} onPress={handleAccidentBookingConfirm}>
                <Text style={styles.accidentConfirmText}>🚛 DISPATCH RESPONSE</Text>
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
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.hospitalInfo, { backgroundColor: colors.surface }]}>
              <Text style={[styles.hospitalLabel, { color: colors.textSecondary }]}>Dispatched to:</Text>
              <Text style={[styles.hospitalName, { color: colors.text }]}>{selectedHospital?.name || 'City General Hospital'}</Text>
              <Text style={[styles.hospitalDistance, { color: colors.textSecondary }]}>{selectedHospital?.distance || '2.3'} km away</Text>
            </View>
            
            <View style={styles.ambulanceStatus}>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Ambulance ETA:</Text>
                <Text style={styles.etaText}>{ambulanceETA}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Status:</Text>
                <Text style={[styles.driverText, { color: colors.text }]}>Ambulance Dispatched</Text>
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
                <Text style={[styles.backIcon, { color: colors.text }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.bookingTitle, { color: colors.text }]}>Book Ambulance</Text>
            </View>
            
            <View style={[styles.hospitalCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.hospitalCardName, { color: colors.text }]}>{bookingHospitalData?.name}</Text>
              <Text style={[styles.hospitalCardDistance, { color: colors.textSecondary }]}>{bookingHospitalData?.distance} km</Text>
            </View>
            
            <View style={[styles.ambulanceCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.ambulanceRow}>
                <Text style={[styles.ambulanceLabel, { color: colors.textSecondary }]}>Status</Text>
                <Text style={[styles.ambulanceValue, { color: colors.text }]}>Available</Text>
              </View>
              <View style={styles.ambulanceRow}>
                <Text style={[styles.ambulanceLabel, { color: colors.textSecondary }]}>ETA</Text>
                <Text style={[styles.ambulanceValue, { color: colors.text }]}>8-12 min</Text>
              </View>

            </View>
            
            <View style={styles.bookingButtonContainer}>
              <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={handleBookingCancel}>
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: '#fff' }]} onPress={handleNormalBookingConfirm}>
                <Text style={[styles.confirmButtonText, { color: '#000' }]}>Confirm Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={[styles.panelTitle, { color: colors.text }]}>Find Hospitals</Text>
            
            <HospitalSearch
              searchText={hospitalSearch}
              onSearchChange={handleHospitalSearch}
              searchRadius={searchRadius}
              onRadiusPress={() => setShowRadiusControl(!showRadiusControl)}
              showRadiusControl={showRadiusControl}
              onRadiusChange={(radius) => {
                handleRadiusChange(radius);
                setShowRadiusControl(false);
              }}
            />
            
            <EmergencyButtons onServiceSelect={handleServiceSelect} />
            
            <HospitalList
              hospitals={filteredHospitals}
              selectedHospitalId={selectedHospitalForBooking?.id}
              searchRadius={searchRadius}
              onHospitalSelect={handleHospitalSelect}
            />
          </View>
        )}
      </ScrollView>
      </Animated.View>
    </PanGestureHandler>
  );

  if (isLoading) {
    return <LoadingScreen onLoadingComplete={handleLoadingComplete} />;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Emergency/Accident Header Bar */}
      {(showEmergencyForm || showEmergencyDashboard || showHospitalSelection || showFinalConfirmation) && (
        <Animated.View style={[styles.emergencyHeaderBar, { opacity: emergencyPulse }]} />
      )}
      {(showAccidentForm || showAccidentConfirmation || showAccidentHospitalSelection) && (
        <Animated.View style={[styles.accidentHeaderBar, { opacity: emergencyPulse }]} />
      )}
      
      <MapViewComponent 
        webViewRef={webViewRef} 
        userLocation={userLocation}
        mapMode={showEmergencyDashboard || showFinalConfirmation || showAccidentConfirmation ? 'emergency' : 'normal'}
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
       !showEmergencyForm && !showEmergencyDashboard && !showAccidentForm && !showHospitalSelection && !showFinalConfirmation && !showAccidentConfirmation && !showAccidentHospitalSelection && (
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
  accidentLoadingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff6600',
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
  accidentConfirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff6600',
    textAlign: 'center',
  },
  accidentSeverityValue: {
    color: '#ff6600',
  },
  additionalServices: {
    marginTop: 8,
  },
  serviceItem: {
    fontSize: 14,
    marginLeft: 8,
    marginTop: 4,
  },
  accidentConfirmButton: {
    flex: 2,
    backgroundColor: '#ff6600',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  accidentConfirmText: {
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

  // Emergency Header Bar
  emergencyHeaderBar: {
    backgroundColor: '#ff0000',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  // Accident Header Bar
  accidentHeaderBar: {
    backgroundColor: '#ff6600',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  emergencyHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

});

export default HomeScreen;