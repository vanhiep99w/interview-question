import * as api from './api.js';

const BASE_URL = 'https://api.example.test';

console.log(await api.getUser(BASE_URL, 1), await api.getPost(BASE_URL, 2));
