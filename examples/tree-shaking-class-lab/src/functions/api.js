async function request(baseUrl, path, init) {
  const response = await fetch(baseUrl + path, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function getUser(baseUrl, id) {
  return request(baseUrl, `/users/${id}`);
}

export function getPost(baseUrl, id) {
  return request(baseUrl, `/posts/${id}`);
}

export function getComments(baseUrl, postId) {
  return request(baseUrl, `/posts/${postId}/comments`);
}

export function getAlbums(baseUrl, userId) {
  return request(baseUrl, `/users/${userId}/albums`);
}

export function getPhotos(baseUrl, albumId) {
  return request(baseUrl, `/albums/${albumId}/photos`);
}

export function getTodos(baseUrl, userId) {
  return request(baseUrl, `/users/${userId}/todos`);
}

export function createPost(baseUrl, post) {
  return request(baseUrl, '/posts', { method: 'POST', body: JSON.stringify(post) });
}

export function updatePost(baseUrl, post) {
  return request(baseUrl, `/posts/${post.id}`, { method: 'PUT', body: JSON.stringify(post) });
}

export function deletePost(baseUrl, id) {
  return request(baseUrl, `/posts/${id}`, { method: 'DELETE' });
}

export function searchUsers(baseUrl, keyword) {
  return request(baseUrl, `/users?q=${encodeURIComponent(keyword)}`);
}
