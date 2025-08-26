import axios from 'axios';

const API = axios.create({
  baseURL: 'http://10.0.2.2:5000', // for Android emulator, or use your machine IP
});

export default API;
