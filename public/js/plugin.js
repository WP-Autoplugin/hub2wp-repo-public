import { fetchPluginDetails, fetchChangelog } from './api.js';
import { loadComponent } from './components.js';
import { toggleSkeleton } from './utils/skeleton.js';
import { formatTimeAgo } from './utils/time.js';
import { formatPluginName } from './utils/format.js';
import {
  Icon,
  USER_ICON,
  STAR_ICON,
  STAR_OUTLINE_ICON,
  FORK_ICON,
  EYE_ICON,
  ISSUE_ICON,
  CLOCK_ICON,
  GITHUB_ICON,
  EXTERNAL_LINK_ICON
} from './utils/icons.js';

const SKELETON_IDS = [
  'pluginIconSkeleton',
  'pluginTitleSkeleton',
  'pluginAuthorSkeleton',
  'pluginButtonsSkeleton',
  'descriptionSkeleton',
  'metadataSkeleton'
];

const CONTENT_IDS = [
  'pluginIcon',
  'pluginTitle',
  'pluginAuthorContent',
  'pluginButtons',
  'descriptionContent',
  'metadataContent'
];

document.addEventListener('DOMContentLoaded', async () => {
  // Show skeletons initially
  toggleSkeleton(true, SKELETON_IDS, CONTENT_IDS);

  // Load header and footer components first
  await Promise.all([
    loadComponent('header', '/components/header.html'),
    loadComponent('footer', '/components/footer.html')
  ]);

  const urlParams = new URLSearchParams(window.location.search);
  const pluginId = urlParams.get('id');
  const contentContainer = document.getElementById('tabContent');

  if (!pluginId) {
    toggleSkeleton(false, SKELETON_IDS, CONTENT_IDS);
    contentContainer.innerHTML = '<p>Error: No plugin ID provided.</p>';
    return;
  }

  try {
    const details = await fetchPluginDetails(pluginId);
    const { repo, readmeHTML, headers, isCompatible, downloadUrl, mainBranch } = details;

    if (!isCompatible) {
      toggleSkeleton(false, SKELETON_IDS, CONTENT_IDS);
      // Remove .plugin-header & .nav-tabs
      const pluginHeader = document.querySelector('.plugin-header');
      const navTabs = document.querySelector('.nav-tabs');
      pluginHeader.remove();
      navTabs.remove();

      const mainContainer = document.querySelector('body > .container');
      mainContainer.innerHTML = `
        <div class="p-4 mx-auto max-w-4xl text-center">
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <h2 class="text-xl font-bold mb-2">Compatibility Unknown</h2>
            <p class="mb-2">We couldn't find compatibility information for this plugin. It may not be directly compatible with WordPress.</p>
            <p>For more information, please visit the plugin's GitHub repository:</p>
            <a href="${repo.html_url}" class="text-blue-500" target="_blank">${repo.html_url}</a>
          </div>
          <div class="mt-8">
            <p class="mb-4">
            <a href="/" class="text-blue-500">← Back to browse</a>
            or try searching for another plugin:
            </p>
            <form action="/" method="get" class="flex justify-center gap-2">
              <input type="text" 
                     name="q" 
                     class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="Search plugins...">
              <button type="submit" 
                      class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Search
              </button>
            </form>
          </div>
        </div>
      `;
      return;
    }

    // Convert relative image URLs to absolute GitHub URLs.
    const convertImagesToAbsolute = (html, owner, repoName, branch) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
          const cleanPath = src.startsWith('/') ? src.substring(1) : src;
          img.setAttribute('src', `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${cleanPath}`);
        }
      });
      return doc.body.innerHTML;
    };

    const processedReadme = readmeHTML
      ? convertImagesToAbsolute(readmeHTML, repo.owner.login, repo.name, mainBranch)
      : 'No description available.';

    // Update image, title, author
    const pluginIcon = document.getElementById('pluginIcon');
    pluginIcon.src = repo.owner.avatar_url;
    pluginIcon.onload = () => {
      document.getElementById('pluginIconSkeleton').classList.add('hidden');
      pluginIcon.classList.remove('hidden');
    };

    const displayName = formatPluginName(repo.name);
    document.getElementById('pluginTitle').textContent = displayName;

    document.getElementById('pluginAuthorLink').innerHTML = `${repo.owner.login}`;
    document.getElementById('pluginAuthorLink').href = `/author.html?author=${repo.owner.login}`;

    // Sanitize readme content.
    const sanitizedReadme = readmeHTML
      ? DOMPurify.sanitize(processedReadme, {
          ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'code',
            'pre', 'strong', 'em', 'img', 'blockquote', 'iframe', 'table', 'thead',
            'tbody', 'tr', 'th', 'td', 'br', 'hr', 'div', 'span', 'del', 'ins',
            'sub', 'sup', 'abbr', 'address', 'bdo', 'big', 'cite', 'dfn', 'kbd',
            'q', 'samp', 'small', 'tt', 'var', 'caption', 'col', 'colgroup', 'details',
            'summary'
          ],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'width', 'height', 'align']
        })
      : 'No description available.';

    // Render description tab content.
    document.getElementById('description').innerHTML = `
      <div class="tab-content-inner">
          <div>${sanitizedReadme}</div>
      </div>
    `;

    // Update meta sidebar and hide items that don't have values
    const updateMetaItem = (id, value, className) => {
      const element = document.getElementById(id);
      const wrapper = element.closest(`.${className}`);
      if (value) {
      element.textContent = value;
      wrapper.style.display = 'flex';
      } else {
      wrapper.style.display = 'none';
      }
    };

    updateMetaItem('metaVersion', headers.stableTag, 'meta-version');
    updateMetaItem('metaLastUpdated', repo.pushed_at ? new Date(repo.pushed_at).toISOString().slice(0, 16).replace('T', ' ') : null, 'meta-last-updated');
    updateMetaItem('metaCreated', new Date(repo.created_at).toISOString().slice(0, 16).replace('T', ' '), 'meta-created');
    updateMetaItem('metaRequiresWp', headers.requiresAtLeast, 'meta-requires-wp');
    updateMetaItem('metaTestedWp', headers.testedUpTo, 'meta-tested-wp');
    updateMetaItem('metaRequiresPHP', headers.requiresPHP, 'meta-requires-php');

    // Update linkGitHub, linkHomepage, starsCount, tagsContent
    document.getElementById('linkGitHub').href = repo.html_url;
    if (repo.homepage) {
      document.getElementById('linkHomepage').href = repo.homepage;
    } else {
      document.getElementById('linkHomepage').style.display = 'none';
    }
    document.getElementById('starsCount').textContent = repo.stargazers_count;
    document.getElementById('starsIcon').innerHTML = Icon(STAR_ICON, 'text-yellow-500 w-5 h-5 mr-2');

    // tags (repo topics) are clickable and should link to a search page
    const skipTags = ['wordpress-plugin', 'wordpress-plugins', 'wordpress', 'plugin', 'wp-plugin', 'wp'];
    const tagsContent = document.getElementById('tagsContent');
    tagsContent.innerHTML = repo.topics
      .filter(tag => !skipTags.includes(tag))
      .map(tag => `<a href="/?tag=${tag}" class="tag">#${tag}</a>`)
      .join(' ');

    document.getElementById('downloadButton').href = downloadUrl;
    document.getElementById('githubButton').href = repo.html_url;

    const metaHtml = `
      <div class="tab-content-inner">
        <div class="bg-white rounded-lg p-6">
          <h3 class="text-xl font-semibold mb-6">GitHub Meta</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div class="bg-gray-50 rounded-lg p-4 flex flex-col">
              <div class="flex items-center mb-2">
                ${Icon(USER_ICON)}
                <span class="text-sm text-gray-600">Author:</span>
              </div>
              <span class="font-medium">
                <a href="${repo.owner.html_url}" target="_blank" class="text-blue-500">
                  <span>${repo.owner.login}</span>
                  ${Icon(EXTERNAL_LINK_ICON, 'inline-block w-4 h-4')}
                </a>
              </span>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 flex flex-col">
              <div class="flex items-center mb-2">
                ${Icon(STAR_OUTLINE_ICON)}
                <span class="text-sm text-gray-600">Stars:</span>
              </div>
              <span class="font-medium">${repo.stargazers_count.toLocaleString()}</span>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 flex flex-col">
              <div class="flex items-center mb-2">
                ${Icon(FORK_ICON)}
                <span class="text-sm text-gray-600">Forks:</span>
              </div>
              <span class="font-medium">${repo.forks_count.toLocaleString()}</span>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 flex flex-col">
              <div class="flex items-center mb-2">
                ${Icon(EYE_ICON)}
                <span class="text-sm text-gray-600">Watchers:</span>
              </div>
              <span class="font-medium">${repo.subscribers_count.toLocaleString()}</span>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 flex flex-col">
              <div class="flex items-center mb-2">
                ${Icon(ISSUE_ICON)}
                <span class="text-sm text-gray-600">Open Issues:</span>
              </div>
              <span class="font-medium">${repo.open_issues_count.toLocaleString()}</span>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 flex flex-col">
              <div class="flex items-center mb-2">
                ${Icon(CLOCK_ICON)}
                <span class="text-sm text-gray-600">Last Updated:</span>
              </div>
              <span class="font-medium" title="${repo.pushed_at} UTC">
                ${formatTimeAgo(repo.pushed_at)}
              </span>
            </div>
          </div>

          <div class="border-t pt-6">
            <h4 class="text-lg font-medium mb-3">Topics:</h4>
            <div class="flex flex-wrap gap-2">
              ${repo.topics.filter(tag => !skipTags.includes(tag))
                .map(tag => `
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-blue-500">
                    <a href="/?tag=${tag}" class="hover:text-blue-900">${tag}</a>
                  </span>`)
                .join('')}
            </div>
          </div>

          <div class="mt-6 pt-6 border-t">
            <a href="${repo.html_url}" 
               target="_blank" 
               class="h2wp-button h2wp-button-primary">
              ${Icon(GITHUB_ICON, 'w-5 h-5 mr-2 text-white')}
              View plugin on GitHub
            </a>
          </div>
        </div>
      </div>
    `;
    document.getElementById('meta').innerHTML = metaHtml;

    const installationHtml = `
      <div class="tab-content-inner space-y-8">
        <h2 class="text-2xl font-bold mb-6">Installation</h2>
        
        <div class="bg-white rounded-lg p-6 shadow-sm border">
          <h3 class="text-xl font-semibold mb-4">Installation via <a href="/plugin?id=903597688" class="text-blue-500">hub2wp</a></h3>
          <ol class="list-decimal pl-6 space-y-3">
            <li>Navigate to <strong>Plugins → Add GitHub Plugin</strong> in your WordPress admin panel</li>
            <li>Search for <strong class="h2wp-modal-title">${repo.name}</strong></li>
            <li>Find the plugin and click <strong>Install</strong></li>
            <li>Activate the plugin through the WordPress Plugins menu</li>
          </ol>
        </div>

        <div class="bg-white rounded-lg p-6 shadow-sm border">
          <h3 class="text-xl font-semibold mb-4">Manual Installation</h3>
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              Download the plugin ZIP file:
              <div class="mt-2">
                <a href="${downloadUrl}" 
                   class="h2wp-button h2wp-button-primary">
                  Download Latest Version
                </a>
              </div>
            </li>
            <li>Upload the plugin ZIP file through the WordPress admin panel or extract the ZIP file to your <code class="bg-gray-100 p-1 rounded">wp-content/plugins</code> directory</li>
            <li>Activate the plugin</li>
          </ol>
        </div>

        <div class="bg-white rounded-lg p-6 shadow-sm border">
          <h3 class="text-xl font-semibold mb-4">Installation via Git</h3>
          <p class="mb-4">You can also clone the repository directly if you prefer using Git:</p>
          <div class="bg-gray-100 p-4 rounded-lg font-mono text-sm">
            <code>git clone ${repo.clone_url}</code>
          </div>
        </div>
      </div>
    `;
    document.getElementById('installation').innerHTML = installationHtml;

    // Tab switching helper function
    const switchToTab = (tabId) => {
      const tabLinks = document.querySelectorAll('.tab-link');
      tabLinks.forEach(l => l.classList.remove('active'));
      const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
      if (activeTab) {
        activeTab.classList.add('active');
      }
      document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
      document.getElementById(tabId).classList.remove('hidden');
    };

    // Tab switching logic with URL fragment handling
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(link => {
      link.addEventListener('click', async (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        
        // Update the URL without scrolling
        history.replaceState(null, null, `#${tabId}`);
        
        switchToTab(tabId);

        // Load changelog if tab is clicked
        if (tabId === 'changelog' && !document.getElementById('changelog').dataset.loaded) {
          await loadChangelog(pluginId);
        }
      });
    });

    // Check for fragment on page load and load content if needed
    const fragment = window.location.hash.slice(1);
    if (fragment && document.getElementById(fragment)) {
      if (fragment === 'changelog' && !document.getElementById('changelog').dataset.loaded) {
        await loadChangelog(pluginId);
      }
      switchToTab(fragment);
    } else {
      // Default to description tab if no fragment or invalid fragment
      switchToTab('description');
    }

    // Show content and hide skeletons after loading
    toggleSkeleton(false, SKELETON_IDS, CONTENT_IDS);
  } catch (error) {
    console.error('Error loading plugin details:', error);
    toggleSkeleton(false, SKELETON_IDS, CONTENT_IDS);
    contentContainer.innerHTML = '<p>Error loading plugin details.</p>';
  }
});

