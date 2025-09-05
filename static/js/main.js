// Main JavaScript file for OTB Helper - Disc Golf Disc Finder

// Global state for filtering
let currentFilters = {};
let allDiscs = []; // Store all fetched discs for client-side filtering

// Global cart state
let cart = []; // Store selected discs for cart functionality

// Cart management functions
function loadCart() {
    const savedCart = localStorage.getItem('otbHelperCart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            console.error('Error loading cart from localStorage:', e);
            cart = [];
        }
    }
    updateCartDisplay();
}

function saveCart() {
    localStorage.setItem('otbHelperCart', JSON.stringify(cart));
    updateCartDisplay();
}

function addToCart(disc) {
    // Create a unique identifier for the disc
    const discId = `${disc.mold}-${disc.plastic_type}-${disc.plastic_color}-${disc.weight}-${disc.stamp_foil}`;
    
    // Check if disc is already in cart
    const existingItem = cart.find(item => item.id === discId);
    if (existingItem) {
        showNotification('This disc is already in your cart!', 'info');
        return;
    }
    
    // Add to cart
    const cartItem = {
        id: discId,
        ...disc,
        addedAt: new Date().toISOString()
    };
    
    cart.push(cartItem);
    saveCart();
    showNotification(`Added ${disc.plastic_type} ${disc.mold} to cart!`, 'success');
    
    // Cart panel will not auto-open - user can manually open it
}

function removeFromCart(discId) {
    cart = cart.filter(item => item.id !== discId);
    saveCart();
    showNotification('Item removed from cart', 'info');
    
    // Keep the cart panel open even if it becomes empty
    // The panel should only close when user explicitly closes it or clicks outside
}

function clearCart() {
    cart = [];
    saveCart();
    showNotification('Cart cleared', 'info');
}

// Floating cart panel functions
function toggleCartPanel() {
    const cartPanel = document.getElementById('cartPanel');
    if (cartPanel) {
        const isVisible = cartPanel.style.right === '0px';
        console.log('Current right position:', cartPanel.style.right);
        console.log('isVisible:', isVisible);
        
        if (isVisible) {
            cartPanel.style.right = '-400px';
            console.log('Hiding panel');
        } else {
            cartPanel.style.display = 'block';
            // Small delay to ensure display is set before animation
            setTimeout(() => {
                cartPanel.style.right = '0px';
            }, 10);
            console.log('Showing panel');
        }
        
        console.log('New right position:', cartPanel.style.right);
    }
}

function openCartPanel() {
    const cartPanel = document.getElementById('cartPanel');
    if (cartPanel) {
        cartPanel.style.display = 'block';
        // Small delay to ensure display is set before animation
        setTimeout(() => {
            cartPanel.style.right = '0px';
        }, 10);
    }
}

function closeCartPanel() {
    const cartPanel = document.getElementById('cartPanel');
    if (cartPanel) {
        cartPanel.style.right = '-400px';
        // Hide after animation completes
        setTimeout(() => {
            cartPanel.style.display = 'none';
        }, 300);
    }
}

function updateCartDisplay() {
    const floatingCartCount = document.getElementById('floatingCartCount');
    const cartItems = document.getElementById('cartItems');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');
    
    // Update floating cart count badge
    if (floatingCartCount) {
        floatingCartCount.textContent = cart.length;
        floatingCartCount.style.display = cart.length > 0 ? 'flex' : 'none';
    }
    
    // Update cart items display
    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="text-gray-500 text-center py-4">Your cart is empty</p>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0 cart-item-enter">
                    <div class="flex-1">
                        <div class="font-medium text-sm">${item.plastic_type} ${item.mold}</div>
                        <div class="text-xs text-gray-500">${item.plastic_color || 'N/A'} • ${item.weight ? item.weight + 'g' : 'N/A'}</div>
                        <div class="text-sm font-semibold text-green-600">$${item.price || 'N/A'}</div>
                    </div>
                    <button onclick="removeFromCart('${item.id}'); event.stopPropagation();" class="text-red-500 hover:text-red-700 text-sm">
                        ✕
                    </button>
                </div>
            `).join('');
        }
    }
    
    // Update checkout button state
    if (checkoutBtn) {
        checkoutBtn.disabled = cart.length === 0;
        checkoutBtn.classList.toggle('opacity-50', cart.length === 0);
        checkoutBtn.classList.toggle('cursor-not-allowed', cart.length === 0);
    }
    
    // Update clear cart button visibility
    if (clearCartBtn) {
        clearCartBtn.style.display = cart.length > 0 ? 'block' : 'none';
    }
    
    // Add hover effects to buttons
    if (checkoutBtn) {
        checkoutBtn.addEventListener('mouseenter', function() {
            if (!this.disabled) {
                this.style.backgroundColor = '#059669';
            }
        });
        checkoutBtn.addEventListener('mouseleave', function() {
            if (!this.disabled) {
                this.style.backgroundColor = '#10b981';
            }
        });
    }
    
    if (clearCartBtn) {
        clearCartBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#dc2626';
        });
        clearCartBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#ef4444';
        });
    }
}

function checkoutToOTB() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }
    
    // Filter items that have product URLs
    const itemsWithUrls = cart.filter(item => item.product_url);
    const itemsWithoutUrls = cart.filter(item => !item.product_url);
    
    if (itemsWithUrls.length === 0) {
        showNotification('No items have direct product links. Please search for these items manually on OTB.', 'error');
        return;
    }
    
    // Create a message with cart contents
    const cartSummary = cart.map(item => 
        `${item.plastic_type} ${item.mold} - ${item.plastic_color || 'N/A'} (${item.weight ? item.weight + 'g' : 'N/A'}) - $${item.price || 'N/A'}`
    ).join('\n');
    
    // Close the cart panel
    closeCartPanel();
    
    // Show instructions modal
    showCheckoutInstructions(itemsWithUrls, itemsWithoutUrls, cartSummary);
}

function showCheckoutInstructions(itemsWithUrls, itemsWithoutUrls, cartSummary) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-gray-800">🛒 Quick Add to OTB Cart</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 class="font-semibold text-blue-800 mb-2">📋 How to use this table:</h4>
                    <p class="text-blue-700 text-sm">Click "Copy" to copy the search string, then click "Open Page" to go to the product page. Use <kbd class="bg-gray-200 px-1 rounded text-xs">Cmd+F</kbd>/<kbd class="bg-gray-200 px-1 rounded text-xs">Ctrl+F</kbd> to find your exact disc quickly!</p>
                </div>
                
                ${itemsWithUrls.length > 0 ? `
                <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 class="font-semibold text-gray-800">✅ Items with Direct Links (${itemsWithUrls.length})</h4>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disc Name</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quick Find String</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${itemsWithUrls.map((item, index) => `
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ${item.plastic_type} ${item.mold}
                                        </td>
                                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${item.plastic_color || 'N/A'}
                                        </td>
                                        <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            ${item.weight ? item.weight + 'g' : 'N/A'}
                                        </td>
                                        <td class="px-4 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                                            $${item.price || 'N/A'}
                                        </td>
                                        <td class="px-4 py-4 text-sm text-gray-900">
                                            <code class="bg-gray-100 px-2 py-1 rounded text-xs font-mono">${generateUniqueSearchString(item)}</code>
                                        </td>
                                        <td class="px-4 py-4 whitespace-nowrap text-sm">
                                            <div class="flex gap-2">
                                                <button onclick="copySingleSearchText('${generateUniqueSearchString(item).replace(/'/g, "\\'")}')" 
                                                        class="bg-gray-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-gray-600 transition-colors">
                                                    📋 Copy
                                                </button>
                                                <button onclick="openProductPage('${item.product_url}', ${index + 1}, ${itemsWithUrls.length})" 
                                                        class="bg-blue-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-600 transition-colors">
                                                    🔗 Open Page
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}
                
                ${itemsWithoutUrls.length > 0 ? `
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 class="font-semibold text-yellow-800 mb-2">⚠️ Items to Add Manually (${itemsWithoutUrls.length})</h4>
                    <div class="space-y-2 max-h-32 overflow-y-auto">
                        ${itemsWithoutUrls.map(item => `
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-yellow-700">${item.plastic_type} ${item.mold} - ${item.plastic_color || 'N/A'}</span>
                                <span class="text-yellow-600 font-semibold">$${item.price || 'N/A'}</span>
                            </div>
                        `).join('')}
                    </div>
                    <p class="text-yellow-700 text-xs mt-2">Search for these items manually on OTB Discs</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store cart summary globally for copy function
    window.cartSummaryForCopy = cartSummary;
}


function openProductPage(url, itemNumber, totalItems) {
    if (url) {
        window.open(url, '_blank');
        showNotification(`Opening item ${itemNumber}/${totalItems} - look for the disc matching the criteria shown`, 'info');
    }
}


function generateUniqueSearchString(item) {
    // Use the raw row text if available - this matches exactly how it appears on OTB
    if (item.raw_row_text && item.raw_row_text.trim()) {
        return item.raw_row_text;
    }
    
    // Fallback: create a search string from individual attributes
    const parts = [];
    
    // Add weight if available (most specific)
    if (item.weight) {
        parts.push(`${item.weight}g`);
    }
    
    // Add plastic color if available
    if (item.plastic_color && item.plastic_color !== 'N/A') {
        parts.push(item.plastic_color);
    }
    
    // Add stamp foil if available
    if (item.stamp_foil && item.stamp_foil !== 'N/A') {
        parts.push(item.stamp_foil);
    }
    
    // Add rim color if available
    if (item.rim_color && item.rim_color !== 'N/A') {
        parts.push(item.rim_color);
    }
    
    // Add price if available (very specific)
    if (item.price) {
        parts.push(`$${item.price}`);
    }
    
    // If we have enough specific parts, use them
    if (parts.length >= 2) {
        return parts.join(' ');
    }
    
    // Final fallback: use mold and plastic type
    return `${item.plastic_type} ${item.mold}`;
}


function copySingleSearchText(searchText) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(searchText).then(() => {
            showNotification('Search text copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy search text:', err);
            showNotification('Failed to copy search text', 'error');
        });
    }
}

