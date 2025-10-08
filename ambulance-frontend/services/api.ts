import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PeerPyRTCClient from 'peerpyrtc-client';

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
    
    // Initialize PeerPyRTC for realtime updates
    const userId = await AsyncStorage.getItem('userId');
    if (userId) {
      try {
        const client = new PeerPyRTCClient({
          peerId: `user_${userId}`,
          serverUrl: 'https://ambulance-booking-roan.vercel.app/api'
        });
        
        await client.connect();
        
        // Send booking update
        client.send(`hospital_${bookingData.hospital_id}`, {
          type: 'booking_update',
          booking_id: response.data.booking_id,
          ...bookingData,
          status: 'created'
        });
        
        (global as any).peerpyrtcClient = client;
      } catch (error) {
        console.log('PeerPyRTC initialization failed, continuing without real-time updates');
      }
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
