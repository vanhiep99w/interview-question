import { api } from './api.js';

const BASE_URL = 'https://api.example.test';
const action = new URLSearchParams(location.search).get('action');

console.log(await api[action](BASE_URL, 1));
