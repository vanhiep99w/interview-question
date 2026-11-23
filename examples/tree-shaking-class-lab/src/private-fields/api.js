export class ApiClient {
  #baseUrl;

  constructor(baseUrl) {
    this.#baseUrl = baseUrl;
  }

  async #request(path, init) {
    const response = await fetch(this.#baseUrl + path, init);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  getUser(id) {
    return this.#request(`/users/${id}`);
  }

  getPost(id) {
    return this.#request(`/posts/${id}`);
  }

  getComments(postId) {
    return this.#request(`/posts/${postId}/comments`);
  }

  getAlbums(userId) {
    return this.#request(`/users/${userId}/albums`);
  }

  getPhotos(albumId) {
    return this.#request(`/albums/${albumId}/photos`);
  }

  getTodos(userId) {
    return this.#request(`/users/${userId}/todos`);
  }

  createPost(post) {
    return this.#request('/posts', { method: 'POST', body: JSON.stringify(post) });
  }

  updatePost(post) {
    return this.#request(`/posts/${post.id}`, { method: 'PUT', body: JSON.stringify(post) });
  }

  deletePost(id) {
    return this.#request(`/posts/${id}`, { method: 'DELETE' });
  }

  searchUsers(keyword) {
    return this.#request(`/users?q=${encodeURIComponent(keyword)}`);
  }
}
