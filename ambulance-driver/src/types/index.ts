export interface Driver {
  id: number;
  name: string;
  phone: string;
  license_number: string;
  hospital_id: number;
  is_available: boolean;
  current_latitude?: number;
  current_longitude?: number;
}

export interface Booking {
  id: number;
  booking_code?: string;
  booking_type?: string;
  emergency_type?: string;
  severity?: string;
  patient_name?: string;
  patient_phone?: string;
  user_phone: string;
  user_name?: string;
  user_email?: string;
  pickup_location?: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination?: string;
  hospital_id: number;
  driver_id: number;
  status: 'pending' | 'assigned' | 'en_route' | 'arrived' | 'completed' | 'cancelled' | 'Assigned' | 'On Route' | 'Arrived' | 'Completed';
  requested_at: string;
  created_at: string;
  assigned_at?: string;
  auto_assigned?: boolean;
  hospital_name?: string;
  hospital_address?: string;
  hospital_contact?: string;
  hospital_latitude?: number;
  hospital_longitude?: number;
}

export interface Hospital {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  type: string;
}