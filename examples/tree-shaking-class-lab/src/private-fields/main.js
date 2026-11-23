import { ApiClient } from './api.js';

const BASE_URL = 'https://api.example.test';
const api = new ApiClient(BASE_URL);

console.log(await api.getUser(1), await api.getPost(2));
