import { fetchPlugins } from './api.js';
import { loadComponent } from './components.js';
import { renderPagination } from './pagination.js';
import { createPluginCardSkeleton } from './utils/skeleton.js';
import { formatTimeAgo } from './utils/time.js';
import { formatPluginName } from './utils/format.js';
import { Icon, STAR_ICON, FORK_ICON, TIME_ICON } from './utils/icons.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Load header and footer components first
  await Promise.all([
    loadComponent('header', '/components/header.html'),
    loadComponent('footer', '/components/footer.html')
  ]);

  // Get initial state from URL
  const urlParams = new URLSearchParams(window.location.search);
  let currentPage = parseInt(urlParams.get('page')) || 1;
  let searchQuery = urlParams.get('q') || '';
  let selectedTag = urlParams.get('tag') || '';
  let selectedAuthor = urlParams.get('author') || '';
  let currentFilter = urlParams.get('filter') || ''; // default to featured
  const pluginsPerPage = 9;

  // Cache DOM elements.
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const pluginsContainer = document.getElementById('plugins');
  const paginationContainer = document.getElementById('pagination');

  // Update UI with initial state
  if (searchQuery) {
    searchInput.value = searchQuery;
  }

  // Update active tag state
  document.querySelectorAll('.h2wp-tag').forEach(link => {
    const href = link.getAttribute('href');
    const isActive = 
      (href === '/' && currentFilter === '' && searchQuery === '' && selectedTag === '') ||
      (href === '/?filter=all' && (currentFilter === 'all' || (searchQuery != '' && selectedTag === ''))) ||
      (selectedTag && href === `/?tag=${selectedTag}`);
    link.classList.toggle('h2wp-tag-active', isActive);
  });

  // Create HTML for a plugin card.
  function createPluginCard(plugin) {
    const pluginDetailsUrl = `/plugin.html?id=${encodeURIComponent(plugin.id)}`;
    const displayName = formatPluginName(plugin.name);

    return `
      <div class="h2wp-plugin-card bg-white rounded shadow p-4">
        <div class="h2wp-plugin-header flex items-center mb-4">
          <a href="${pluginDetailsUrl}">
            <div class="h2wp-plugin-icon mr-4">
              <img src="${plugin.owner.avatar_url}" alt="${plugin.owner.login}" class="w-16 h-16 rounded-full" />
            </div>
          </a>
          <div class="h2wp-plugin-info">
            <h3 class="h2wp-plugin-name text-xl font-semibold cursor-pointer" data-repo-id="${plugin.id}" data-full-name="${plugin.full_name}">
              <a href="${pluginDetailsUrl}">
                ${displayName}
              </a>
            </h3>
            <div class="h2wp-plugin-author text-sm">
              By <a href="/?author=${plugin.owner.login}" class="text-blue-500">${plugin.owner.login}</a>
            </div>
          </div>
        </div>
        <div class="h2wp-plugin-description mb-4">
          ${plugin.description || 'No description provided.'}
        </div>
        <div class="h2wp-plugin-actions">
          <a href="${pluginDetailsUrl}" class="text-blue-500 hover:underline">
            More Details
          </a>
        </div>
        <div class="h2wp-plugin-meta flex justify-between items-center text-sm mb-4">
          <div class="h2wp-meta-stats flex space-x-4">
            <span class="h2wp-meta-stat flex items-center">
              ${Icon(STAR_ICON, '')}
              ${plugin.stargazers_count}
            </span>
            <span class="h2wp-meta-stat flex items-center">
              ${Icon(FORK_ICON, '')}
              ${plugin.forks_count}
            </span>
          </div>
          <div class="flex items-center h2wp-plugin-updated-at">
            ${Icon(TIME_ICON, 'mr-1')}
            <span class="h2wp-meta-date text-gray-500 ml-1">
              ${formatTimeAgo(plugin.pushed_at)}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  // Render the list of plugins.
  function renderPlugins(data) {
    if (data.items && data.items.length > 0) {
      pluginsContainer.innerHTML = data.items.map(createPluginCard).join('');
    } else {
      pluginsContainer.innerHTML = '<p>No plugins found.</p>';
    }
  }

  // Load plugins from the API
  async function loadPlugins() {
    try {
      // Show skeleton loading state
      pluginsContainer.innerHTML = Array(pluginsPerPage)
        .fill(createPluginCardSkeleton())
        .join('');

      const data = await fetchPlugins(currentPage, pluginsPerPage, searchQuery, selectedTag, selectedAuthor, currentFilter);
      renderPlugins(data);
      renderPagination(
        paginationContainer, 
        currentPage, 
        data.total_count || 0, 
        pluginsPerPage
      );
    } catch (error) {
      console.error('Error loading plugins:', error);
      pluginsContainer.innerHTML = '<p>Error loading plugins.</p>';
    }
  }

  // Event handler for search.
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newSearch = searchInput.value.trim();
    const params = new URLSearchParams();
    if (newSearch) params.set('q', newSearch);
    if (selectedTag) params.set('tag', selectedTag);
    // if (selectedAuthor) params.set('author', selectedAuthor);
    params.set('page', '1');
    window.location.search = params.toString();
  });

  // Listen for browser back/forward navigation
  window.addEventListener('popstate', () => {
    loadPlugins();
  });

  loadPlugins();
});
