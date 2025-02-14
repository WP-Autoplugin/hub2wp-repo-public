/*
  worker.js - Cloudflare Worker script for backend API.
 */

// Import list of featured plugins from public/js/config.js
import { FEATURED_PLUGINS } from "./public/js/config.js";

// Helper module for common utilities
const ResponseHelper = {
  corsHeaders: (allowedOrigin) => ({
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }),

  jsonResponse: (data, status = 200, allowedOrigin) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...ResponseHelper.corsHeaders(allowedOrigin),
      },
    }),

  errorResponse: (message, status = 500, allowedOrigin, additionalData = {}) =>
    ResponseHelper.jsonResponse(
      { error: message, ...additionalData },
      status,
      allowedOrigin
    ),
};

// GitHub API client module
class GitHubClient {
  constructor(env) {
    if (!env.GITHUB_PAT) throw new Error("Missing GitHub PAT");
    this.env = env;
  }

  async fetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `token ${this.env.GITHUB_PAT}`,
        "User-Agent": "Hub2WP-Application",
        "Accept": "application/vnd.github.v3+json",
        ...options.headers,
      },
    });

    // Enable rate limit info logging
    // this.logRateLimit(url, response);
    return response;
  }

  logRateLimit(url, response) {
    const rateLimitInfo = {
      remaining: response.headers.get("x-ratelimit-remaining"),
      reset: new Date(
        Number(response.headers.get("x-ratelimit-reset")) * 1000
      ).toISOString(),
      limit: response.headers.get("x-ratelimit-limit"),
      used: response.headers.get("x-ratelimit-used"),
    };

    console.log(`GitHub API Rate Limit [${url}]:`, rateLimitInfo);
  }
}

// Cache helper module
class CacheManager {
  constructor(env) {
    this.cache = env.REPO_CACHE;
  }

  async get(key) {
    return this.cache ? await this.cache.get(key) : null;
  }

  async put(key, value, options = { expirationTtl: 86400 }) {
    return this.cache && (await this.cache.put(key, value, options));
  }
}

// Route handler mappings
const ROUTES = [
  {
    path: "/v1/plugins",
    handler: handlePlugins,
    methods: ["GET"],
  },
  {
    path: "/v1/plugin",
    handler: handlePluginDetail,
    methods: ["GET"],
  },
  {
    path: "/v1/changelog",
    handler: handleChangelog,
    methods: ["GET"],
  },
];

export default {
  async fetch(request, env, ctx) {
    const allowedOrigin = env.ENVIRONMENT === "development"
      ? "http://localhost:8788"
      : "https://hub2wp.com";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: ResponseHelper.corsHeaders(allowedOrigin),
      });
    }

    let cacheStatus = "MISS"; // Default cache status
    const cache = caches.default;

    // Only cache GET requests (note: doesn't work locally in `wrangler dev`)
    if (request.method === "GET") {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          headers: {
            ...Object.fromEntries(cachedResponse.headers),
            "X-Cache-Status": "HIT", // Modify response with cache status
          },
        });
      }
    }

    // Route processing
    const url = new URL(request.url);
    const route = ROUTES.find((r) => url.pathname.startsWith(r.path));
    if (!route) {
      return ResponseHelper.errorResponse("Not found", 404, allowedOrigin);
    }

    // Generate fresh response
    const response = await route.handler(request, env, allowedOrigin);

    // Clone response before caching & adding headers
    if (request.method === "GET" && response.status === 200) {
      const responseClone = response.clone(); // Clone before consuming body
      ctx.waitUntil(cache.put(request, responseClone)); // Store in Cloudflare cache
      cacheStatus = "MISS"; // Set status correctly
    }

    // Return response with correct cache status
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        "X-Cache-Status": cacheStatus,
      },
    });
  },
};


