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
            'brand', 'mold', 'plastic_type', 'plastic_color', 'rim_color', 'stamp_foil',
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
    console.log('🔍 displaySearchResults called with data:', data);
    
    try {
        console.log('📋 Looking for DOM elements...');
        const searchResults = document.getElementById('searchResults');
        const cardContainer = document.getElementById('cardContainer');
        const tableContainer = document.getElementById('tableContainer');
        const tableBody = document.getElementById('tableBody');
        const resultsInfo = document.getElementById('resultsInfo');
        
        console.log('📋 DOM element check:', {
            searchResults: !!searchResults,
            cardContainer: !!cardContainer,
            tableContainer: !!tableContainer,
            tableBody: !!tableBody,
            resultsInfo: !!resultsInfo
        });
        
        // Check if all required elements exist
        if (!searchResults || !cardContainer || !tableContainer || !tableBody || !resultsInfo) {
            console.error('❌ Missing required DOM elements for search results');
            console.error('Missing elements:', {
                searchResults: !searchResults ? 'MISSING' : 'found',
                cardContainer: !cardContainer ? 'MISSING' : 'found',
                tableContainer: !tableContainer ? 'MISSING' : 'found',
                tableBody: !tableBody ? 'MISSING' : 'found',
                resultsInfo: !resultsInfo ? 'MISSING' : 'found'
            });
            showNotification('Display error: Missing page elements. Please refresh the page.', 'error');
            return;
        }
        
        console.log('✅ All DOM elements found, proceeding...');
        
        // Store data globally for view switching
        window.currentSearchData = data;
        console.log('💾 Stored search data globally');
        
        // Update results info
        console.log('📊 Updating results info...');
        resultsInfo.textContent = `Found ${data.total_found} discs in ${data.search_time_ms}ms`;
        console.log('✅ Results info updated');
        
        // Clear previous results
        console.log('🧹 Clearing previous results...');
        cardContainer.innerHTML = '';
        tableBody.innerHTML = '';
        console.log('✅ Previous results cleared');
        
        if (data.results.length === 0) {
            console.log('📭 No results found, showing empty state');
            cardContainer.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <div class="text-4xl mb-4">🔍</div>
                    <p class="text-lg">No discs found for "${data.query}"</p>
                    <p class="text-sm">Try adjusting your search terms or filters</p>
                </div>
            `;
        } else {
            console.log(`📦 Processing ${data.results.length} results...`);
            // Populate both views
            try {
                console.log('🃏 Calling displayCardsView...');
                displayCardsView(data.results);
                console.log('✅ Cards view populated');
                
                console.log('📋 Calling displayTableView...');
                displayTableView(data.results);
                console.log('✅ Table view populated');
            } catch (error) {
                console.error('❌ Error in view population:', error);
                console.error('Error stack:', error.stack);
                showNotification('Error displaying search results. Please try again.', 'error');
                return;
            }
        }
        
        // Show results section
        console.log('👁️ Showing results section...');
        searchResults.classList.remove('hidden');
        searchResults.scrollIntoView({ behavior: 'smooth' });
        console.log('✅ displaySearchResults completed successfully');
        
    } catch (error) {
        console.error('💥 Fatal error in displaySearchResults:', error);
        console.error('Error stack:', error.stack);
        console.error('Data received:', data);
        showNotification('Critical error displaying results. Please refresh and try again.', 'error');
    }
}

function createDiscCard(disc) {
    const card = document.createElement('div');
    card.className = 'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow';
    
    const stockClass = disc.stock === 'in_stock' ? 'text-green-600' : 
                      disc.stock === 'out_of_stock' ? 'text-red-600' : 'text-gray-600';
    
    const stockText = disc.stock === 'in_stock' ? '✅ In Stock' : 
                     disc.stock === 'out_of_stock' ? '❌ Out of Stock' : '❓ Unknown';
    
    // Create image element with fallback
    const imageHtml = disc.image_url ? 
        `<div class="card-image-container mb-3">
            <img src="${disc.image_url}" alt="${disc.mold} - ${disc.plastic_type}" class="w-full h-32 object-contain rounded bg-gray-50 disc-image" onerror="this.style.display='none'">
        </div>` :
        `<div class="w-full h-32 bg-gray-100 rounded mb-3 flex items-center justify-center text-gray-400 text-sm">No Image</div>`;
    
    card.innerHTML = `
        ${imageHtml}
        <div class="flex justify-between items-start mb-3">
            <h4 class="font-semibold text-gray-800 text-lg">${disc.plastic_type || 'N/A'}</h4>
            ${disc.price ? `<span class="text-lg font-bold text-green-600">$${disc.price}</span>` : ''}
        </div>
        
        <div class="space-y-2 text-sm">
            <div class="grid grid-cols-2 gap-2">
                <div><span class="font-medium">Stamp Foil:</span> ${disc.stamp_foil || 'N/A'}</div>
                <div><span class="font-medium">Weight:</span> ${disc.weight ? disc.weight + 'g' : 'N/A'}</div>
                ${disc.plastic_color ? `<div><span class="font-medium">Plastic Color:</span> ${disc.plastic_color}</div>` : ''}
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

function displayCardsView(discs) {
    console.log('🃏 displayCardsView called with', discs.length, 'discs');
    
    const cardContainer = document.getElementById('cardContainer');
    if (!cardContainer) {
        console.error('❌ cardContainer element not found');
        return;
    }
    
    console.log('✅ cardContainer found, clearing...');
    cardContainer.innerHTML = '';
    
    console.log('📝 Creating cards for each disc...');
    discs.forEach((disc, index) => {
        try {
            console.log(`🃏 Creating card ${index + 1}/${discs.length} for:`, disc.mold);
            const discCard = createDiscCard(disc);
            cardContainer.appendChild(discCard);
        } catch (error) {
            console.error(`❌ Error creating disc card ${index + 1}:`, error, disc);
        }
    });
    
    console.log('✅ displayCardsView completed');
}

function displayTableView(discs) {
    console.log('📋 displayTableView called with', discs.length, 'discs');
    
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) {
        console.error('❌ tableBody element not found');
        return;
    }
    
    console.log('✅ tableBody found, clearing...');
    tableBody.innerHTML = '';
    
    console.log('📝 Creating table rows for each disc...');
    discs.forEach((disc, index) => {
        try {
            console.log(`📋 Creating row ${index + 1}/${discs.length} for:`, disc.mold);
            const row = createTableRow(disc);
            tableBody.appendChild(row);
        } catch (error) {
            console.error(`❌ Error creating table row ${index + 1}:`, error, disc);
        }
    });
    
    console.log('✅ displayTableView completed');
}

function createTableRow(disc) {
    const row = document.createElement('tr');
    row.className = 'table-row hover:bg-gray-50';
    
    const stockClass = disc.stock === 'in_stock' ? 'text-green-600 bg-green-50' :
                      disc.stock === 'out_of_stock' ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50';
    const stockText = disc.stock === 'in_stock' ? 'In Stock' :
                     disc.stock === 'out_of_stock' ? 'Out of Stock' : 'Unknown';
    
    // Create image element with fallback
    const imageHtml = disc.image_url ? 
        `<div class="table-image-container">
            <img src="${disc.image_url}" alt="${disc.mold} - ${disc.plastic_type}" class="w-12 h-12 object-contain rounded bg-gray-50 disc-image" onerror="this.style.display='none'">
        </div>` :
        `<div class="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No Image</div>`;
    
    row.innerHTML = `
        <td class="px-4 py-4 whitespace-nowrap">
            ${imageHtml}
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${disc.plastic_type || 'N/A'}</td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${disc.stamp_foil || 'N/A'}</td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${disc.plastic_color || 'N/A'}</td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${disc.weight ? disc.weight + 'g' : 'N/A'}</td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${disc.flatness || 'N/A'}</td>
        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">${disc.stiffness || 'N/A'}</td>
        <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600">${disc.price ? '$' + disc.price : 'N/A'}</td>
        <td class="px-4 py-4 whitespace-nowrap">
            <span class="px-2 py-1 text-xs font-medium rounded-full ${stockClass}">${stockText}</span>
        </td>
        <td class="px-4 py-4 whitespace-nowrap text-sm">
            ${disc.product_url ? `<a href="${disc.product_url}" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium">View →</a>` : 'N/A'}
        </td>
    `;
    
    return row;
}

function switchView(viewType) {
    const cardContainer = document.getElementById('cardContainer');
    const tableContainer = document.getElementById('tableContainer');
    const cardViewBtn = document.getElementById('cardViewBtn');
    const tableViewBtn = document.getElementById('tableViewBtn');
    
    if (viewType === 'cards') {
        cardContainer.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        cardViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        localStorage.setItem('discViewPreference', 'cards');
    } else if (viewType === 'table') {
        cardContainer.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        cardViewBtn.classList.remove('active');
        tableViewBtn.classList.add('active');
        localStorage.setItem('discViewPreference', 'table');
    }
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
    
    // Handle view toggle buttons
    const cardViewBtn = document.getElementById('cardViewBtn');
    const tableViewBtn = document.getElementById('tableViewBtn');
    
    if (cardViewBtn && tableViewBtn) {
        cardViewBtn.addEventListener('click', function() {
            switchView('cards');
        });
        
        tableViewBtn.addEventListener('click', function() {
            switchView('table');
        });
        
        // Load saved view preference or default to cards
        const savedView = localStorage.getItem('discViewPreference');
        if (savedView === 'table') {
            switchView('table');
        } else {
            switchView('cards'); // Default to cards view
        }
    }
});
