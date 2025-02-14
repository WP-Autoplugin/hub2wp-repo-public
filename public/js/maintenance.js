/**
 * This script is used to show a maintenance message on the site when it is not running on localhost.
 * Use it by adding the script tag to the head of your HTML:
 * <script src="/js/maintenance.js" type="module"></script>
 */

// Immediately replace the page content if not on localhost.
if (window.location.hostname !== 'localhost') {
    document.documentElement.innerHTML = `
      <div style="text-align:center; padding:50px; font-family:sans-serif;">
        <h1>Site Under Maintenance</h1>
        <p>Please check back later.</p>
      </div>
    `;
    throw new Error('Site is under maintenance');
  }
  