import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebRTCService from './webrtc';

const API = axios.create({
  baseURL: 'https://ambulance-booking-roan.vercel.app',
  timeout: 10000,
});

// Add JWT token to requests
API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const createBooking = async (bookingData: any) => {
  try {
    const response = await API.post('/api/bookings', bookingData);
    
    // Initialize WebRTC for realtime updates
    const userId = await AsyncStorage.getItem('user_id');
    if (userId) {
      const webrtc = new WebRTCService(`user_${userId}`);
      await webrtc.initialize(`hospital_${bookingData.hospital_id}`, true);
      
      // Send booking update via WebRTC
      webrtc.sendBookingUpdate({
        booking_id: response.data.booking_id,
        ...bookingData,
        status: 'created'
      });
      
      // Store WebRTC instance for later use
      (global as any).webrtcService = webrtc;
    }
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create booking');
  }
};

export default API;
