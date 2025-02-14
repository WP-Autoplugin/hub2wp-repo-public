export function formatPluginName(name) {
  let displayName = name.replace(/-/g, ' ');
  displayName = displayName.replace(/wp/g, 'WP');
  displayName = displayName.replace(/wordpress/g, 'WordPress');
  displayName = displayName.replace(/seo/g, 'SEO');
  displayName = displayName.replace(/\b\w/g, c => c.toUpperCase());
  displayName = displayName.replace(/Hub2WP/g, 'hub2wp');
  displayName = displayName.replace(/WP Autoplugin/g, 'WP-Autoplugin');
  return displayName;
}
