const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8787/v1'
  : 'https://api.hub2wp.com/v1';

/**
 * Fetch plugins with optional search query and tag.
 */
export async function fetchPlugins(page = 1, perPage = 9, query = '', tag = '', author = '', filter = '') {
  const searchQuery = tag ? `${query} topic:${tag}` : query;
  const url = `${API_BASE_URL}/plugins?page=${page}&per_page=${perPage}&q=${encodeURIComponent(searchQuery)}&author=${author}&filter=${filter}`;
  const response = await fetch(url);
  return response.json();
}

/**
 * Fetch details for a single plugin.
 */
export async function fetchPluginDetails(id) {
  const response = await fetch(`${API_BASE_URL}/plugin?id=${id}`);
  return response.json();
}

/**
 * Fetch changelog for a plugin.
 */
export async function fetchChangelog(id) {
  const response = await fetch(`${API_BASE_URL}/changelog?id=${id}`);
  return response.json();
}
