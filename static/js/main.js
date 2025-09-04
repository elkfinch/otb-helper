// Main JavaScript file for OTB Helper - Disc Golf Disc Finder

// Health check function
async function checkHealth() {
    const resultDiv = document.getElementById('health-result');
    
    try {
        resultDiv.innerHTML = '<span class="text-gray-500">Checking...</span>';
        
        const response = await fetch('/health');
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.innerHTML = `<span class="status-success">✓ ${data.message}</span>`;
        } else {
            resultDiv.innerHTML = '<span class="status-error">✗ Health check failed</span>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<span class="status-error">✗ Unable to connect</span>';
        console.error('Health check error:', error);
    }
}

// Disc search functionality
async function searchDiscs(formData) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const searchResults = document.getElementById('searchResults');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsInfo = document.getElementById('resultsInfo');
    
    try {
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        searchResults.classList.add('hidden');
        
        // Build search request - limit to 3 product pages for reasonable response time
        const searchRequest = {
            product_name: formData.get('productName'),
            max_results: 3,
            filters: {}
        };
        
        // Add filters if they have values
        const filterFields = [
            'brand', 'mold', 'plastic_type', 'color', 'rim_color', 'stamp_foil',
            'weight_min', 'weight_max', 'scaled_weight_min', 'scaled_weight_max',
            'flatness_min', 'flatness_max', 'stiffness_min', 'stiffness_max',
            'price_min', 'price_max'
        ];
        
        filterFields.forEach(field => {
            const value = formData.get(field);
            if (value && value.trim() !== '') {
                if (field.includes('_min') || field.includes('_max') || field.includes('price')) {
                    searchRequest.filters[field] = parseFloat(value);
                } else {
                    searchRequest.filters[field] = value.trim();
                }
            }
        });
        
        // Remove empty filters object if no filters were added
        if (Object.keys(searchRequest.filters).length === 0) {
            delete searchRequest.filters;
        }
        
        // Make API request with extended timeout for detailed scraping
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(searchRequest),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
        
        // Show results
        displaySearchResults(data);
        
    } catch (error) {
        console.error('Search error:', error);
        loadingIndicator.classList.add('hidden');
        
        if (error.name === 'AbortError') {
            showNotification('Search timed out. The server is fetching detailed disc information. Please try again.', 'error');
        } else if (error.message.includes('HTTP error')) {
            showNotification(`Search failed: ${error.message}. Please try again.`, 'error');
        } else {
            showNotification('Search failed. Please check your connection and try again.', 'error');
        }
    }
}

function displaySearchResults(data) {
    const searchResults = document.getElementById('searchResults');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsInfo = document.getElementById('resultsInfo');
    
    // Update results info
    resultsInfo.textContent = `Found ${data.total_found} discs in ${data.search_time_ms}ms`;
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    if (data.results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <div class="text-4xl mb-4">🔍</div>
                <p class="text-lg">No discs found for "${data.query}"</p>
                <p class="text-sm">Try adjusting your search terms or filters</p>
            </div>
        `;
    } else {
        // Display each disc
        data.results.forEach(disc => {
            const discCard = createDiscCard(disc);
            resultsContainer.appendChild(discCard);
        });
    }
    
    // Show results section
    searchResults.classList.remove('hidden');
    searchResults.scrollIntoView({ behavior: 'smooth' });
}

function createDiscCard(disc) {
    const card = document.createElement('div');
    card.className = 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow';
    
    const stockClass = disc.stock === 'in_stock' ? 'text-green-600' : 
                      disc.stock === 'out_of_stock' ? 'text-red-600' : 'text-gray-600';
    
    const stockText = disc.stock === 'in_stock' ? '✅ In Stock' : 
                     disc.stock === 'out_of_stock' ? '❌ Out of Stock' : '❓ Unknown';
    
    card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <h4 class="font-semibold text-gray-800 text-lg">${disc.brand} ${disc.mold}</h4>
            ${disc.price ? `<span class="text-lg font-bold text-green-600">$${disc.price}</span>` : ''}
        </div>
        
        <div class="space-y-2 text-sm">
            <div class="grid grid-cols-2 gap-2">
                <div><span class="font-medium">Plastic:</span> ${disc.plastic_type || 'N/A'}</div>
                <div><span class="font-medium">Weight:</span> ${disc.weight ? disc.weight + 'g' : 'N/A'}</div>
                ${disc.color ? `<div><span class="font-medium">Color:</span> ${disc.color}</div>` : ''}
                ${disc.rim_color ? `<div><span class="font-medium">Rim:</span> ${disc.rim_color}</div>` : ''}
                ${disc.flatness ? `<div><span class="font-medium">Flatness:</span> ${disc.flatness}</div>` : ''}
                ${disc.stiffness ? `<div><span class="font-medium">Stiffness:</span> ${disc.stiffness}</div>` : ''}
            </div>
            
            <div class="flex justify-between items-center pt-2 border-t border-gray-100">
                <span class="${stockClass} font-medium">${stockText}</span>
                ${disc.product_url ? `<a href="${disc.product_url}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details →</a>` : ''}
            </div>
        </div>
    `;
    
    return card;
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('OTB Helper - Disc Golf Disc Finder initialized');
    
    // Add fade-in animation to main content
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.classList.add('fade-in');
    }
    
    // Handle search form submission
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(searchForm);
            const productName = formData.get('productName');
            
            if (!productName || productName.trim() === '') {
                showNotification('Please enter a disc name to search', 'error');
                return;
            }
            
            searchDiscs(formData);
        });
    }
    
    // Handle filter toggle
    const toggleFilters = document.getElementById('toggleFilters');
    const filtersSection = document.getElementById('filtersSection');
    
    if (toggleFilters && filtersSection) {
        toggleFilters.addEventListener('click', function() {
            const isHidden = filtersSection.classList.contains('hidden');
            
            if (isHidden) {
                filtersSection.classList.remove('hidden');
                toggleFilters.textContent = '▲ Advanced Filters';
            } else {
                filtersSection.classList.add('hidden');
                toggleFilters.textContent = '▼ Advanced Filters';
            }
        });
    }
});
