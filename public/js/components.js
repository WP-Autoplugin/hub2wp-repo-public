/**
 * Loads an HTML snippet from a path into the element with the given ID.
 * @returns Promise that resolves when the component is loaded
 */
export async function loadComponent(elementId, componentPath) {
  try {
    const response = await fetch(componentPath);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = html;
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error loading component from ${componentPath}:`, error);
    return false;
  }
}
