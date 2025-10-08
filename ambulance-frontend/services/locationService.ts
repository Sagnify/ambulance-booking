import * as Location from 'expo-location';
import { LocationSubscription } from 'expo-location';

class LocationService {
  private subscription: LocationSubscription | null = null;
  private isTracking = false;

  // Start tracking only during active booking
  async startBookingTracking(onLocationUpdate: (location: Location.LocationObject) => void): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return false;
      }

      if (this.isTracking) {
        console.log('Already tracking location');
        return true;
      }

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds during booking
          distanceInterval: 10, // Update if moved 10 meters
        },
        onLocationUpdate
      );

      this.isTracking = true;
      console.log('Started location tracking for active booking');
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  // Stop tracking when booking is completed
  stopBookingTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isTracking = false;
    console.log('Stopped location tracking - booking completed');
  }

  // Get current location once (for finding nearby hospitals)
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return null;
      }

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

export default new LocationService();