function copyAllSearchCriteria(items) {
    const criteria = items.map((item, index) => 
        `Item ${index + 1}: ${item.plastic_type} ${item.mold}
- Color: ${item.plastic_color || 'N/A'}
- Weight: ${item.weight ? item.weight + 'g' : 'N/A'}
- Stamp Foil: ${item.stamp_foil || 'N/A'}
- Price: $${item.price || 'N/A'}
- Quick Find: ${generateUniqueSearchString(item)}
- Raw Row Text: ${item.raw_row_text || 'Not available'}
- Look for: ${item.plastic_color || 'Any color'} color, ${item.weight ? item.weight + 'g' : 'any weight'} weight, ${item.stamp_foil || 'any foil'} foil
`
    ).join('\n');
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(criteria).then(() => {
            showNotification('Search criteria copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy criteria:', err);
            showNotification('Failed to copy criteria', 'error');
        });
    }
}


function copyCartSummary() {
    if (window.cartSummaryForCopy && navigator.clipboard) {
        navigator.clipboard.writeText(window.cartSummaryForCopy).then(() => {
            showNotification('Cart summary copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy cart summary:', err);
            showNotification('Failed to copy cart summary', 'error');
        });
    }
}

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

// Client-side filtering functions
function applyClientSideFilters(discs, filters) {
    if (!filters || Object.keys(filters).length === 0) {
        return discs;
    }
    
    return discs.filter(disc => {
        // Text filters (multiple selection support)
        if (filters.mold && filters.mold.length > 0 && !filters.mold.includes(disc.mold)) return false;
        if (filters.plastic_type && filters.plastic_type.length > 0 && !filters.plastic_type.includes(disc.plastic_type)) return false;
        if (filters.plastic_color && filters.plastic_color.length > 0 && !filters.plastic_color.includes(disc.plastic_color)) return false;
        if (filters.rim_color && filters.rim_color.length > 0 && !filters.rim_color.includes(disc.rim_color)) return false;
        if (filters.stamp_foil && filters.stamp_foil.length > 0 && !filters.stamp_foil.includes(disc.stamp_foil)) return false;
        
        // Range filters
        if (filters.weight_min && disc.weight && disc.weight < filters.weight_min) return false;
        if (filters.weight_max && disc.weight && disc.weight > filters.weight_max) return false;
        if (filters.scaled_weight_min && disc.scaled_weight && disc.scaled_weight < filters.scaled_weight_min) return false;
        if (filters.scaled_weight_max && disc.scaled_weight && disc.scaled_weight > filters.scaled_weight_max) return false;
        if (filters.flatness_min && disc.flatness && disc.flatness < filters.flatness_min) return false;
        if (filters.flatness_max && disc.flatness && disc.flatness > filters.flatness_max) return false;
        if (filters.stiffness_min && disc.stiffness && disc.stiffness < filters.stiffness_min) return false;
        if (filters.stiffness_max && disc.stiffness && disc.stiffness > filters.stiffness_max) return false;
        if (filters.price_min && disc.price && parseFloat(disc.price) < filters.price_min) return false;
        if (filters.price_max && disc.price && parseFloat(disc.price) > filters.price_max) return false;
        
        return true;
    });
}

function _checkTextFilter(value, filterValue) {
    if (!value || !filterValue) return true;
    
    // Handle empty strings and whitespace
    if (filterValue.trim() === '') return true;
    
    return value.toLowerCase().includes(filterValue.toLowerCase().trim());
}

// Function to populate filter dropdowns with available values
function populateFilterDropdowns(discs) {
    if (!discs || discs.length === 0) return;
    
    // Extract unique values for each filter field
    const filterValues = {
        mold: [...new Set(discs.map(d => d.mold).filter(Boolean))].sort(),
        plastic_type: [...new Set(discs.map(d => d.plastic_type).filter(Boolean))].sort(),
        plastic_color: [...new Set(discs.map(d => d.plastic_color).filter(Boolean))].sort(),
        stamp_foil: [...new Set(discs.map(d => d.stamp_foil).filter(Boolean))].sort()
    };
    
    // Populate each dropdown checklist
    Object.keys(filterValues).forEach(fieldName => {
        populateDropdownChecklist(fieldName, filterValues[fieldName]);
    });
    
    // Update range filter placeholders with available ranges
    updateRangeFilterPlaceholders(discs);
    
    console.log('🔧 Populated filter dropdown checklists with available values');
}

// Function to get the correct options container ID for a field name
function getOptionsContainerId(fieldName) {
    const idMapping = {
        'mold': 'moldOptions', 
        'plastic_type': 'plasticTypeOptions',
        'plastic_color': 'plasticColorOptions',
        'stamp_foil': 'stampFoilOptions'
    };
    return idMapping[fieldName] || `${fieldName}Options`;
}

