export class Api {
  static async request(baseUrl, path, init) {
    const response = await fetch(baseUrl + path, init);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  static getUser(baseUrl, id) {
    return Api.request(baseUrl, `/users/${id}`);
  }

  static getPost(baseUrl, id) {
    return Api.request(baseUrl, `/posts/${id}`);
  }

  static getComments(baseUrl, postId) {
    return Api.request(baseUrl, `/posts/${postId}/comments`);
  }

  static getAlbums(baseUrl, userId) {
    return Api.request(baseUrl, `/users/${userId}/albums`);
  }

  static getPhotos(baseUrl, albumId) {
    return Api.request(baseUrl, `/albums/${albumId}/photos`);
  }

  static getTodos(baseUrl, userId) {
    return Api.request(baseUrl, `/users/${userId}/todos`);
  }

  static createPost(baseUrl, post) {
    return Api.request(baseUrl, '/posts', { method: 'POST', body: JSON.stringify(post) });
  }

  static updatePost(baseUrl, post) {
    return Api.request(baseUrl, `/posts/${post.id}`, { method: 'PUT', body: JSON.stringify(post) });
  }

  static deletePost(baseUrl, id) {
    return Api.request(baseUrl, `/posts/${id}`, { method: 'DELETE' });
  }

  static searchUsers(baseUrl, keyword) {
    return Api.request(baseUrl, `/users?q=${encodeURIComponent(keyword)}`);
  }
}
