import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBookingStatus, getOngoingBooking } from '../services/api';

interface OngoingBooking {
  booking_id: number;
  booking_code: string;
  status: string;
  booking_type: string;
  pickup_location: string;
  destination?: string;
  is_cancelled: boolean;
  hospital?: {
    name: string;
    address: string;
  };
  ambulance?: {
    driver_name: string;
    vehicle_number: string;
    driver_phone: string;
  };
}

interface BookingContextType {
  ongoingBooking: OngoingBooking | null;
  setOngoingBooking: (booking: OngoingBooking | null) => void;
  checkOngoingBooking: () => Promise<void>;
  hasOngoingBooking: boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ongoingBooking, setOngoingBookingState] = useState<OngoingBooking | null>(null);

  const setOngoingBooking = async (booking: OngoingBooking | null) => {
    setOngoingBookingState(booking);
    if (booking) {
      await AsyncStorage.setItem('ongoingBooking', JSON.stringify(booking));
    } else {
      await AsyncStorage.removeItem('ongoingBooking');
    }
  };

  const checkOngoingBooking = async () => {
    try {
      // Check with API first
      const apiResult = await getOngoingBooking();
      if (apiResult.has_ongoing) {
        const booking = {
          booking_id: apiResult.booking.id,
          booking_code: apiResult.booking.booking_code,
          status: apiResult.booking.status,
          booking_type: apiResult.booking.booking_type,
          pickup_location: apiResult.booking.pickup_location,
          destination: apiResult.booking.destination,
          is_cancelled: apiResult.booking.is_cancelled,
          hospital: apiResult.booking.hospital,
          ambulance: apiResult.booking.ambulance
        };
        setOngoingBookingState(booking);
        await AsyncStorage.setItem('ongoingBooking', JSON.stringify(booking));
      } else {
        // No ongoing booking from API, clear local storage
        setOngoingBooking(null);
      }
    } catch (error) {
      console.error('Error checking ongoing booking:', error);
      // Fallback to local storage
      try {
        const stored = await AsyncStorage.getItem('ongoingBooking');
        if (stored) {
          const booking = JSON.parse(stored);
          setOngoingBookingState(booking);
        }
      } catch (localError) {
        setOngoingBooking(null);
      }
    }
  };

  useEffect(() => {
    checkOngoingBooking();
  }, []);

  const hasOngoingBooking = ongoingBooking && !ongoingBooking.is_cancelled && ongoingBooking.status !== 'Completed';

  return (
    <BookingContext.Provider value={{
      ongoingBooking,
      setOngoingBooking,
      checkOngoingBooking,
      hasOngoingBooking: !!hasOngoingBooking
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
};