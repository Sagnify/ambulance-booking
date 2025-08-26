import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:5000/send-otp', // for Android emulator, or use your machine IP
});

export default API;