// Function to populate individual dropdown checklist
function populateDropdownChecklist(fieldName, values) {
    const optionsContainer = document.getElementById(getOptionsContainerId(fieldName));
    if (!optionsContainer) return;
    
    // Clear existing options
    optionsContainer.innerHTML = '';
    
    // Add checkboxes for each unique value
    values.forEach(value => {
        const checkboxItem = document.createElement('label');
        checkboxItem.className = 'checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = fieldName;
        checkbox.value = value;
        
        const span = document.createElement('span');
        span.textContent = value;
        
        checkboxItem.appendChild(checkbox);
        checkboxItem.appendChild(span);
        optionsContainer.appendChild(checkboxItem);
    });
    
    // Setup dropdown functionality
    setupDropdownChecklist(fieldName);
}

// Function to setup dropdown checklist functionality
function setupDropdownChecklist(fieldName) {
    // Find the dropdown container by looking for the options container first
    const optionsContainer = document.getElementById(getOptionsContainerId(fieldName));
    if (!optionsContainer) {
        console.error(`Options container not found for ${fieldName}`);
        return;
    }
    
    const dropdown = optionsContainer.closest('.dropdown-checklist');
    if (!dropdown) {
        console.error(`Dropdown container not found for ${fieldName}`);
        return;
    }
    
    const toggle = dropdown.querySelector('.dropdown-toggle');
    const menu = dropdown.querySelector('.dropdown-menu');
    const deselectAllBtn = dropdown.querySelector('.deselect-all-btn');
    const checkboxes = dropdown.querySelectorAll(`input[name="${fieldName}"]`);
    
    console.log(`Setting up dropdown for ${fieldName}:`, { dropdown, toggle, menu, deselectAllBtn, checkboxes: checkboxes.length });
    
    // Remove existing event listeners by cloning the elements
    const newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);
    
    // Also clone the deselect all button to remove existing event listeners
    if (deselectAllBtn) {
        const newDeselectAllBtn = deselectAllBtn.cloneNode(true);
        deselectAllBtn.parentNode.replaceChild(newDeselectAllBtn, deselectAllBtn);
    }
    
    // Get the new references
    const newToggleRef = dropdown.querySelector('.dropdown-toggle');
    const newDeselectAllBtn = dropdown.querySelector('.deselect-all-btn');
    const newCheckboxes = dropdown.querySelectorAll(`input[name="${fieldName}"]`);
    
    // Toggle dropdown open/close
    newToggleRef.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log(`Toggle clicked for ${fieldName}`);
        
        const isOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown-checklist').forEach(d => {
            d.classList.remove('open');
            const dMenu = d.querySelector('.dropdown-menu');
            if (dMenu) dMenu.classList.add('hidden');
        });
        
        if (!isOpen) {
            dropdown.classList.add('open');
            menu.classList.remove('hidden');
            console.log(`Opened dropdown for ${fieldName}`);
        } else {
            dropdown.classList.remove('open');
            menu.classList.add('hidden');
            console.log(`Closed dropdown for ${fieldName}`);
        }
    });
    
    // Handle "Deselect All" button
    if (newDeselectAllBtn) {
        console.log(`Setting up Deselect All button for ${fieldName}`);
        newDeselectAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`Deselect All clicked for ${fieldName}`);
            
            // Find checkboxes dynamically (in case they were recreated)
            const currentCheckboxes = dropdown.querySelectorAll(`input[name="${fieldName}"]`);
            console.log(`Found ${currentCheckboxes.length} checkboxes to uncheck`);
            
            // Uncheck all individual options
            currentCheckboxes.forEach(cb => {
                cb.checked = false;
                console.log(`Unchecked checkbox: ${cb.value}`);
            });
            
            updateDropdownText(fieldName);
            updateFilters();
        });
    } else {
        console.error(`Deselect All button not found for ${fieldName}`);
    }
    
    // Handle individual checkboxes
    newCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            console.log(`Individual checkbox changed for ${fieldName}:`, this.value, this.checked);
            updateDropdownText(fieldName);
            updateFilters();
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
            menu.classList.add('hidden');
        }
    });
}

// Function to update dropdown text based on selections
function updateDropdownText(fieldName) {
    const optionsContainer = document.getElementById(getOptionsContainerId(fieldName));
    if (!optionsContainer) return;
    
    const dropdown = optionsContainer.closest('.dropdown-checklist');
    if (!dropdown) return;
    
    const selectedText = dropdown.querySelector('.selected-text');
    const checkboxes = dropdown.querySelectorAll(`input[name="${fieldName}"]`);
    
    if (!selectedText) return;
    
    const selectedValues = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    const totalValues = Array.from(checkboxes).filter(cb => !cb.disabled).length;
    
    if (selectedValues.length === 0) {
        selectedText.textContent = `All ${fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    } else if (selectedValues.length === totalValues) {
        selectedText.textContent = `All ${fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    } else if (selectedValues.length === 1) {
        selectedText.textContent = selectedValues[0];
    } else {
        selectedText.textContent = `${selectedValues.length} selected`;
    }
}

// Function to update range filter placeholders with available ranges
function updateRangeFilterPlaceholders(discs) {
    // Get flatness range
    const flatnessValues = discs.map(d => d.flatness).filter(v => v !== null && v !== undefined);
    if (flatnessValues.length > 0) {
        const minFlatness = Math.min(...flatnessValues);
        const maxFlatness = Math.max(...flatnessValues);
        const flatnessMinInput = document.querySelector('input[name="flatness_min"]');
        const flatnessMaxInput = document.querySelector('input[name="flatness_max"]');
        
        if (flatnessMinInput) flatnessMinInput.placeholder = `Min (${minFlatness.toFixed(1)})`;
        if (flatnessMaxInput) flatnessMaxInput.placeholder = `Max (${maxFlatness.toFixed(1)})`;
    }
    
    // Get stiffness range
    const stiffnessValues = discs.map(d => d.stiffness).filter(v => v !== null && v !== undefined);
    if (stiffnessValues.length > 0) {
        const minStiffness = Math.min(...stiffnessValues);
        const maxStiffness = Math.max(...stiffnessValues);
        const stiffnessMinInput = document.querySelector('input[name="stiffness_min"]');
        const stiffnessMaxInput = document.querySelector('input[name="stiffness_max"]');
        
        if (stiffnessMinInput) stiffnessMinInput.placeholder = `Min (${minStiffness.toFixed(1)})`;
        if (stiffnessMaxInput) stiffnessMaxInput.placeholder = `Max (${maxStiffness.toFixed(1)})`;
    }
    
    // Get weight range
    const weightValues = discs.map(d => d.weight).filter(v => v !== null && v !== undefined);
    if (weightValues.length > 0) {
        const minWeight = Math.min(...weightValues);
        const maxWeight = Math.max(...weightValues);
        const weightMinInput = document.querySelector('input[name="weight_min"]');
        const weightMaxInput = document.querySelector('input[name="weight_max"]');
        
        if (weightMinInput) weightMinInput.placeholder = `Min (${minWeight}g)`;
        if (weightMaxInput) weightMaxInput.placeholder = `Max (${maxWeight}g)`;
        
        // Update range visualization
        updateRangeVisualization('weight', minWeight, maxWeight, 0, 0);
    }
    
    // Get price range (show exact decimal range)
    const priceValues = allDiscs.map(d => parseFloat(d.price)).filter(v => !isNaN(v));
    if (priceValues.length > 0) {
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);
        const priceMinInput = document.querySelector('input[name="price_min"]');
        const priceMaxInput = document.querySelector('input[name="price_max"]');
        
        if (priceMinInput) priceMinInput.placeholder = `Min ($${minPrice.toFixed(2)})`;
        if (priceMaxInput) priceMaxInput.placeholder = `Max ($${maxPrice.toFixed(2)})`;
        
        // Update range visualization
        updateRangeVisualization('price', minPrice, maxPrice, 0, 0);
    }
}

