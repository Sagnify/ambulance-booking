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
import { WebView } from 'react-native-webview';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';
import BottomPanel from '../components/BottomSheetContent';


const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const [address, setAddress] = useState('Fetching location...');
  const [userLocation, setUserLocation] = useState({ 
    latitude: 28.6139, 
    longitude: 77.2090 
  });
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<'emergency' | 'accident' | 'hospital' | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const panelHeight = useRef(new Animated.Value(height * 0.4)).current;
  const [panelPosition, setPanelPosition] = useState(height * 0.4);
  const [showHospitalSearch, setShowHospitalSearch] = useState(false);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (showHospitalSearch) {
        const newHeight = height - e.endCoordinates.height - 100;
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
    }
    console.log('Selected service:', service);
  };

  const handleBackToMenu = () => {
    setShowHospitalSearch(false);
    setSelectedService(null);
    setHospitalSearch('');
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    setProfileMenuVisible(false);
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
        {showHospitalSearch ? (
          <View>
            {/* Hospital Search Header */}
            <View style={styles.searchHeader}>
              <TouchableOpacity onPress={handleBackToMenu} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.searchTitle}>Select Hospital</Text>
            </View>
            
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search hospitals..."
                value={hospitalSearch}
                onChangeText={setHospitalSearch}
                autoFocus
              />
            </View>
            
            {/* Hospital List */}
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
            
            {/* Emergency Option */}
        <TouchableOpacity
          style={[
            styles.serviceCard,
            selectedService === 'emergency' && styles.selectedServiceCard
          ]}
          onPress={() => handleServiceSelect('emergency')}
        >
          <View style={styles.serviceIcon}>
            <Text style={styles.serviceEmoji}>🚨</Text>
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Emergency</Text>
            <Text style={styles.serviceDesc}>Immediate medical assistance</Text>
          </View>
          <Text style={styles.serviceArrow}>›</Text>
        </TouchableOpacity>

        {/* Accident Option */}
        <TouchableOpacity
          style={[
            styles.serviceCard,
            selectedService === 'accident' && styles.selectedServiceCard
          ]}
          onPress={() => handleServiceSelect('accident')}
        >
          <View style={styles.serviceIcon}>
            <Text style={styles.serviceEmoji}>🚑</Text>
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Accident</Text>
            <Text style={styles.serviceDesc}>Road accident & trauma care</Text>
          </View>
          <Text style={styles.serviceArrow}>›</Text>
        </TouchableOpacity>

        {/* Hospital Selection Option */}
        <TouchableOpacity
          style={[
            styles.serviceCard,
            selectedService === 'hospital' && styles.selectedServiceCard
          ]}
          onPress={() => handleServiceSelect('hospital')}
        >
          <View style={styles.serviceIcon}>
            <Text style={styles.serviceEmoji}>🏥</Text>
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>Select Hospital</Text>
            <Text style={styles.serviceDesc}>Choose specific hospital</Text>
          </View>
          <Text style={styles.serviceArrow}>›</Text>
        </TouchableOpacity>

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
      
      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          style={styles.map}
          source={{
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
                <style>
                  body { margin: 0; padding: 0; }
                  #map { height: 100vh; width: 100vw; }
                </style>
              </head>
              <body>
                <div id="map"></div>
                <script>
                  var map = L.map('map').setView([${userLocation.latitude || 28.6139}, ${userLocation.longitude || 77.2090}], 15);
                  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                  
                  // Add markers
                  L.marker([${(userLocation.latitude || 28.6139) + 0.01}, ${(userLocation.longitude || 77.2090) + 0.01}])
                    .addTo(map).bindPopup('City General Hospital<br>2.3 km away');
                  L.marker([${(userLocation.latitude || 28.6139) - 0.01}, ${(userLocation.longitude || 77.2090) - 0.01}])
                    .addTo(map).bindPopup('Metro Medical Center<br>3.1 km away');
                  L.marker([${(userLocation.latitude || 28.6139) + 0.005}, ${(userLocation.longitude || 77.2090) - 0.015}])
                    .addTo(map).bindPopup('Central Care Hospital<br>4.2 km away');
                </script>
              </body>
              </html>
            `
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>

      {/* Current Location Pin (centered) */}
      <View style={styles.centerPin}>
        <View style={styles.pinContainer}>
          <View style={styles.pin} />
          <View style={styles.pinShadow} />
        </View>
      </View>

      {/* Top Navigation */}
      <View style={styles.topContainer}>
        {/* Menu Button */}
        <TouchableOpacity style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        {/* Address Bar */}
        <View style={styles.addressBar}>
          <Text style={styles.addressText} numberOfLines={1}>
            {address}
          </Text>
        </View>

        {/* Profile Button */}
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => setProfileMenuVisible(!profileMenuVisible)}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Menu */}
      {profileMenuVisible && (
        <View style={styles.profileMenu}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('Profile');
              setProfileMenuVisible(false);
            }}
          >
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('Medical History');
              setProfileMenuVisible(false);
            }}
          >
            <Text style={styles.menuText}>Medical History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('Emergency Contacts');
              setProfileMenuVisible(false);
            }}
          >
            <Text style={styles.menuText}>Emergency Contacts</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

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
  bottomSheetContent: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Map Container
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },

  // Center Pin
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -24,
    zIndex: 5,
  },
  pinContainer: {
    alignItems: 'center',
  },
  pin: {
    width: 24,
    height: 24,
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  pinShadow: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 3,
    marginTop: 2,
  },

  // Top Navigation
  topContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  menuButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuIcon: {
    fontSize: 18,
    color: '#000',
  },
  addressBar: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  profileButton: {
    width: 44,
    height: 44,
    backgroundColor: '#000',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileIcon: {
    fontSize: 18,
    color: '#fff',
  },

  // Profile Menu
  profileMenu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 180,
    paddingVertical: 8,
    zIndex: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  logoutText: {
    color: '#ff0000',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    marginHorizontal: 16,
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

  // Service Cards
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedServiceCard: {
    borderColor: '#000',
    backgroundColor: '#fafafa',
  },
  serviceIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#f8f8f8',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceEmoji: {
    fontSize: 24,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  serviceDesc: {
    fontSize: 14,
    color: '#666',
  },
  serviceArrow: {
    fontSize: 20,
    color: '#ccc',
    marginLeft: 8,
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
});

export default HomeScreen;
