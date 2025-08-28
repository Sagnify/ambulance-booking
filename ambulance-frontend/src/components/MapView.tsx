import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapViewProps {
  webViewRef: React.RefObject<any>;
  userLocation: { latitude: number; longitude: number };
  isEmergencyMode?: boolean;
  selectedHospital?: { name: string; distance: string; eta: string } | null;
}

const MapViewComponent: React.FC<MapViewProps> = ({ webViewRef, userLocation, isEmergencyMode = false, selectedHospital = null }) => {
  return (
    <View style={styles.mapContainer}>
      <WebView
        ref={webViewRef}
        style={styles.map}
        key={`${userLocation.latitude}-${userLocation.longitude}-${isEmergencyMode}`}
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
                
                // Hospital markers data
                var hospitals = [
                  { lat: ${(userLocation.latitude || 28.6139) + 0.01}, lng: ${(userLocation.longitude || 77.2090) + 0.01}, name: 'City General Hospital', distance: '2.3 km' },
                  { lat: ${(userLocation.latitude || 28.6139) - 0.01}, lng: ${(userLocation.longitude || 77.2090) - 0.01}, name: 'Metro Medical Center', distance: '3.1 km' },
                  { lat: ${(userLocation.latitude || 28.6139) + 0.005}, lng: ${(userLocation.longitude || 77.2090) - 0.015}, name: 'Central Care Hospital', distance: '4.2 km' },
                  { lat: ${(userLocation.latitude || 28.6139) - 0.008}, lng: ${(userLocation.longitude || 77.2090) + 0.012}, name: 'Emergency Medical Center', distance: '1.8 km' },
                  { lat: ${(userLocation.latitude || 28.6139) + 0.015}, lng: ${(userLocation.longitude || 77.2090) - 0.005}, name: 'Regional Hospital', distance: '3.7 km' }
                ];
                
                // Ambulance units data
                var ambulances = [
                  { lat: ${(userLocation.latitude || 28.6139) + 0.008}, lng: ${(userLocation.longitude || 77.2090) + 0.008}, name: 'Ambulance Unit A1', eta: '5 min' },
                  { lat: ${(userLocation.latitude || 28.6139) - 0.006}, lng: ${(userLocation.longitude || 77.2090) + 0.009}, name: 'Ambulance Unit B2', eta: '7 min' },
                  { lat: ${(userLocation.latitude || 28.6139) + 0.012}, lng: ${(userLocation.longitude || 77.2090) - 0.008}, name: 'Ambulance Unit C3', eta: '9 min' }
                ];
                
                var hospitalMarkers = [];
                var ambulanceMarkers = [];
                
                // Create hospital markers
                hospitals.forEach(function(hospital) {
                  var marker = L.marker([hospital.lat, hospital.lng], {
                    icon: L.divIcon({
                      html: '🏥',
                      iconSize: [25, 25],
                      className: 'hospital-marker'
                    })
                  }).bindPopup(hospital.name + '<br>' + hospital.distance + ' away');
                  hospitalMarkers.push(marker);
                  if (!${isEmergencyMode}) marker.addTo(map);
                });
                
                // Create ambulance markers
                ambulances.forEach(function(ambulance) {
                  var marker = L.marker([ambulance.lat, ambulance.lng], {
                    icon: L.divIcon({
                      html: '🚑',
                      iconSize: [25, 25],
                      className: 'ambulance-marker'
                    })
                  }).bindPopup(ambulance.name + '<br>ETA: ' + ambulance.eta);
                  ambulanceMarkers.push(marker);
                  if (!${isEmergencyMode}) marker.addTo(map);
                });
                
                // User location marker
                var userMarker = L.circleMarker([${userLocation.latitude || 28.6139}, ${userLocation.longitude || 77.2090}], {
                  color: '#007AFF',
                  fillColor: '#007AFF',
                  fillOpacity: 1,
                  radius: 8,
                  weight: 3
                }).addTo(map);
                
                var emergencyHospitalMarker = null;
                var routeLine = null;
                
                // Listen for messages from React Native
                document.addEventListener('message', function(event) {
                  if (event.data === 'centerOnUser') {
                    if (${isEmergencyMode} && emergencyHospitalMarker) {
                      // In emergency mode, fit both user and hospital
                      var group = new L.featureGroup([userMarker, emergencyHospitalMarker]);
                      map.fitBounds(group.getBounds().pad(0.1));
                    } else {
                      // Normal mode, zoom to show nearby hospitals and ambulances
                      var allMarkers = [userMarker].concat(hospitalMarkers).concat(ambulanceMarkers);
                      var group = new L.featureGroup(allMarkers);
                      map.fitBounds(group.getBounds().pad(0.1));
                    }
                  } else {
                    try {
                      var data = JSON.parse(event.data);
                      if (data.type === 'markEmergencyHospital') {
                        // Hide all regular markers
                        hospitalMarkers.forEach(function(marker) { map.removeLayer(marker); });
                        ambulanceMarkers.forEach(function(marker) { map.removeLayer(marker); });
                        
                        if (emergencyHospitalMarker) {
                          map.removeLayer(emergencyHospitalMarker);
                        }
                        
                        // Show only the assigned hospital
                        emergencyHospitalMarker = L.marker([${(userLocation.latitude || 28.6139) + 0.01}, ${(userLocation.longitude || 77.2090) + 0.01}], {
                          icon: L.divIcon({
                            html: '🏥',
                            iconSize: [30, 30],
                            className: 'emergency-hospital-marker'
                          })
                        }).addTo(map).bindPopup('EMERGENCY: ' + data.hospital.name + '<br>ETA: ' + data.hospital.eta);
                      } else if (data.type === 'showRoute') {
                        var hospitalLat = ${(userLocation.latitude || 28.6139) + 0.01};
                        var hospitalLng = ${(userLocation.longitude || 77.2090) + 0.01};
                        
                        if (routeLine) {
                          map.removeLayer(routeLine);
                        }
                        
                        // Create smooth 3D arc route
                        var userLat = data.userLocation.latitude;
                        var userLng = data.userLocation.longitude;
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
                        
                        map.fitBounds(routeLine.getBounds(), {padding: [20, 20]});
                      }
                    } catch (e) {}
                  }
                });
                
                window.addEventListener('message', function(event) {
                  if (event.data === 'centerOnUser') {
                    if (${isEmergencyMode} && emergencyHospitalMarker) {
                      // In emergency mode, fit both user and hospital
                      var group = new L.featureGroup([userMarker, emergencyHospitalMarker]);
                      map.fitBounds(group.getBounds().pad(0.1));
                    } else {
                      // Normal mode, zoom to show nearby hospitals and ambulances
                      var allMarkers = [userMarker].concat(hospitalMarkers).concat(ambulanceMarkers);
                      var group = new L.featureGroup(allMarkers);
                      map.fitBounds(group.getBounds().pad(0.1));
                    }
                  } else {
                    try {
                      var data = JSON.parse(event.data);
                      if (data.type === 'markEmergencyHospital') {
                        // Hide all regular markers
                        hospitalMarkers.forEach(function(marker) { map.removeLayer(marker); });
                        ambulanceMarkers.forEach(function(marker) { map.removeLayer(marker); });
                        
                        if (emergencyHospitalMarker) {
                          map.removeLayer(emergencyHospitalMarker);
                        }
                        
                        // Show only the assigned hospital
                        emergencyHospitalMarker = L.marker([${(userLocation.latitude || 28.6139) + 0.01}, ${(userLocation.longitude || 77.2090) + 0.01}], {
                          icon: L.divIcon({
                            html: '🏥',
                            iconSize: [30, 30],
                            className: 'emergency-hospital-marker'
                          })
                        }).addTo(map).bindPopup('EMERGENCY: ' + data.hospital.name + '<br>ETA: ' + data.hospital.eta);
                      } else if (data.type === 'showRoute') {
                        var hospitalLat = ${(userLocation.latitude || 28.6139) + 0.01};
                        var hospitalLng = ${(userLocation.longitude || 77.2090) + 0.01};
                        
                        if (routeLine) {
                          map.removeLayer(routeLine);
                        }
                        
                        // Create smooth 3D arc route
                        var userLat = data.userLocation.latitude;
                        var userLng = data.userLocation.longitude;
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
                        
                        map.fitBounds(routeLine.getBounds(), {padding: [20, 20]});
                      }
                    } catch (e) {}
                  }
                });
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
  },
  map: {
    flex: 1,
  },
});

export default MapViewComponent;