// Function to update range visualization bars
function updateRangeVisualization(type, min, max, currentMin, currentMax) {
    const minLabel = document.getElementById(`${type}MinLabel`);
    const maxLabel = document.getElementById(`${type}MaxLabel`);
    const rangeFill = document.getElementById(`${type}RangeFill`);
    
    if (minLabel && maxLabel) {
        if (type === 'price') {
            minLabel.textContent = `$${min.toFixed(2)}`;
            maxLabel.textContent = `$${max.toFixed(2)}`;
        } else if (type === 'weight') {
            minLabel.textContent = `${min}g`;
            maxLabel.textContent = `${max}g`;
        }
    }
    
    // Update slider ranges if they exist (for weight and price)
    const sliderRange = document.getElementById(`${type}SliderRange`);
    if (sliderRange) {
        const minSlider = document.querySelector(`input[name="${type}_slider_min"]`);
        const maxSlider = document.querySelector(`input[name="${type}_slider_max"]`);
        
        if (minSlider && maxSlider) {
            // Update slider min/max values based on data range
            minSlider.min = Math.floor(min);
            minSlider.max = Math.ceil(max);
            maxSlider.min = Math.floor(min);
            maxSlider.max = Math.ceil(max);
            
            // Update slider range visualization
            const minVal = parseFloat(minSlider.value);
            const maxVal = parseFloat(maxSlider.value);
            
            if (minVal > maxVal) {
                minSlider.value = maxVal;
                maxSlider.value = minVal;
            }
            
            const minPercent = ((minSlider.value - minSlider.min) / (minSlider.max - minSlider.min)) * 100;
            const maxPercent = ((maxSlider.value - minSlider.min) / (minSlider.max - minSlider.min)) * 100;
            
            sliderRange.style.left = `${minPercent}%`;
            sliderRange.style.width = `${maxPercent - minPercent}%`;
        }
    }
    
    // Update old range fill bars if they exist (for backward compatibility)
    if (rangeFill) {
        const range = max - min;
        if (range > 0) {
            // Calculate the position of the selected range within the full range
            const leftPercent = ((currentMin - min) / range) * 100;
            const rightPercent = ((currentMax - min) / range) * 100;
            
            // Set the bar to always be full width (100%)
            rangeFill.style.width = '100%';
            rangeFill.style.left = '0%';
            
            // Create a mask effect using a pseudo-element or background
            // The blue bar represents the full range, and we'll use a grey overlay for excluded areas
            const excludedLeftPercent = Math.max(0, leftPercent);
            const excludedRightPercent = Math.min(100, 100 - rightPercent);
            
            // Use CSS custom properties to create the visual effect
            rangeFill.style.setProperty('--excluded-left', `${excludedLeftPercent}%`);
            rangeFill.style.setProperty('--excluded-right', `${excludedRightPercent}%`);
        }
    }
}

// Function to setup dual range sliders
function setupDualRangeSliders() {
    // Weight slider
    const weightSliderMin = document.querySelector('input[name="weight_slider_min"]');
    const weightSliderMax = document.querySelector('input[name="weight_slider_max"]');
    const weightSliderRange = document.getElementById('weightSliderRange');
    
    if (weightSliderMin && weightSliderMax && weightSliderRange) {
        setupSlider(weightSliderMin, weightSliderMax, weightSliderRange, 'weight');
    }
    
    // Flatness slider
    const flatnessSliderMin = document.querySelector('input[name="flatness_slider_min"]');
    const flatnessSliderMax = document.querySelector('input[name="flatness_slider_max"]');
    const flatnessSliderRange = document.getElementById('flatnessSliderRange');
    
    if (flatnessSliderMin && flatnessSliderMax && flatnessSliderRange) {
        setupSlider(flatnessSliderMin, flatnessSliderMax, flatnessSliderRange, 'flatness');
    }
    
    // Stiffness slider
    const stiffnessSliderMin = document.querySelector('input[name="stiffness_slider_min"]');
    const stiffnessSliderMax = document.querySelector('input[name="stiffness_slider_max"]');
    const stiffnessSliderRange = document.getElementById('stiffnessSliderRange');
    
    if (stiffnessSliderMin && stiffnessSliderMax && stiffnessSliderRange) {
        setupSlider(stiffnessSliderMin, stiffnessSliderMax, stiffnessSliderRange, 'stiffness');
    }
    
    // Price slider
    const priceSliderMin = document.querySelector('input[name="price_slider_min"]');
    const priceSliderMax = document.querySelector('input[name="price_slider_max"]');
    const priceSliderRange = document.getElementById('priceSliderRange');
    
    if (priceSliderMin && priceSliderMax && priceSliderRange) {
        setupSlider(priceSliderMin, priceSliderMax, priceSliderRange, 'price');
    }
}

// Function to setup individual slider pair
function setupSlider(minSlider, maxSlider, rangeElement, filterType) {
    const minInput = document.querySelector(`input[name="${filterType}_min"]`);
    const maxInput = document.querySelector(`input[name="${filterType}_max"]`);
    
    // Update range element when sliders change
    function updateSliderRange() {
        const minVal = parseFloat(minSlider.value);
        const maxVal = parseFloat(maxSlider.value);
        
        if (minVal > maxVal) {
            // Swap values if min > max
            minSlider.value = maxVal;
            maxSlider.value = minVal;
        }
        
        const minPercent = ((minSlider.value - minSlider.min) / (minSlider.max - minSlider.min)) * 100;
        const maxPercent = ((maxSlider.value - minSlider.min) / (minSlider.max - minSlider.min)) * 100;
        
        rangeElement.style.left = `${minPercent}%`;
        rangeElement.style.width = `${maxPercent - minPercent}%`;
        
        // Update input fields
        if (minInput) minInput.value = minSlider.value;
        if (maxInput) maxInput.value = maxSlider.value;
        
        // Trigger filter update
        updateFilters();
    }
    
    // Update sliders when input fields change
    function updateSlidersFromInputs() {
        const minVal = parseFloat(minInput?.value || minSlider.min);
        const maxVal = parseFloat(maxInput?.value || minSlider.max);
        
        if (!isNaN(minVal) && minVal >= parseFloat(minSlider.min) && minVal <= parseFloat(minSlider.max)) {
            minSlider.value = minVal;
        }
        if (!isNaN(maxVal) && maxVal >= parseFloat(minSlider.min) && maxVal <= parseFloat(minSlider.max)) {
            maxSlider.value = maxVal;
        }
        
        updateSliderRange();
    }
    
    // Add event listeners
    minSlider.addEventListener('input', updateSliderRange);
    maxSlider.addEventListener('input', updateSliderRange);
    
    if (minInput) minInput.addEventListener('input', updateSlidersFromInputs);
    if (maxInput) maxInput.addEventListener('input', updateSlidersFromInputs);
    
    // Initialize range
    updateSliderRange();
}

// Function to update multiple select labels with selection counts
function updateMultipleSelectLabels() {
    const dropdowns = document.querySelectorAll('#filtersSection .dropdown-checklist');
    
    dropdowns.forEach(dropdown => {
        const selectedCount = dropdown.querySelectorAll('input:checked:not([name$="_all"])').length;
        const label = dropdown.previousElementSibling;
        
        if (label && label.tagName === 'LABEL') {
            const baseText = label.textContent.replace(/\(\d+ selected\)?$/, '').trim();
            if (selectedCount > 0) {
                label.textContent = `${baseText} (${selectedCount} selected)`;
            } else {
                label.textContent = baseText;
            }
        }
    });
}

