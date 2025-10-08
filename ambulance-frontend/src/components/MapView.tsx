import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeContext';

interface MapViewProps {
  webViewRef: React.RefObject<any>;
  userLocation: { latitude: number; longitude: number };
  mapMode?: 'normal' | 'emergency';
  selectedHospital?: { name: string; distance: string; eta: string; lat?: number; lng?: number } | null;
  hospitalData?: any[];
  ambulanceData?: any[];
  hospitalLocation?: { latitude: number; longitude: number };
  ambulanceLocation?: { latitude: number; longitude: number };
  showHospitalMarker?: boolean;
  showAmbulanceMarker?: boolean;
  showUserMarker?: boolean;
  showRoute?: boolean;
}

const MapViewComponent: React.FC<MapViewProps> = ({ 
  webViewRef, 
  userLocation, 
  mapMode = 'normal', 
  selectedHospital = null, 
  hospitalData = [], 
  ambulanceData = [],
  hospitalLocation = null,
  ambulanceLocation = null,
  showHospitalMarker = false,
  showAmbulanceMarker = false,
  showUserMarker = true,
  showRoute = false
}) => {
  const { isDarkMode } = useTheme();
  return (
    <View style={styles.mapContainer}>
      <WebView
        ref={webViewRef}
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
                var map = L.map('map', { zoomControl: false }).setView([${userLocation.latitude}, ${userLocation.longitude}], 15);
                L.tileLayer(${isDarkMode ? "'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'" : "'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'"}).addTo(map);
                
                // Fixed radius for nearby hospitals (in degrees, ~5km radius)
                var searchRadius = 0.045;
                
                // Use only API data
                var apiHospitals = ${JSON.stringify(hospitalData)};
                var apiAmbulances = ${JSON.stringify(ambulanceData)};
                var hospitalLocation = ${JSON.stringify(hospitalLocation)};
                var ambulanceLocation = ${JSON.stringify(ambulanceLocation)};
                var showHospitalMarker = ${showHospitalMarker};
                var showAmbulanceMarker = ${showAmbulanceMarker};
                var showUserMarker = ${showUserMarker};
                var showRoute = ${showRoute};
                
                var nearbyHospitals = (apiHospitals && apiHospitals.length > 0) ? apiHospitals.map(h => ({
                  id: h.id,
                  lat: h.latitude,
                  lng: h.longitude,
                  name: h.name,
                  distance: h.distance + ' km',
                  type: h.type
                })) : [];
                var nearbyAmbulances = (apiAmbulances && apiAmbulances.length > 0) ? apiAmbulances : [];
                
                var hospitalMarkers = [];
                var ambulanceMarkers = [];
                var emergencyHospitalMarker = null;
                var routeLine = null;
                
                // User location marker
                var userMarker = L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
                  color: '#007AFF',
                  fillColor: '#007AFF',
                  fillOpacity: 1,
                  radius: 8,
                  weight: 3
                }).addTo(map);
                
                // Function to show normal hospitals and ambulances
                function showNormalHospitals() {
                  // Clear existing markers
                  hospitalMarkers.forEach(function(marker) { 
                    if (map.hasLayer(marker)) map.removeLayer(marker); 
                  });
                  ambulanceMarkers.forEach(function(marker) { 
                    if (map.hasLayer(marker)) map.removeLayer(marker); 
                  });
                  hospitalMarkers = [];
                  ambulanceMarkers = [];
                  
                  // Add hospital markers
                  nearbyHospitals.forEach(function(hospital) {
                    var marker = L.marker([hospital.lat, hospital.lng], {
                      icon: L.divIcon({
                        html: '<div style="background: white; border: 2px solid #007AFF; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏥</div>',
                        iconSize: [35, 35],
                        className: 'hospital-marker'
                      })
                    }).bindPopup(hospital.name + '<br>' + hospital.distance + ' away<br>Type: ' + hospital.type);
                    
                    hospitalMarkers.push(marker);
                    marker.addTo(map);
                  });
                  
                  // Add ambulance markers
                  nearbyAmbulances.forEach(function(ambulance) {
                    var bgColor = ambulance.status === 'available' ? '#00AA00' : '#FF6B6B';
                    var marker = L.marker([ambulance.lat, ambulance.lng], {
                      icon: L.divIcon({
                        html: '<div style="background: white; border: 2px solid ' + bgColor + '; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🚑</div>',
                        iconSize: [35, 35],
                        className: 'ambulance-marker'
                      })
                    }).bindPopup(ambulance.name + '<br>ETA: ' + ambulance.eta + '<br>Status: ' + ambulance.status);
                    
                    ambulanceMarkers.push(marker);
                    marker.addTo(map);
                  });
                }
                
                // Function to show emergency hospital with route
                function showEmergencyHospital(hospitalData) {
                  // Clear normal hospitals and ambulances
                  hospitalMarkers.forEach(function(marker) { 
                    if (map.hasLayer(marker)) map.removeLayer(marker); 
                  });
                  ambulanceMarkers.forEach(function(marker) { 
                    if (map.hasLayer(marker)) map.removeLayer(marker); 
                  });
                  
                  // Clear existing emergency marker and route
                  if (emergencyHospitalMarker && map.hasLayer(emergencyHospitalMarker)) {
                    map.removeLayer(emergencyHospitalMarker);
                  }
                  if (routeLine && map.hasLayer(routeLine)) {
                    map.removeLayer(routeLine);
                  }
                  
                  // Find hospital coordinates (use API data or fallback to first hospital)
                  var hospitalLat = hospitalData.lat || nearbyHospitals[0].lat;
                  var hospitalLng = hospitalData.lng || nearbyHospitals[0].lng;
                  
                  // Add emergency hospital marker with enhanced visibility
                  emergencyHospitalMarker = L.marker([hospitalLat, hospitalLng], {
                    icon: L.divIcon({
                      html: '<div style="background: #FF0000; border: 3px solid white; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 12px rgba(255,0,0,0.5); animation: pulse 2s infinite;">🏥</div><style>@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }</style>',
                      iconSize: [45, 45],
                      className: 'emergency-hospital-marker'
                    })
                  }).addTo(map).bindPopup('🚨 EMERGENCY: ' + hospitalData.name + '<br>ETA: ' + hospitalData.eta);
                  
                  // Create 3D arc route
                  var userLat = ${userLocation.latitude};
                  var userLng = ${userLocation.longitude};
                  var distance = Math.sqrt(Math.pow(hospitalLat - userLat, 2) + Math.pow(hospitalLng - userLng, 2));
                  var arcHeight = distance * 0.3;
                  
                  var arcPoints = [];
                  for (var i = 0; i <= 30; i++) {
                    var t = i / 30;
                    var lat = userLat + (hospitalLat - userLat) * t;
                    var lng = userLng + (hospitalLng - userLng) * t;
                    var height = Math.sin(t * Math.PI) * arcHeight;
                    arcPoints.push([lat + height, lng]);
                  }
                  
                  routeLine = L.polyline(arcPoints, {
                    color: '#333333',
                    weight: 3,
                    opacity: 0.8
                  }).addTo(map);
                  
                  // Auto-fit to show both user and hospital
                  setTimeout(function() {
                    var group = new L.featureGroup([userMarker, emergencyHospitalMarker]);
                    var bounds = group.getBounds().pad(0.8);
                    map.fitBounds(bounds);
                  }, 100);
                }
                
                // Function to show filtered hospitals
                function showFilteredHospitals(filteredHospitals) {
                  // Clear existing markers
                  hospitalMarkers.forEach(function(marker) { 
                    if (map.hasLayer(marker)) map.removeLayer(marker); 
                  });
                  hospitalMarkers = [];
                  
                  // Add filtered hospital markers
                  filteredHospitals.forEach(function(hospital) {
                    var marker = L.marker([hospital.latitude, hospital.longitude], {
                      icon: L.divIcon({
                        html: '<div style="background: white; border: 2px solid #007AFF; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🏥</div>',
                        iconSize: [35, 35],
                        className: 'hospital-marker'
                      })
                    }).bindPopup(hospital.name + '<br>' + hospital.distance + ' km away<br>Type: ' + hospital.type);
                    
                    hospitalMarkers.push(marker);
                    marker.addTo(map);
                  });
                  
                  // Auto-fit filtered hospitals
                  if (hospitalMarkers.length > 0) {
                    setTimeout(function() {
                      var allMarkers = [userMarker].concat(hospitalMarkers);
                      var group = new L.featureGroup(allMarkers);
                      var bounds = group.getBounds().pad(0.5);
                      map.fitBounds(bounds);
                    }, 100);
                  }
                }
                
                // Function to center on specific hospital
                function centerOnHospital(hospital) {
                  map.setView([hospital.latitude, hospital.longitude], 15);
                  
                  // Highlight the selected hospital
                  hospitalMarkers.forEach(function(marker) {
                    if (marker.getLatLng().lat === hospital.latitude && marker.getLatLng().lng === hospital.longitude) {
                      marker.openPopup();
                    }
                  });
                }
                
                // Add specific hospital marker if provided
                var specificHospitalMarker = null;
                if (showHospitalMarker && hospitalLocation) {
                  specificHospitalMarker = L.marker([hospitalLocation.latitude, hospitalLocation.longitude], {
                    icon: L.divIcon({
                      html: '<div style="background: #007AFF; border: 3px solid white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 12px rgba(0,123,255,0.5);">🏥</div>',
                      iconSize: [40, 40],
                      className: 'selected-hospital-marker'
                    })
                  }).addTo(map);
                }
                
                // Add specific ambulance marker if provided
                var specificAmbulanceMarker = null;
                if (showAmbulanceMarker && ambulanceLocation) {
                  specificAmbulanceMarker = L.marker([ambulanceLocation.latitude, ambulanceLocation.longitude], {
                    icon: L.divIcon({
                      html: '<div style="background: #00AA00; border: 3px solid white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 4px 12px rgba(0,170,0,0.5); animation: pulse 2s infinite;">🚑</div><style>@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }</style>',
                      iconSize: [40, 40],
                      className: 'active-ambulance-marker'
                    })
                  }).addTo(map);
                }
                
                // Draw simple route if all three markers are present
                if (showRoute && specificHospitalMarker && specificAmbulanceMarker && hospitalLocation && ambulanceLocation) {
                  // Route from ambulance to user (green)
                  L.polyline([
                    [ambulanceLocation.latitude, ambulanceLocation.longitude],
                    [${userLocation.latitude}, ${userLocation.longitude}]
                  ], {
                    color: '#10B981',
                    weight: 4,
                    opacity: 0.8
                  }).addTo(map);
                  
                  // Route from user to hospital (blue)
                  L.polyline([
                    [${userLocation.latitude}, ${userLocation.longitude}],
                    [hospitalLocation.latitude, hospitalLocation.longitude]
                  ], {
                    color: '#007AFF',
                    weight: 4,
                    opacity: 0.8
                  }).addTo(map);
                }
                
                // Initialize based on mode
                if ('${mapMode}' === 'normal') {
                  if (!showHospitalMarker && !showAmbulanceMarker) {
                    showNormalHospitals();
                  }
                  
                  // Auto-fit all markers in upper half
                  setTimeout(function() {
                    var allMarkers = [userMarker];
                    if (specificHospitalMarker) allMarkers.push(specificHospitalMarker);
                    if (specificAmbulanceMarker) allMarkers.push(specificAmbulanceMarker);
                    if (!showHospitalMarker && !showAmbulanceMarker) {
                      allMarkers = allMarkers.concat(hospitalMarkers).concat(ambulanceMarkers);
                    }
                    
                    if (allMarkers.length > 1) {
                      var group = new L.featureGroup(allMarkers);
                      var bounds = group.getBounds().pad(0.7);
                      map.fitBounds(bounds);
                    }
                  }, 500);
                } else if ('${mapMode}' === 'emergency' && ${selectedHospital ? 'true' : 'false'}) {
                  showEmergencyHospital(${selectedHospital ? JSON.stringify(selectedHospital) : 'null'});
                }
                
                // Message handlers
                function handleMessage(data) {
                  if (data === 'centerOnUser') {
                    if ('${mapMode}' === 'emergency' && emergencyHospitalMarker) {
                      // Emergency mode: fit user and hospital in upper half
                      var group = new L.featureGroup([userMarker, emergencyHospitalMarker]);
                      var bounds = group.getBounds().pad(0.5);
                      map.fitBounds(bounds);
                    } else {
                      // Normal mode: fit markers in upper half of visible area
                      var allMarkers = [userMarker].concat(hospitalMarkers).concat(ambulanceMarkers);
                      if (allMarkers.length > 0) {
                        var group = new L.featureGroup(allMarkers);
                        var bounds = group.getBounds().pad(0.7);
                        map.fitBounds(bounds);
                      }
                    }
                  } else {
                    try {
                      var parsed = JSON.parse(data);
                      if (parsed.type === 'showEmergencyHospital') {
                        showEmergencyHospital(parsed.hospital);
                      } else if (parsed.type === 'showNormalHospitals') {
                        showNormalHospitals();
                      } else if (parsed.type === 'showFilteredHospitals') {
                        showFilteredHospitals(parsed.hospitals);
                      } else if (parsed.type === 'centerOnHospital') {
                        centerOnHospital(parsed.hospital);
                      }
                    } catch (e) {}
                  }
                }
                
                document.addEventListener('message', function(event) {
                  handleMessage(event.data);
                });
                window.addEventListener('message', function(event) {
                  handleMessage(event.data);
                });
                
                // Also handle direct postMessage calls
                window.ReactNativeWebView = {
                  postMessage: handleMessage
                };
              </script>
            </body>
            </html>
          `
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    paddingBottom: 350,
  },
  map: {
    flex: 1,
  },
});

export default MapViewComponent;