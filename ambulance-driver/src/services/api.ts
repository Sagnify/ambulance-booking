import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Driver, Booking } from '../types';

const API_BASE_URL = 'https://ambulance-booking-roan.vercel.app/';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add JWT token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('driver_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const driverAPI = {
  login: async (loginId: string, password: string): Promise<{ token: string; driver: Driver }> => {
    const response = await api.post('/driver/login', {
      login_id: loginId,
      password: password,
    });
    
    // Store JWT token
    await AsyncStorage.setItem('driver_token', response.data.access_token);
    
    return {
      token: response.data.access_token,
      driver: response.data.driver
    };
  },

  updateLocation: async (latitude: number, longitude: number): Promise<void> => {
    await api.post('/driver/location', {
      latitude,
      longitude,
    });
  },

  getAssignedBookings: async (): Promise<Booking[]> => {
    const response = await api.get('/driver/bookings');
    return response.data;
  },

  updateBookingStatus: async (bookingId: number, status: string): Promise<void> => {
    await api.post('/booking/status', {
      booking_id: bookingId,
      status,
    });
  },

  setAvailability: async (isAvailable: boolean): Promise<void> => {
    await api.post('/driver/availability', {
      is_available: isAvailable,
    });
  },

  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem('driver_token');
  },
};