// Function to update available filter options based on current selections
function updateAvailableFilterOptions() {
    if (allDiscs.length === 0) return;
    
    // Apply current filters to get the subset of discs that match
    const filteredDiscs = applyClientSideFilters(allDiscs, currentFilters);
    
    // Extract ALL values from original dataset
    const allOriginalValues = {
        mold: [...new Set(allDiscs.map(d => d.mold).filter(Boolean))].sort(),
        plastic_type: [...new Set(allDiscs.map(d => d.plastic_type).filter(Boolean))].sort(),
        plastic_color: [...new Set(allDiscs.map(d => d.plastic_color).filter(Boolean))].sort(),
        stamp_foil: [...new Set(allDiscs.map(d => d.stamp_foil).filter(Boolean))].sort()
    };
    
    // Extract available values from filtered discs
    const availableValues = {
        mold: [...new Set(filteredDiscs.map(d => d.mold).filter(Boolean))].sort(),
        plastic_type: [...new Set(filteredDiscs.map(d => d.plastic_type).filter(Boolean))].sort(),
        plastic_color: [...new Set(filteredDiscs.map(d => d.plastic_color).filter(Boolean))].sort(),
        stamp_foil: [...new Set(filteredDiscs.map(d => d.stamp_foil).filter(Boolean))].sort()
    };
    
    // Update each dropdown checklist with all original options
    Object.keys(allOriginalValues).forEach(fieldName => {
        const optionsContainer = document.getElementById(getOptionsContainerId(fieldName));
        if (!optionsContainer) return;
        
        const dropdown = optionsContainer.closest('.dropdown-checklist');
        if (!dropdown) return;
        
        const currentValues = currentFilters[fieldName] || [];
        
        // Clear and recreate checkboxes
        const innerOptionsContainer = dropdown.querySelector('.dropdown-options');
        if (!innerOptionsContainer) return;
        
        innerOptionsContainer.innerHTML = '';
        
        // Add all original options, with visual distinction for filtered ones
        allOriginalValues[fieldName].forEach(value => {
            const checkboxItem = document.createElement('label');
            const isAvailable = availableValues[fieldName].includes(value);
            
            // Use visual styling instead of disabling
            checkboxItem.className = isAvailable ? 'checkbox-item' : 'checkbox-item filtered';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = fieldName;
            checkbox.value = value;
            // Keep all checkboxes enabled - don't disable them
            
            const span = document.createElement('span');
            span.textContent = value;
            span.className = isAvailable ? '' : 'filtered-text';
            
            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(span);
            
            // Restore selection if this value was previously selected (regardless of availability)
            if (Array.isArray(currentValues) && currentValues.includes(value)) {
                checkbox.checked = true;
            }
            
            innerOptionsContainer.appendChild(checkboxItem);
        });
        
        // Setup logic for this dropdown
        setupDropdownChecklist(fieldName);
        
        // Update dropdown text
        updateDropdownText(fieldName);
    });
}

function updateFilters() {
    const form = document.getElementById('searchForm');
    const formData = new FormData(form);
    
    // Build current filters object
    currentFilters = {};
    const filterFields = [
        'mold', 'plastic_type', 'plastic_color', 'rim_color', 'stamp_foil',
        'weight_min', 'weight_max', 'scaled_weight_min', 'scaled_weight_max',
        'flatness_min', 'flatness_max', 'stiffness_min', 'stiffness_max',
        'price_min', 'price_max'
    ];
    
    filterFields.forEach(field => {
        const value = formData.get(field);
        if (value && value.trim() !== '') {
            if (field.includes('_min') || field.includes('_max') || field.includes('price')) {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    currentFilters[field] = numValue;
                }
            } else {
                currentFilters[field] = value.trim();
            }
        }
    });
    
    // Handle multiple select values separately
    const multipleSelectFields = ['mold', 'plastic_type', 'plastic_color', 'stamp_foil'];
    multipleSelectFields.forEach(field => {
        const optionsContainer = document.getElementById(getOptionsContainerId(field));
        if (!optionsContainer) return;
        
        const dropdown = optionsContainer.closest('.dropdown-checklist');
        if (!dropdown) return;
        
        // Include all checked checkboxes (no longer filtering by disabled state)
        const selectedCheckboxes = Array.from(dropdown.querySelectorAll('input[name="' + field + '"]:checked')).map(cb => cb.value);
        console.log(`Field: ${field}, Selected:`, selectedCheckboxes);
        // Filter out empty values and "All" option
        const validSelections = selectedCheckboxes.filter(value => value !== '');
        if (validSelections.length > 0) {
            currentFilters[field] = validSelections;
        }
    });
    
    // Update UI to show filter status
    updateFilterUI();
    
    // Update multiple select labels with selection counts
    updateMultipleSelectLabels();
    
    // Update available filter options based on current selections
    updateAvailableFilterOptions();
    
    // Update range visualizations with current filter values
    updateRangeVisualizationsFromFilters();
    
    // Apply filters to current data and update display
    if (allDiscs.length > 0) {
        applyFiltersAndUpdateDisplay();
    }
}

// Function to update range visualizations based on current filter values
function updateRangeVisualizationsFromFilters() {
    if (allDiscs.length === 0) return;
    
    // Get available ranges
    const weightValues = allDiscs.map(d => d.weight).filter(v => v !== null && v !== undefined);
    const priceValues = allDiscs.map(d => parseFloat(d.price)).filter(v => !isNaN(v));
    
    if (weightValues.length > 0) {
        const minWeight = Math.min(...weightValues);
        const maxWeight = Math.max(...weightValues);
        const currentMin = currentFilters.weight_min || minWeight;
        const currentMax = currentFilters.weight_max || maxWeight;
        updateRangeVisualization('weight', minWeight, maxWeight, currentMin, currentMax);
    }
    
    if (priceValues.length > 0) {
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);
        const currentMin = currentFilters.price_min || minPrice;
        const currentMax = currentFilters.price_max || maxPrice;
        updateRangeVisualization('price', minPrice, maxPrice, currentMin, currentMax);
    }
}

function hasMeaningfulFilters() {
    // Check for text filters
    const textFilters = ['mold', 'plastic_type', 'plastic_color', 'stamp_foil'];
    for (const filter of textFilters) {
        if (currentFilters[filter] && 
            (Array.isArray(currentFilters[filter]) ? currentFilters[filter].length > 0 : true)) {
            return true;
        }
    }
    
    // Check for weight filters
    if (currentFilters.weight_min || currentFilters.weight_max) {
        return true;
    }
    
    // Check for price filters
    if (currentFilters.price_min || currentFilters.price_max) {
        return true;
    }
    
    // Check for flatness filters (only if not default 1-10)
    if ((currentFilters.flatness_min && currentFilters.flatness_min !== 1) || 
        (currentFilters.flatness_max && currentFilters.flatness_max !== 10)) {
        return true;
    }
    
    // Check for stiffness filters (only if not default 1-10)
    if ((currentFilters.stiffness_min && currentFilters.stiffness_min !== 1) || 
        (currentFilters.stiffness_max && currentFilters.stiffness_max !== 10)) {
        return true;
    }
    
    return false;
}

