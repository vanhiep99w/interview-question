import { Api } from './api.js';

const BASE_URL = 'https://api.example.test';

console.log(await Api.getUser(BASE_URL, 1), await Api.getPost(BASE_URL, 2));
