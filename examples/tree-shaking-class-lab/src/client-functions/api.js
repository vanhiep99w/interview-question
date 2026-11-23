export function createClient(baseUrl, token) {
  return { baseUrl, token };
}

async function request(client, path, init = {}) {
  const response = await fetch(client.baseUrl + path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${client.token}` },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function getUser(client, id) {
  return request(client, `/users/${id}`);
}

export function getPost(client, id) {
  return request(client, `/posts/${id}`);
}

export function getComments(client, postId) {
  return request(client, `/posts/${postId}/comments`);
}

export function getAlbums(client, userId) {
  return request(client, `/users/${userId}/albums`);
}

export function getPhotos(client, albumId) {
  return request(client, `/albums/${albumId}/photos`);
}

export function getTodos(client, userId) {
  return request(client, `/users/${userId}/todos`);
}

export function createPost(client, post) {
  return request(client, '/posts', { method: 'POST', body: JSON.stringify(post) });
}

export function updatePost(client, post) {
  return request(client, `/posts/${post.id}`, { method: 'PUT', body: JSON.stringify(post) });
}

export function deletePost(client, id) {
  return request(client, `/posts/${id}`, { method: 'DELETE' });
}

export function searchUsers(client, keyword) {
  return request(client, `/users?q=${encodeURIComponent(keyword)}`);
}
