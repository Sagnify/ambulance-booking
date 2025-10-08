import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


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
    
    // Note: WebRTC not supported in React Native - using polling for updates instead
    console.log('✅ Booking created successfully - using polling for real-time updates');
    
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

export const cancelBooking = async (bookingId: number) => {
  try {
    const response = await API.post(`/api/bookings/${bookingId}/cancel`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to cancel booking');
  }
};

export const cancelBookingByCode = async (bookingCode: string) => {
  try {
    const response = await API.post(`/api/bookings/code/${bookingCode}/cancel`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to cancel booking');
  }
};

export const getBookingStatus = async (bookingId: number) => {
  try {
    const response = await API.get(`/api/bookings/${bookingId}/status`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get booking status');
  }
};

export const getOngoingBooking = async () => {
  try {
    const response = await API.get('/api/user/ongoing-booking');
    return response.data;
  } catch (error: any) {
    // If it's a 401/403 error, return no ongoing booking instead of throwing
    if (error.response?.status === 401 || error.response?.status === 403) {
      return { has_ongoing: false };
    }
    throw new Error(error.response?.data?.message || 'Failed to get ongoing booking');
  }
};

export const getBookingByCode = async (bookingCode: string) => {
  try {
    const response = await API.get(`/api/bookings/code/${bookingCode}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get booking');
  }
};

export default API;
