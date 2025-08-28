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
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';


const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const { logout } = useAuth();
  const [address, setAddress] = useState('Fetching location...');
  const [userLocation, setUserLocation] = useState({ 
    latitude: 28.6139, 
    longitude: 77.2090 
  });
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<'emergency' | 'accident' | 'hospital' | null>(null);
  // Removed unused sheetRef for BottomSheet
  const panelHeight = useRef(new Animated.Value(height * 0.4)).current;
  const [panelPosition, setPanelPosition] = useState(height * 0.4);
  const [showHospitalSearch, setShowHospitalSearch] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState('');
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
  const [selectedHospital, setSelectedHospital] = useState<{name: string, distance: string, eta: string} | null>(null);
  const [ambulanceETA, setAmbulanceETA] = useState('8-12 min');
  const [markers] = useState([
    { id: 1, x: '30%', y: '25%', type: 'hospital', name: 'City General Hospital' },
    { id: 2, x: '70%', y: '40%', type: 'ambulance', name: 'Ambulance Unit 1' },
    { id: 3, x: '45%', y: '60%', type: 'hospital', name: 'Metro Medical Center' },
    { id: 4, x: '20%', y: '70%', type: 'ambulance', name: 'Ambulance Unit 2' },
  ]);

  // Get user location
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
      } catch (error) {
        console.error('Location error:', error);
        setAddress('Current location');
      }
    };

    getLocation();
  }, []);

  // Get user data
  useEffect(() => {
    const getUserData = async () => {
      try {
        const response = await API.get('/api/auth/users');
        if (response.data.users && response.data.users.length > 0) {
          const user = response.data.users[response.data.users.length - 1]; // Get latest user
          setUserName(user.name || 'User');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    getUserData();
  }, []);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (showHospitalSearch) {
        const newHeight = height - e.endCoordinates.height+ 180;
        setPanelPosition(newHeight);
        Animated.spring(panelHeight, {
          toValue: newHeight,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }).start();
      }
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
      if (showHospitalSearch) {
        const newHeight = height * 0.8;
        setPanelPosition(newHeight);
        Animated.spring(panelHeight, {
          toValue: newHeight,
          useNativeDriver: false,
          tension: 80,
          friction: 10,
        }).start();
      }
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [showHospitalSearch]);

  const handleServiceSelect = (service: 'emergency' | 'accident' | 'hospital') => {
    setSelectedService(service);
    if (service === 'hospital') {
      setShowHospitalSearch(true);
      setPanelPosition(height * 0.8);
      Animated.spring(panelHeight, {
        toValue: height * 0.8,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    } else if (service === 'emergency') {
      setShowEmergencyModal(true);
    }
    console.log('Selected service:', service);
  };

  const handleEmergencyConfirm = () => {
    setShowEmergencyModal(false);
    setShowEmergencyForm(true);
    setPanelPosition(height * 0.85);
    Animated.spring(panelHeight, {
      toValue: height * 0.85,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleEmergencySubmit = () => {
    setShowEmergencyForm(false);
    setShowHospitalSelection(true);
    // Simulate finding nearest hospital
    setTimeout(() => {
      const nearestHospital = { name: 'City General Hospital', distance: '2.3 km', eta: '8-12 min' };
      setSelectedHospital(nearestHospital);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'markEmergencyHospital',
          hospital: nearestHospital
        }));
      }
      setShowHospitalSelection(false);
      setShowFinalConfirmation(true);
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
    
    // Show route on map
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'showRoute',
        userLocation,
        hospital: selectedHospital
      }));
    }
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
  };

  const handleBackToMenu = () => {
    setShowHospitalSearch(false);
    setSelectedService(null);
    setHospitalSearch('');
  };

  const handleLogout = () => {
    setProfileMenuVisible(false);
    logout();
  };

  const snapToCurrentLocation = () => {
    console.log('Snap button pressed!');
    // Instantly center map on current user location
    if (webViewRef.current) {
      webViewRef.current.postMessage('centerOnUser');
    }
  };

  const onPanGestureEvent = (event: any) => {
    const { translationY } = event.nativeEvent;
    const maxHeight = showHospitalSearch ? height * 0.9 : height * 0.8;
    const newHeight = Math.max(height * 0.4, Math.min(maxHeight, panelPosition - translationY));
    panelHeight.setValue(newHeight);
  };

  const onPanHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === 4) {
      const { translationY } = event.nativeEvent;
      const currentHeight = panelPosition - translationY;
      
      let targetHeight;
      if (showHospitalSearch) {
        targetHeight = currentHeight > height * 0.7 ? (keyboardHeight > 0 ? height * 0.9 : height * 0.8) : height * 0.4;
      } else {
        targetHeight = currentHeight > height * 0.6 ? height * 0.8 : height * 0.4;
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
      <Animated.View style={[styles.bottomPanel, { height: panelHeight }]}>
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
              }}>
                <Text style={styles.backToFormText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.finalConfirmButton} onPress={handleFinalConfirm}>
                <Text style={styles.finalConfirmText}>🚨 BOOK AMBULANCE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : showEmergencyForm ? (
          <View>
            <View style={styles.emergencyHeader}>
              <TouchableOpacity onPress={handleEmergencyCancel} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
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
                          const targetHeight = height * 0.85;
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
              <TouchableOpacity onPress={handleEmergencyCancel}>
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
        ) : showHospitalSearch ? (
          <View>
            <View style={styles.searchHeader}>
              <TouchableOpacity onPress={handleBackToMenu} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.searchTitle}>Select Hospital</Text>
            </View>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search hospitals..."
                value={hospitalSearch}
                onChangeText={setHospitalSearch}
                autoFocus
              />
            </View>
            
            <View style={styles.hospitalList}>
              <TouchableOpacity style={styles.hospitalItem}>
                <Text style={styles.hospitalName}>City General Hospital</Text>
                <Text style={styles.hospitalDistance}>2.3 km away</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.hospitalItem}>
                <Text style={styles.hospitalName}>Metro Medical Center</Text>
                <Text style={styles.hospitalDistance}>3.1 km away</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.hospitalItem}>
                <Text style={styles.hospitalName}>Central Care Hospital</Text>
                <Text style={styles.hospitalDistance}>4.2 km away</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.panelTitle}>Book Ambulance</Text>
            
            <ServiceCard
              emoji="🚨"
              name="Emergency"
              description="Immediate medical assistance"
              selected={selectedService === 'emergency'}
              onPress={() => handleServiceSelect('emergency')}
            />
            
            <ServiceCard
              emoji="🚑"
              name="Accident"
              description="Road accident & trauma care"
              selected={selectedService === 'accident'}
              onPress={() => handleServiceSelect('accident')}
            />
            
            <ServiceCard
              emoji="🏥"
              name="Select Hospital"
              description="Choose specific hospital"
              selected={selectedService === 'hospital'}
              onPress={() => handleServiceSelect('hospital')}
            />

        {/* Show additional content when service is selected */}
        {selectedService && (
          <View style={styles.selectedContent}>
            <Text style={styles.selectedTitle}>
              {selectedService === 'emergency' && 'Emergency Services'}
              {selectedService === 'accident' && 'Accident Response'}
              {selectedService === 'hospital' && 'Hospital Selection'}
            </Text>
            <Text style={styles.selectedDesc}>
              {selectedService === 'emergency' && 'Dispatching nearest ambulance with emergency medical team...'}
              {selectedService === 'accident' && 'Sending trauma-equipped ambulance with specialized care...'}
              {selectedService === 'hospital' && 'Choose your preferred hospital from the list below...'}
            </Text>
            
            <TouchableOpacity style={styles.continueButton}>
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <MapViewComponent 
        webViewRef={webViewRef} 
        userLocation={userLocation}
        isEmergencyMode={showEmergencyDashboard}
        selectedHospital={selectedHospital}
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
    elevation: 8,
    zIndex: 1000,
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

  // Hospital Search Styles
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  searchTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  hospitalList: {
    gap: 12,
  },
  hospitalItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
});

export default HomeScreen;