async function request(baseUrl, path, init) {
  const response = await fetch(baseUrl + path, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export const api = {
  getUser(baseUrl, id) {
    return request(baseUrl, `/users/${id}`);
  },

  getPost(baseUrl, id) {
    return request(baseUrl, `/posts/${id}`);
  },

  getComments(baseUrl, postId) {
    return request(baseUrl, `/posts/${postId}/comments`);
  },

  getAlbums(baseUrl, userId) {
    return request(baseUrl, `/users/${userId}/albums`);
  },

  getPhotos(baseUrl, albumId) {
    return request(baseUrl, `/albums/${albumId}/photos`);
  },

  getTodos(baseUrl, userId) {
    return request(baseUrl, `/users/${userId}/todos`);
  },

  createPost(baseUrl, post) {
    return request(baseUrl, '/posts', { method: 'POST', body: JSON.stringify(post) });
  },

  updatePost(baseUrl, post) {
    return request(baseUrl, `/posts/${post.id}`, { method: 'PUT', body: JSON.stringify(post) });
  },

  deletePost(baseUrl, id) {
    return request(baseUrl, `/posts/${id}`, { method: 'DELETE' });
  },

  searchUsers(baseUrl, keyword) {
    return request(baseUrl, `/users?q=${encodeURIComponent(keyword)}`);
  },
};
