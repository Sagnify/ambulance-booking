import axios from 'axios';
import { Driver, Booking } from '../types';

const API_BASE_URL = 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const driverAPI = {
  login: async (loginId: string, password: string): Promise<Driver> => {
    const response = await api.post('/driver/login', {
      login_id: loginId,
      password: password,
    });
    return response.data;
  },

  updateLocation: async (driverId: number, latitude: number, longitude: number): Promise<void> => {
    await api.post('/driver/location', {
      driver_id: driverId,
      latitude,
      longitude,
    });
  },

  getAssignedBookings: async (driverId: number): Promise<Booking[]> => {
    const response = await api.get(`/driver/${driverId}/bookings`);
    return response.data;
  },

  updateBookingStatus: async (bookingId: number, status: string): Promise<void> => {
    await api.post('/booking/status', {
      booking_id: bookingId,
      status,
    });
  },

  setAvailability: async (driverId: number, isAvailable: boolean): Promise<void> => {
    await api.post('/driver/availability', {
      driver_id: driverId,
      is_available: isAvailable,
    });
  },
};