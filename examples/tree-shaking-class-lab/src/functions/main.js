import { getUser, getPost } from './api.js';

const BASE_URL = 'https://api.example.test';

console.log(await getUser(BASE_URL, 1), await getPost(BASE_URL, 2));
