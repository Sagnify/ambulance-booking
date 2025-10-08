import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebRTCConnection } from 'peerpyrtc-client';

const API = axios.create({
  baseURL: 'https://ambulance-booking-roan.vercel.app',
  timeout: 10000,
});

// Add JWT token to requests
API.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  console.log('API Token:', token ? 'Present' : 'Missing');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle network errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.log('Network error detected, but request may have succeeded');
    }
    return Promise.reject(error);
  }
);

export const createBooking = async (bookingData: any) => {
  try {
    const response = await API.post('/api/bookings', bookingData);
    
    // Initialize PeerPyRTC for realtime updates (optional - don't block booking)
    const userId = await AsyncStorage.getItem('userId');
    if (userId) {
      setTimeout(async () => {
        try {
          const { WebRTCConnection } = require('peerpyrtc-client');
          const rtc = new WebRTCConnection(`hospital_${bookingData.hospital_id}`, { 
            peerId: `user_${userId}`,
            debug: true 
          });
          
          rtc.onOpen = () => {
            console.log('✅ PeerPyRTC: Connected, sending booking update');
            rtc.emit('booking_update', {
              booking_id: response.data.booking_id,
              ...bookingData,
              status: 'created'
            });
          };
          
          rtc.onError = (error) => {
            console.error('❌ PeerPyRTC Error:', error);
          };
          
          await rtc.connect();
          (global as any).peerpyrtcClient = rtc;
        } catch (error) {
          console.error('❌ PeerPyRTC initialization failed (non-blocking):', error);
        }
      }, 100);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Booking API Error:', error);
    // If it's a network error but booking might have been created, return a fallback response
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return {
        booking_id: Date.now(), // Fallback ID
        status: 'Pending',
        message: 'Booking request sent (network issue with response)'
      };
    }
    throw new Error(error.response?.data?.message || 'Failed to create booking');
  }
};

export default API;
