# Ambulance Driver App

A React Native mobile application for ambulance drivers to manage bookings and track their location in real-time.

## Features

- **Driver Authentication**: Login with phone number and license number
- **Real-time Location Tracking**: GPS tracking with automatic location updates
- **Booking Management**: View assigned bookings and update their status
- **Availability Toggle**: Set availability status for receiving new bookings
- **Status Updates**: Update booking status (En Route → Arrived → Completed)

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd ambulance-driver
   npm install
   ```

2. **Start the Development Server**
   ```bash
   npm start
   ```

3. **Run on Device/Simulator**
   ```bash
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   
   # For Web
   npm run web
   ```

## Driver Login Credentials

Drivers are created by hospitals through the hospital dashboard. To get driver credentials:

1. **Login to Hospital Dashboard**: Use hospital credentials (hospital01/admin, hospital02/admin, etc.)
2. **Go to Drivers Tab**: Click on "Drivers" in the dashboard
3. **Add New Driver**: Click "Add Driver" and fill in:
   - Name
   - Phone Number  
   - License Number
   - Vehicle Number
4. **Get Login Credentials**: The system will generate login ID and password for the driver
5. **Use in Driver App**: Driver can login with their generated Login ID and Password

**Note**: No drivers are pre-created. Each hospital must add their own drivers through the dashboard.

## App Flow

1. **Login Screen**: Enter Login ID and Password (from hospital dashboard)
2. **Home Screen**: 
   - Toggle availability status
   - View current location
   - See assigned bookings
   - Update booking status through action buttons

## API Integration

The app connects to the backend server at `http://localhost:5000` and uses these endpoints:

- `POST /driver/login` - Driver authentication
- `POST /driver/location` - Update driver location
- `GET /driver/{id}/bookings` - Get assigned bookings
- `POST /booking/status` - Update booking status
- `POST /driver/availability` - Set availability status

## Permissions

The app requires location permissions to track the driver's position in real-time for accurate ambulance tracking.

## Technology Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for screen navigation
- **Expo Location** for GPS tracking
- **Axios** for API calls
- **AsyncStorage** for local data persistence