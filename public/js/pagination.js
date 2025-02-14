// Helper to create an ellipsis element
function createPaginationEllipsis() {
    const ellipsis = document.createElement('span');
    ellipsis.textContent = '...';
    ellipsis.className = 'pagination-ellipsis mx-2';
    return ellipsis;
}

// Create a page number link with URL
function createPageLink(page, isActive = false, currentParams) {
    const element = document.createElement(isActive ? 'span' : 'a');
    element.textContent = page;
    if (isActive) {
        element.className = 'current font-bold';
    } else {
        currentParams.set('page', page);
        element.href = `?${currentParams.toString()}`;
        element.className = 'pagination-link text-blue-500';
    }
    return element;
}

// Create a navigation button (first/last) with URL
function createNavButton(text, page, currentParams) {
    const button = document.createElement('a');
    currentParams.set('page', page);
    button.href = `?${currentParams.toString()}`;
    button.textContent = text;
    button.className = 'pagination-nav text-blue-500 mx-1';
    return button;
}

// Render pagination controls
export function renderPagination(container, current, totalCount, itemsPerPage) {
    container.innerHTML = '';
    const GITHUB_API_LIMIT = 1000;
    const maxAvailableItems = Math.min(totalCount, GITHUB_API_LIMIT);
    const totalPages = Math.min(Math.ceil(maxAvailableItems / itemsPerPage), Math.ceil(GITHUB_API_LIMIT / itemsPerPage));
    
    if (totalPages <= 1) return;

    // Get current URL parameters
    const currentParams = new URLSearchParams(window.location.search);

    if (current > 1) {
        container.appendChild(createNavButton('«', 1, currentParams));
    }
    container.appendChild(createPageLink(1, current === 1, currentParams));

    if (current > 4) {
        container.appendChild(createPaginationEllipsis());
    }

    for (let i = Math.max(2, current - 2); i <= Math.min(totalPages - 1, current + 2); i++) {
        container.appendChild(createPageLink(i, i === current, currentParams));
    }

    if (current < totalPages - 3) {
        container.appendChild(createPaginationEllipsis());
    }

    if (totalPages > 1) {
        container.appendChild(createPageLink(totalPages, current === totalPages, currentParams));
    }

    if (current < totalPages) {
        container.appendChild(createNavButton('»', totalPages, currentParams));
    }
}
