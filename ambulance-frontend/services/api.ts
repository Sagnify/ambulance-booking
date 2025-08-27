import axios from 'axios';

const API = axios.create({
  baseURL: 'https://ambulance-booking-roan.vercel.app/', // for Android emulator, or use your machine IP
});

export default API;