async function handlePlugins(request, env, allowedOrigin) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page")) || 1;
  const perPage = parseInt(searchParams.get("per_page")) || 10;
  const queryParam = searchParams.get("q") || "";
  const authorParam = searchParams.get("author") || "";
  const filter = searchParams.get("filter") || "";
  
  let query = "";
  let isFeatured = false;
  if (filter == "" && authorParam == "" && queryParam == "") {
    // Create featured plugins query
    query = FEATURED_PLUGINS.map(repo => `repo:${repo}`).join(' ');
    isFeatured = true;
  } else {
    query = "topic:wordpress-plugin";
    
    if (authorParam != "") {
      query = `user:${authorParam} ${query}`;
    }
    
    if (queryParam != "") {
      query = `${queryParam} in:name,description,readme ${query}`;
    }

    if (queryParam == "" && authorParam == "") {
      query += " in:readme \"stable tag\"";
    }
  }

  const cacheKey = `plugins:${page}:${perPage}:${queryParam}:${authorParam}:${filter}`;

  const cache = new CacheManager(env);
  const cached = await cache.get(cacheKey);

  if (cached) {
    return ResponseHelper.jsonResponse(JSON.parse(cached), 200, allowedOrigin);
  }

  let params = `&sort=stars&order=desc&page=${page}&per_page=${perPage}`;

  const github = new GitHubClient(env);
  const githubURL = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    query
  )}${params}`;

  try {
    const response = await github.fetch(githubURL);
    
    if (!response.ok) {
      return handleGitHubError(response, allowedOrigin);
    }

    const data = await response.json();
    
    // Let's reorder the repos to match the order of FEATURED_PLUGINS (compare full_name)
    if (isFeatured) {
      const orderedItems = [];
      for (const featuredRepo of FEATURED_PLUGINS) {
        const found = data.items.find(item => item.full_name === featuredRepo);
        if (found) {
          orderedItems.push(found);
        }
      }
      data.items = orderedItems;
    }

    await cache.put(cacheKey, JSON.stringify(data));
    return ResponseHelper.jsonResponse(data, 200, allowedOrigin);
  } catch (error) {
    console.error("GitHub API error:", error);
    return ResponseHelper.errorResponse(
      "Failed to fetch data from GitHub",
      502,
      allowedOrigin
    );
  }
}

async function handlePluginDetail(request, env, allowedOrigin) {
  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get("id");
  
  if (!repoId) {
    return ResponseHelper.errorResponse(
      "Missing repo id",
      400,
      allowedOrigin
    );
  }

  const cacheKey = `plugin-detail:${repoId}`;
  const cache = new CacheManager(env);
  const cached = await cache.get(cacheKey);

  if (cached) {
    return ResponseHelper.jsonResponse(JSON.parse(cached), 200, allowedOrigin);
  }

  try {
    const github = new GitHubClient(env);
    const repoURL = `https://api.github.com/repositories/${repoId}`;
    const repoRes = await github.fetch(repoURL);

    if (!repoRes.ok) {
      return handleGitHubError(repoRes, allowedOrigin);
    }

    const repoData = await repoRes.json();
    const [readmeData, readmeHTML] = await Promise.all([
      fetchReadmeContent(repoData.owner.login, repoData.name, env),
      fetchReadmeHTML(repoData.owner.login, repoData.name, env),
    ]);

    const headers = readmeData ? extractReadmeHeaders(readmeData) : {};
    const isCompatible = Boolean(headers.stableTag);

    // @todo maybe implement long-term storage later with D1
    // await updatePluginCompatibility(repoId, isCompatible, env);

    const result = {
      repo: repoData,
      readme: readmeData || '',
      readmeHTML: readmeHTML || '',
      isCompatible,
      headers,
      downloadUrl: `https://api.github.com/repos/${repoData.full_name}/zipball`,
      mainBranch: repoData.default_branch || "master",
    };

    await cache.put(cacheKey, JSON.stringify(result));
    return ResponseHelper.jsonResponse(result, 200, allowedOrigin);
  } catch (error) {
    console.error("Plugin detail error:", error);
    return ResponseHelper.errorResponse(
      error.message || "Internal server error",
      error.status || 500,
      allowedOrigin
    );
  }
}

