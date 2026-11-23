import { createClient, getUser, getPost } from './api.js';

const client = createClient('https://api.example.test', 'demo-token');

console.log(await getUser(client, 1), await getPost(client, 2));