function updateFilterUI() {
    const clearFiltersBtn = document.getElementById('clearFilters');
    const filterStatus = document.getElementById('filterStatus');
    const filterStatusText = document.getElementById('filterStatusText');
    
    // Check if there are any meaningful filters (excluding default slider values)
    const hasActiveFilters = hasMeaningfulFilters();
    
    // Show/hide clear filters button
    if (clearFiltersBtn) {
        if (hasActiveFilters) {
            clearFiltersBtn.classList.remove('hidden');
        } else {
            clearFiltersBtn.classList.add('hidden');
        }
    }
    
    // Show/hide filter status indicator
    if (filterStatus && filterStatusText) {
        if (hasActiveFilters) {
            filterStatus.classList.remove('hidden');
            const filterSummary = getFilterSummary();
            filterStatusText.innerHTML = filterSummary;
        } else {
            filterStatus.classList.add('hidden');
        }
    }
}

function getFilterSummary() {
    if (Object.keys(currentFilters).length === 0) {
        return 'No filters applied';
    }
    
    const summaries = [];
    
    // Text filters (handle multiple selections)
    if (currentFilters.mold) {
        if (Array.isArray(currentFilters.mold)) {
            summaries.push(`Molds: ${currentFilters.mold.join(', ')}`);
        } else {
            summaries.push(`Mold: ${currentFilters.mold}`);
        }
    }
    if (currentFilters.plastic_type) {
        if (Array.isArray(currentFilters.plastic_type)) {
            summaries.push(`Plastic Types: ${currentFilters.plastic_type.join(', ')}`);
        } else {
            summaries.push(`Plastic: ${currentFilters.plastic_type}`);
        }
    }
    if (currentFilters.plastic_color) {
        if (Array.isArray(currentFilters.plastic_color)) {
            summaries.push(`Colors: ${currentFilters.plastic_color.join(', ')}`);
        } else {
            summaries.push(`Color: ${currentFilters.plastic_color}`);
        }
    }
    if (currentFilters.stamp_foil) {
        if (Array.isArray(currentFilters.stamp_foil)) {
            summaries.push(`Foils: ${currentFilters.stamp_foil.join(', ')}`);
        } else {
            summaries.push(`Foil: ${currentFilters.stamp_foil}`);
        }
    }
    
    // Range filters
    if (currentFilters.weight_min || currentFilters.weight_max) {
        const weightRange = [];
        if (currentFilters.weight_min) weightRange.push(`≥${currentFilters.weight_min}g`);
        if (currentFilters.weight_max) weightRange.push(`≤${currentFilters.weight_max}g`);
        summaries.push(`Weight: ${weightRange.join(' - ')}`);
    }
    
    // Only show flatness filter if it's not the default range (1-10)
    if ((currentFilters.flatness_min && currentFilters.flatness_min !== 1) || 
        (currentFilters.flatness_max && currentFilters.flatness_max !== 10)) {
        const flatnessRange = [];
        if (currentFilters.flatness_min && currentFilters.flatness_min !== 1) flatnessRange.push(`≥${currentFilters.flatness_min}`);
        if (currentFilters.flatness_max && currentFilters.flatness_max !== 10) flatnessRange.push(`≤${currentFilters.flatness_max}`);
        summaries.push(`Flatness: ${flatnessRange.join(' - ')}`);
    }
    
    // Only show stiffness filter if it's not the default range (1-10)
    if ((currentFilters.stiffness_min && currentFilters.stiffness_min !== 1) || 
        (currentFilters.stiffness_max && currentFilters.stiffness_max !== 10)) {
        const stiffnessRange = [];
        if (currentFilters.stiffness_min && currentFilters.stiffness_min !== 1) stiffnessRange.push(`≥${currentFilters.stiffness_min}`);
        if (currentFilters.stiffness_max && currentFilters.stiffness_max !== 10) stiffnessRange.push(`≤${currentFilters.stiffness_max}`);
        summaries.push(`Stiffness: ${stiffnessRange.join(' - ')}`);
    }
    
    if (currentFilters.price_min || currentFilters.price_max) {
        const priceRange = [];
        if (currentFilters.price_min) priceRange.push(`≥$${currentFilters.price_min}`);
        if (currentFilters.price_max) priceRange.push(`≤$${currentFilters.price_max}`);
        summaries.push(`Price: ${priceRange.join(' - ')}`);
    }
    
    return `${summaries.length} filter${summaries.length > 1 ? 's' : ''}: ${summaries.join(', ')}`;
}

function applyFiltersAndUpdateDisplay() {
    if (allDiscs.length === 0) return;
    
    // Apply client-side filters
    const filteredDiscs = applyClientSideFilters(allDiscs, currentFilters);
    
    // Update results info
    const resultsInfo = document.getElementById('resultsInfo');
    const exportResultsBtn = document.getElementById('exportResults');
    
    if (resultsInfo) {
        const totalDiscs = allDiscs.length;
        const filteredCount = filteredDiscs.length;
        if (filteredCount === totalDiscs) {
            resultsInfo.textContent = `Showing ${totalDiscs} discs`;
        } else {
            resultsInfo.textContent = `Showing ${filteredCount} of ${totalDiscs} discs`;
        }
    }
    
    // Show/hide export button
    if (exportResultsBtn) {
        if (filteredDiscs.length > 0) {
            exportResultsBtn.classList.remove('hidden');
        } else {
            exportResultsBtn.classList.add('hidden');
        }
    }
    
    // Update both views with filtered data
    displayCardsView(filteredDiscs);
    displayTableView(filteredDiscs);
}

// Debounced filter update function
let filterUpdateTimeout;
function debouncedFilterUpdate() {
    clearTimeout(filterUpdateTimeout);
    filterUpdateTimeout = setTimeout(updateFilters, 300); // 300ms delay
}

// Function to reset mold-specific filters when searching for a new mold
function resetMoldSpecificFilters() {
    console.log('🔄 Resetting mold-specific filters for new search');
    
    // Always remove mold-specific filters from currentFilters object first
    delete currentFilters.mold;
    delete currentFilters.plastic_type;
    
    // Try to reset UI elements if they exist
    const fieldsToReset = ['mold', 'plastic_type'];
    
    fieldsToReset.forEach(fieldName => {
        const optionsContainer = document.querySelector(`#${getOptionsContainerId(fieldName)}`);
        if (optionsContainer) {
            const dropdown = optionsContainer.closest('.dropdown-checklist');
            if (dropdown) {
                const checkboxes = dropdown.querySelectorAll(`input[name="${fieldName}"]`);
                
                // Uncheck all individual options (this means "All" is selected)
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
                console.log(`✅ Reset ${fieldName} filter to "All"`);
                updateDropdownText(fieldName);
            }
        } else {
            console.log(`⚠️ ${fieldName} dropdown not found (this is normal for first search)`);
        }
    });
    
    console.log('✅ Mold-specific filters reset successfully. Current filters:', currentFilters);
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
        
        // Reset all filters when searching for a new disc
        // This needs to happen after UI is ready but before building search request
        clearAllFilters();
        
        // Build search request - limit to 3 product pages for reasonable response time
        const searchRequest = {
            product_name: formData.get('productName'),
            max_results: 3,
            filters: {}
        };
        
        // Since we reset all filters, we don't include any filters in the search request
        // All filtering will be done client-side after the search results are returned
        delete searchRequest.filters;
        
        
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
        
        // Store all discs for client-side filtering
        allDiscs = data.results;
        
        // Populate filter dropdowns with available values
        populateFilterDropdowns(allDiscs);
        
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
            <img src="${disc.image_url}" alt="${disc.mold} - ${disc.plastic_type}" class="w-full h-32 object-contain rounded bg-gray-50 disc-image cursor-pointer hover:opacity-80 transition-opacity" onclick="showImageModal('${disc.image_url}', '${disc.mold} - ${disc.plastic_type}')" onerror="this.style.display='none'">
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
                <button onclick="addToCart(${JSON.stringify(disc).replace(/"/g, '&quot;')})" 
                        class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-600 transition-colors">
                    🛒 Add to Cart
                </button>
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
            <img src="${disc.image_url}" alt="${disc.mold} - ${disc.plastic_type}" class="w-12 h-12 object-contain rounded bg-gray-50 disc-image cursor-pointer hover:opacity-80 transition-opacity" onclick="showImageModal('${disc.image_url}', '${disc.mold} - ${disc.plastic_type}')" onerror="this.style.display='none'">
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
            <button onclick="addToCart(${JSON.stringify(disc).replace(/"/g, '&quot;')})" 
                    class="bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-600 transition-colors">
                🛒 Add to Cart
            </button>
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

