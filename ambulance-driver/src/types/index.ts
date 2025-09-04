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
  user_phone: string;
  hospital_id: number;
  driver_id: number;
  pickup_latitude: number;
  pickup_longitude: number;
  status: 'pending' | 'assigned' | 'en_route' | 'arrived' | 'completed' | 'cancelled';
  created_at: string;
  hospital_name?: string;
  hospital_address?: string;
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