async function loadChangelog(pluginId) {
  try {
    const changelogContainer = document.getElementById('changelog');
    changelogContainer.innerHTML = '<div class="text-gray-600">Loading changelog...</div>';

    const changelogData = await fetchChangelog(pluginId);

    if (!changelogData.length) {
      changelogContainer.innerHTML = '<div class="tab-content-inner">No changelog available.</div>';
      return;
    }

    let changelogHtml = '<div class="tab-content-inner"><h2 class="text-2xl font-bold">Changelog</h2><ul class="list-disc pl-5">';
    changelogData.forEach(release => {
      // Convert Markdown to HTML and sanitize
      const sanitizedDescription = DOMPurify.sanitize(
        marked.parse(release.description || ''),
        {
          ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'ul', 'ol', 'li', 'code',
            'pre', 'strong', 'em', 'img', 'blockquote', 'iframe', 'table', 'thead',
            'tbody', 'tr', 'th', 'td', 'br', 'hr', 'div', 'span', 'del', 'ins',
            'sub', 'sup', 'abbr', 'address', 'bdo', 'big', 'cite', 'dfn', 'kbd',
            'q', 'samp', 'small', 'tt', 'var', 'caption', 'col', 'colgroup', 'details',
            'summary'
          ],
          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'width', 'height', 'align']
        }
      );

      changelogHtml += `
        <li class="mb-4 border-b pb-4">
          <strong>Version:</strong> ${release.version} ${release.title ? `(${release.title})` : ''}<br>
          <strong>Released:</strong> ${new Date(release.date).toLocaleDateString()}<br>
          <div class="mt-2 changelog-content">${sanitizedDescription}</div>
          <a href="${release.url}" target="_blank" class="text-blue-500">View on GitHub</a>
        </li>`;
    });
    changelogHtml += '</ul></div>';

    changelogContainer.innerHTML = changelogHtml;
    changelogContainer.dataset.loaded = "true";
  } catch (error) {
    document.getElementById('changelog').innerHTML = '<p class="text-red-600">Error loading changelog.</p>';
    console.error(error);
  }
}