// Image expansion modal functions
function showImageModal(imageUrl, altText) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 cursor-pointer';
    modal.id = 'imageModal';
    
    modal.innerHTML = `
        <div class="relative max-w-4xl max-h-[90vh] p-4">
            <img src="${imageUrl}" alt="${altText}" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl">
            <button onclick="closeImageModal()" class="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all">
                <span class="text-xl">&times;</span>
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside the image
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImageModal();
        }
    });
    
    // Close modal with ESC key
    const escapeHandler = function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
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
    
    // Initialize cart
    loadCart();
    
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
    
    // Set up real-time filtering for all filter inputs
    setupFilterEventListeners();
    
    // Setup dual range sliders
    setupDualRangeSliders();
    
    // Handle clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
    
    // Handle export results button
    const exportResultsBtn = document.getElementById('exportResults');
    if (exportResultsBtn) {
        exportResultsBtn.addEventListener('click', exportFilteredResults);
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
        
        // Load saved view preference or default to table
        const savedView = localStorage.getItem('discViewPreference');
        if (savedView === 'cards') {
            switchView('cards');
        } else {
            switchView('table'); // Default to table view
        }
    }
    
    // Add event listener for floating cart button as backup
    const floatingCartBtn = document.getElementById('floatingCartBtn');
    const floatingCart = document.getElementById('floatingCart');
    const cartPanel = document.getElementById('cartPanel');
    
    console.log('🚀 DOM loaded - checking cart elements:');
    console.log('floatingCart:', !!floatingCart);
    console.log('floatingCartBtn:', !!floatingCartBtn);
    console.log('cartPanel:', !!cartPanel);
    
    if (floatingCartBtn) {
        console.log('✅ Adding event listener to floating cart button');
        floatingCartBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🎯 Event listener triggered!');
            toggleCartPanel();
        });
        
        // Add hover effects
        floatingCartBtn.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#1d4ed8';
            this.style.transform = 'scale(1.1)';
        });
        
        floatingCartBtn.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '#2563eb';
            this.style.transform = 'scale(1)';
        });
    } else {
        console.error('❌ Floating cart button not found!');
    }
    
    // Close cart panel when clicking outside
    document.addEventListener('click', function(e) {
        const cartPanel = document.getElementById('cartPanel');
        const floatingCartBtn = document.getElementById('floatingCartBtn');
        
        if (cartPanel && cartPanel.style.right === '0px') {
            // Don't close if clicking inside the cart panel or on the cart button
            if (!cartPanel.contains(e.target) && !floatingCartBtn.contains(e.target)) {
                closeCartPanel();
            }
        }
    });
});

// Set up event listeners for filter inputs
function setupFilterEventListeners() {
    const filterInputs = document.querySelectorAll('#filtersSection input[type="number"]');
    
    // Setup number input event listeners
    filterInputs.forEach(input => {
        input.addEventListener('change', updateFilters);
        input.addEventListener('blur', validateRangeInputs);
        
        // Special handling for price inputs
        if (input.name === 'price_min' || input.name === 'price_max') {
            input.addEventListener('input', function() {
                // Ensure integer values and prevent negative numbers
                const value = Math.max(0, Math.round(parseFloat(this.value) || 0));
                if (this.value !== value.toString()) {
                    this.value = value;
                }
                updatePriceInputState(this);
            });
            
            // Handle arrow button clicks and focus for price inputs
            input.addEventListener('focus', function() {
                // If input is empty, set it to the current range value
                if (!this.value) {
                    const priceValues = allDiscs.map(d => parseFloat(d.price)).filter(v => !isNaN(v));
                    if (priceValues.length > 0) {
                        if (this.name === 'price_min') {
                            this.value = Math.floor(Math.min(...priceValues));
                        } else if (this.name === 'price_max') {
                            this.value = Math.ceil(Math.max(...priceValues));
                        }
                    }
                }
                updatePriceInputState(this);
            });
            
            // Handle step up/down events (arrow button clicks)
            input.addEventListener('change', function() {
                // For price_max, if the value is 0 or empty, set it to the appropriate range value
                if (this.name === 'price_max' && (this.value === '0' || this.value === '')) {
                    const priceValues = allDiscs.map(d => parseFloat(d.price)).filter(v => !isNaN(v));
                    if (priceValues.length > 0) {
                        this.value = Math.ceil(Math.max(...priceValues));
                    }
                }
                // For price_min, allow 0 and don't override it
                updatePriceInputState(this);
            });
            
            // Prevent down arrow from working when minimum price is at 0
            if (input.name === 'price_min') {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'ArrowDown' && this.value === '0') {
                        e.preventDefault();
                        return false;
                    }
                });
            }
        }
        
        // Special handling for weight inputs
        if (input.name === 'weight_min' || input.name === 'weight_max') {
            input.addEventListener('input', function() {
                // Ensure integer values and prevent negative numbers
                const value = Math.max(0, Math.round(parseFloat(this.value) || 0));
                if (this.value !== value.toString()) {
                    this.value = value;
                }
                updateWeightInputState(this);
            });
            
            // Handle arrow button clicks and focus for weight inputs
            input.addEventListener('focus', function() {
                // If input is empty, set it to the current range value
                if (!this.value) {
                    const weightValues = allDiscs.map(d => d.weight).filter(v => v !== null && v !== undefined);
                    if (weightValues.length > 0) {
                        if (this.name === 'weight_min') {
                            this.value = Math.floor(Math.min(...weightValues));
                        } else if (this.name === 'weight_max') {
                            this.value = Math.ceil(Math.max(...weightValues));
                        }
                    }
                }
                updateWeightInputState(this);
            });
            
            // Handle step up/down events (arrow button clicks)
            input.addEventListener('change', function() {
                // For weight_max, if the value is 0 or empty, set it to the appropriate range value
                if (this.name === 'weight_max' && (this.value === '0' || this.value === '')) {
                    const weightValues = allDiscs.map(d => d.weight).filter(v => v !== null && v !== undefined);
                    if (weightValues.length > 0) {
                        this.value = Math.ceil(Math.max(...weightValues));
                    }
                }
                // For weight_min, allow 0 and don't override it
                updateWeightInputState(this);
            });
            
            // Prevent down arrow from working when minimum weight is at 0
            if (input.name === 'weight_min') {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'ArrowDown' && this.value === '0') {
                        e.preventDefault();
                        return false;
                    }
                });
            }
        }
        
        // Special handling for flatness and stiffness inputs
        if (input.name === 'flatness_min' || input.name === 'flatness_max' || 
            input.name === 'stiffness_min' || input.name === 'stiffness_max') {
            input.addEventListener('input', function() {
                // Ensure integer values and prevent negative numbers, clamp between 1-10
                const value = Math.max(1, Math.min(10, Math.round(parseFloat(this.value) || 1)));
                if (this.value !== value.toString()) {
                    this.value = value;
                }
            });
            
            // Handle arrow button clicks and focus for flatness/stiffness inputs
            input.addEventListener('focus', function() {
                // If input is empty, set it to the default range value (1-10)
                if (!this.value) {
                    if (this.name === 'flatness_min' || this.name === 'stiffness_min') {
                        this.value = 1;
                    } else if (this.name === 'flatness_max' || this.name === 'stiffness_max') {
                        this.value = 10;
                    }
                }
            });
            
            // Handle step up/down events (arrow button clicks)
            input.addEventListener('change', function() {
                // Ensure values stay within 1-10 range
                const value = Math.max(1, Math.min(10, Math.round(parseFloat(this.value) || 1)));
                this.value = value;
            });
            
            // Prevent down arrow from working when minimum is at 1
            if (input.name === 'flatness_min' || input.name === 'stiffness_min') {
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'ArrowDown' && this.value === '1') {
                        e.preventDefault();
                        return false;
                    }
                });
            }
        }
    });
    
    console.log(`🔧 Set up event listeners for ${filterInputs.length} number inputs`);
}

// Function to update price input state (track when minimum is at 0)
function updatePriceInputState(input) {
    if (input.name === 'price_min') {
        // For minimum price, add class when value is 0 for styling purposes
        if (input.value === '0') {
            input.classList.add('price-min-at-zero');
        } else {
            input.classList.remove('price-min-at-zero');
        }
    }
}

// Function to update weight input state (track when minimum is at 0)
function updateWeightInputState(input) {
    if (input.name === 'weight_min') {
        // For minimum weight, add class when value is 0 for styling purposes
        if (input.value === '0') {
            input.classList.add('weight-min-at-zero');
        } else {
            input.classList.remove('weight-min-at-zero');
        }
    }
}

// Function to validate range inputs and prevent invalid ranges
function validateRangeInputs() {
    const rangePairs = [
        { min: 'weight_min', max: 'weight_max' },
        { min: 'flatness_min', max: 'flatness_max' },
        { min: 'stiffness_min', max: 'stiffness_max' },
        { min: 'price_min', max: 'price_max' }
    ];
    
    rangePairs.forEach(pair => {
        const minInput = document.querySelector(`input[name="${pair.min}"]`);
        const maxInput = document.querySelector(`input[name="${pair.max}"]`);
        
        // Special handling for price inputs
        if (pair.min === 'price_min' || pair.max === 'price_max') {
            // Ensure price values are non-negative and integers
            if (minInput && minInput.value) {
                const minVal = Math.max(0, Math.round(parseFloat(minInput.value)));
                minInput.value = minVal;
            }
            if (maxInput && maxInput.value) {
                const maxVal = Math.max(0, Math.round(parseFloat(maxInput.value)));
                maxInput.value = maxVal;
            }
        }
        
        if (minInput && maxInput && minInput.value && maxInput.value) {
            const minVal = parseFloat(minInput.value);
            const maxVal = parseFloat(maxInput.value);
            
            if (minVal > maxVal) {
                // Swap values to maintain valid range
                minInput.value = maxVal;
                maxInput.value = minVal;
                
                // Update corresponding sliders if they exist
                if (pair.min === 'flatness_min') {
                    const slider = document.querySelector('input[name="flatness_slider_min"]');
                    if (slider) slider.value = maxVal;
                } else if (pair.max === 'flatness_max') {
                    const slider = document.querySelector('input[name="flatness_slider_max"]');
                    if (slider) slider.value = minVal;
                } else if (pair.min === 'stiffness_min') {
                    const slider = document.querySelector('input[name="stiffness_slider_min"]');
                    if (slider) slider.value = maxVal;
                } else if (pair.max === 'stiffness_max') {
                    const slider = document.querySelector('input[name="stiffness_slider_max"]');
                    if (slider) slider.value = minVal;
                }
                
                // Show notification
                showNotification('Range values have been adjusted to maintain valid range', 'info');
                
                // Update filters
                updateFilters();
            }
        }
    });
}

// Add a function to clear all filters
function clearAllFilters() {
    const form = document.getElementById('searchForm');
    const filterInputs = form.querySelectorAll('#filtersSection input[type="number"]');
    const dropdowns = form.querySelectorAll('.dropdown-checklist');
    
    // Clear number inputs
    filterInputs.forEach(input => {
        input.value = '';
    });
    
    // Reset dropdowns to "All" option (uncheck all individual options)
    dropdowns.forEach(dropdown => {
        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    });
    
    // Reset range sliders to default values
    const weightSliderMin = document.querySelector('input[name="weight_slider_min"]');
    const weightSliderMax = document.querySelector('input[name="weight_slider_max"]');
    const flatnessSliderMin = document.querySelector('input[name="flatness_slider_min"]');
    const flatnessSliderMax = document.querySelector('input[name="flatness_slider_max"]');
    const stiffnessSliderMin = document.querySelector('input[name="stiffness_slider_min"]');
    const stiffnessSliderMax = document.querySelector('input[name="stiffness_slider_max"]');
    const priceSliderMin = document.querySelector('input[name="price_slider_min"]');
    const priceSliderMax = document.querySelector('input[name="price_slider_max"]');
    
    // Reset to default ranges (will be updated when data is available)
    if (weightSliderMin) weightSliderMin.value = 0;
    if (weightSliderMax) weightSliderMax.value = 200;
    if (flatnessSliderMin) flatnessSliderMin.value = 1;
    if (flatnessSliderMax) flatnessSliderMax.value = 10;
    if (stiffnessSliderMin) stiffnessSliderMin.value = 1;
    if (stiffnessSliderMax) stiffnessSliderMax.value = 10;
    if (priceSliderMin) priceSliderMin.value = 0;
    if (priceSliderMax) priceSliderMax.value = 50;
    
    // Update slider ranges
    setupDualRangeSliders();
    
    // Clear current filters and update display
    currentFilters = {};
    if (allDiscs.length > 0) {
        applyFiltersAndUpdateDisplay();
    }
}

// Add a function to reset filters to search defaults
function resetFiltersToSearch() {
    // This would reset filters to match the original search request
    // For now, just clear them
    clearAllFilters();
}

// Add a function to show original search results
function showOriginalResults() {
    if (allDiscs.length > 0) {
        // Clear filters but keep the form values for reference
        currentFilters = {};
        updateFilterUI();
        applyFiltersAndUpdateDisplay();
    }
}

// Add a function to export filtered results
function exportFilteredResults() {
    if (allDiscs.length === 0) {
        showNotification('No results to export', 'error');
        return;
    }
    
    const filteredDiscs = applyClientSideFilters(allDiscs, currentFilters);
    if (filteredDiscs.length === 0) {
        showNotification('No results match current filters', 'error');
        return;
    }
    
    // Create CSV content
    const headers = ['Mold', 'Plastic Type', 'Color', 'Weight', 'Flatness', 'Stiffness', 'Price', 'Stock', 'URL'];
    const csvContent = [
        headers.join(','),
        ...filteredDiscs.map(disc => [
            disc.mold || '',
            disc.plastic_type || '',
            disc.plastic_color || '',
            disc.weight || '',
            disc.flatness || '',
            disc.stiffness || '',
            disc.price || '',
            disc.stock || '',
            disc.product_url || ''
        ].join(','))
    ].join('\n');
    
    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otb-discs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification(`Exported ${filteredDiscs.length} discs to CSV`, 'success');
}