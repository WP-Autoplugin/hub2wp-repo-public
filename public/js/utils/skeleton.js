export const toggleSkeleton = (show, skeletonIds, contentIds) => {
  skeletonIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('hidden', !show);
    }
  });

  contentIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.toggle('hidden', show);
    }
  });
};

export const createPluginCardSkeleton = () => `
  <div class="h2wp-plugin-card bg-white rounded shadow p-4">
    <div class="h2wp-plugin-header flex items-center mb-4">
      <div class="h2wp-plugin-icon mr-4">
        <div class="w-16 h-16 rounded-full skeleton skeleton-image"></div>
      </div>
      <div class="flex-1">
        <div class="skeleton skeleton-text w-3/4 mb-2"></div>
        <div class="skeleton skeleton-text w-1/2"></div>
      </div>
    </div>
    <div class="space-y-2 mb-4">
      <div class="skeleton skeleton-text w-full"></div>
      <div class="skeleton skeleton-text w-4/5"></div>
    </div>
    <div class="flex justify-between items-center">
      <div class="flex gap-4">
        <div class="skeleton skeleton-text w-12"></div>
        <div class="skeleton skeleton-text w-12"></div>
      </div>
      <div class="skeleton skeleton-text w-24"></div>
    </div>
  </div>
`;