async function fetchReadmeContent(owner, repo, env) {
  const cacheKey = `readme:${owner}/${repo}`;
  const cache = new CacheManager(env);
  const cached = await cache.get(cacheKey);
  
  if (cached) return cached;

  const filenames = ["readme.txt", "README.txt"];
  const github = new GitHubClient(env);

  for (const filename of filenames) {
    try {
      const response = await github.fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const content = atob(data.content);
        await cache.put(cacheKey, content);
        return content;
      }
    } catch (error) {
      console.error(`Error fetching ${filename}:`, error);
    }
  }

  // Fallback to readme endpoint
  try {
    const response = await github.fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`
    );
    
    if (response.ok) {
      const data = await response.json();
      const content = atob(data.content);
      await cache.put(cacheKey, content);
      return content;
    }
  } catch (error) {
    console.error('Error fetching readme:', error);
  }

  return null;
}

async function fetchReadmeHTML(owner, repo, env) {
  const cacheKey = `readme_html:${owner}/${repo}`;
  const cache = new CacheManager(env);
  const cached = await cache.get(cacheKey);
  
  if (cached) return cached;

  const github = new GitHubClient(env);
  try {
    const response = await github.fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers: { Accept: "application/vnd.github.v3.html" } }
    );

    if (response.ok) {
      const html = await response.text();
      await cache.put(cacheKey, html);
      return html;
    }
  } catch (error) {
    console.error('Error fetching readme HTML:', error);
  }

  return null;
}

function extractReadmeHeaders(readme) {
  const headers = {};
  
  // Strip Markdown and HTML
  const cleanReadme = readme
    .replace(/[*_`#]/g, '') // Remove Markdown markers
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, '') // Remove HTML entities
    .trim();

  const patterns = {
    requiresAtLeast: /requires at least:\s*([\d.]+)/i,
    testedUpTo: /tested up to:\s*([\d.]+)/i,
    requiresPHP: /requires php:\s*([\d.]+)/i,
    stableTag: /stable tag:\s*([\d.v]+|trunk|master|main|dev|develop)/i,
  };

  for (const [key, regex] of Object.entries(patterns)) {
    const match = cleanReadme.match(regex);
    headers[key] = match?.[1]?.trim() || "";
  }

  return headers;
}

async function updatePluginCompatibility(repoId, isCompatible, env) {
  if (!env.DB) throw new Error("Database connection not available");

  const exists = await env.DB.prepare(
    "SELECT repo_id FROM plugin_compatibility WHERE repo_id = ?"
  )
    .bind(repoId)
    .first();

  const query = exists
    ? "UPDATE plugin_compatibility SET is_compatible = ?, last_checked = CURRENT_TIMESTAMP WHERE repo_id = ?"
    : "INSERT INTO plugin_compatibility (repo_id, is_compatible, last_checked) VALUES (?, ?, CURRENT_TIMESTAMP)";
  
  const params = exists ? [isCompatible, repoId] : [repoId, isCompatible];

  await env.DB.prepare(query)
    .bind(...params)
    .run();
}

function handleGitHubError(response, allowedOrigin) {
  const rateLimit = {
    remaining: response.headers.get("x-ratelimit-remaining"),
    reset: new Date(
      Number(response.headers.get("x-ratelimit-reset")) * 1000
    ).toISOString(),
    limit: response.headers.get("x-ratelimit-limit"),
  };

  console.error(`GitHub API error: ${response.status} ${response.statusText}`);

  if (response.status === 403) {
    return ResponseHelper.errorResponse(
      "GitHub API rate limit exceeded",
      403,
      allowedOrigin,
      { rateLimit }
    );
  }

  return ResponseHelper.errorResponse(
    "Failed to fetch data from GitHub",
    502,
    allowedOrigin,
    { status: response.status, statusText: response.statusText }
  );
}

async function handleChangelog(request, env, allowedOrigin) {
  const { searchParams } = new URL(request.url);
  const repoId = searchParams.get("id");
  if (!repoId) {
    return ResponseHelper.errorResponse("Missing repo id", 400, allowedOrigin);
  }

  const cacheKey = `changelog:${repoId}`;
  const cache = new CacheManager(env);
  const cached = await cache.get(cacheKey);
  if (cached) {
    return ResponseHelper.jsonResponse(JSON.parse(cached), 200, allowedOrigin);
  }

  // Get repo details first to extract owner and repo name.
  const github = new GitHubClient(env);
  const repoURL = `https://api.github.com/repositories/${repoId}`;
  const repoRes = await github.fetch(repoURL);
  if (!repoRes.ok) {
    return handleGitHubError(repoRes, allowedOrigin);
  }
  const repoData = await repoRes.json();

  // Fetch releases from GitHub.
  const releasesURL = `https://api.github.com/repos/${repoData.owner.login}/${repoData.name}/releases`;
  const releasesRes = await github.fetch(releasesURL);
  if (!releasesRes.ok) {
    return handleGitHubError(releasesRes, allowedOrigin);
  }
  const releases = await releasesRes.json();

  // Format releases into a changelog array.
  const changelog = releases.map(release => ({
    version: release.tag_name.replace(/^v/, ''),
    title: release.name,
    description: release.body,
    date: release.published_at,
    url: release.html_url,
  }));

  await cache.put(cacheKey, JSON.stringify(changelog));
  return ResponseHelper.jsonResponse(changelog, 200, allowedOrigin);
}

