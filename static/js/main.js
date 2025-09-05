// Main JavaScript file for OTB Helper - Disc Golf Disc Finder

// Global state for filtering
let currentFilters = {};
let allDiscs = []; // Store all fetched discs for client-side filtering

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
        if (filters.brand && filters.brand.length > 0 && !filters.brand.includes(disc.brand)) return false;
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
        brand: [...new Set(discs.map(d => d.brand).filter(Boolean))].sort(),
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
        'brand': 'brandOptions',
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
    const allCheckbox = dropdown.querySelector('input[name="' + fieldName + '_all"]');
    const checkboxes = dropdown.querySelectorAll(`input[name="${fieldName}"]`);
    
    console.log(`Setting up dropdown for ${fieldName}:`, { dropdown, toggle, menu, allCheckbox, checkboxes: checkboxes.length });
    
    // Remove existing event listeners by cloning the elements
    const newToggle = toggle.cloneNode(true);
    toggle.parentNode.replaceChild(newToggle, toggle);
    
    // Get the new references
    const newToggleRef = dropdown.querySelector('.dropdown-toggle');
    const newAllCheckbox = dropdown.querySelector('input[name="' + fieldName + '_all"]');
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
    
    // Handle "All" checkbox
    if (newAllCheckbox) {
        newAllCheckbox.addEventListener('change', function() {
            console.log(`All checkbox changed for ${fieldName}:`, this.checked);
            if (this.checked) {
                // Uncheck all individual options
                newCheckboxes.forEach(cb => {
                    if (cb !== this) cb.checked = false;
                });
            }
            updateDropdownText(fieldName);
            updateFilters();
        });
    }
    
    // Handle individual checkboxes
    newCheckboxes.forEach(checkbox => {
        if (checkbox !== newAllCheckbox) {
            checkbox.addEventListener('change', function() {
                // Skip if checkbox is disabled
                if (this.disabled) {
                    return;
                }
                
                console.log(`Individual checkbox changed for ${fieldName}:`, this.value, this.checked);
                if (this.checked) {
                    // Uncheck "All" when individual option is selected
                    if (newAllCheckbox) newAllCheckbox.checked = false;
                }
                updateDropdownText(fieldName);
                updateFilters();
            });
        }
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
    const allCheckbox = dropdown.querySelector('input[name="' + fieldName + '_all"]');
    const checkboxes = dropdown.querySelectorAll(`input[name="${fieldName}"]:not([name$="_all"])`);
    
    if (!selectedText) return;
    
    if (allCheckbox && allCheckbox.checked) {
        selectedText.textContent = `All ${fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    } else {
        const selectedValues = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (selectedValues.length === 0) {
            selectedText.textContent = `All ${fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        } else if (selectedValues.length === 1) {
            selectedText.textContent = selectedValues[0];
        } else {
            selectedText.textContent = `${selectedValues.length} selected`;
        }
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
    
    // Get price range
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
    
    if (rangeFill) {
        const range = max - min;
        if (range > 0) {
            const leftPercent = ((currentMin - min) / range) * 100;
            const widthPercent = ((currentMax - currentMin) / range) * 100;
            rangeFill.style.left = `${Math.max(0, leftPercent)}%`;
            rangeFill.style.width = `${Math.max(0, widthPercent)}%`;
        }
    }
}

// Function to setup dual range sliders
function setupDualRangeSliders() {
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
        brand: [...new Set(allDiscs.map(d => d.brand).filter(Boolean))].sort(),
        mold: [...new Set(allDiscs.map(d => d.mold).filter(Boolean))].sort(),
        plastic_type: [...new Set(allDiscs.map(d => d.plastic_type).filter(Boolean))].sort(),
        plastic_color: [...new Set(allDiscs.map(d => d.plastic_color).filter(Boolean))].sort(),
        stamp_foil: [...new Set(allDiscs.map(d => d.stamp_foil).filter(Boolean))].sort()
    };
    
    // Extract available values from filtered discs
    const availableValues = {
        brand: [...new Set(filteredDiscs.map(d => d.brand).filter(Boolean))].sort(),
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
        
        // Create new "All" checkbox
        const newAllCheckbox = document.createElement('label');
        newAllCheckbox.className = 'checkbox-item';
        newAllCheckbox.innerHTML = `
            <input type="checkbox" id="${fieldName}_all" name="${fieldName}_all" value="">
            <span>All ${fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} (${allOriginalValues[fieldName].length})</span>
        `;
        innerOptionsContainer.appendChild(newAllCheckbox);
        
        // Add all original options, marking unavailable ones as disabled
        allOriginalValues[fieldName].forEach(value => {
            const checkboxItem = document.createElement('label');
            const isAvailable = availableValues[fieldName].includes(value);
            
            // Add disabled class if not available
            checkboxItem.className = isAvailable ? 'checkbox-item' : 'checkbox-item disabled';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = fieldName;
            checkbox.value = value;
            checkbox.disabled = !isAvailable;
            
            const span = document.createElement('span');
            span.textContent = value;
            span.className = isAvailable ? '' : 'disabled-text';
            
            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(span);
            
            // Restore selection if this value was previously selected and is available
            if (Array.isArray(currentValues) && currentValues.includes(value) && isAvailable) {
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
        'brand', 'mold', 'plastic_type', 'plastic_color', 'rim_color', 'stamp_foil',
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
    const multipleSelectFields = ['brand', 'mold', 'plastic_type', 'plastic_color', 'stamp_foil'];
    multipleSelectFields.forEach(field => {
        const optionsContainer = document.getElementById(getOptionsContainerId(field));
        if (!optionsContainer) return;
        
        const dropdown = optionsContainer.closest('.dropdown-checklist');
        if (!dropdown) return;
        
        // Only include enabled checkboxes that are checked
        const selectedCheckboxes = Array.from(dropdown.querySelectorAll('input[name="' + field + '"]:checked:not(:disabled)')).map(cb => cb.value);
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

function updateFilterUI() {
    const clearFiltersBtn = document.getElementById('clearFilters');
    const filterStatus = document.getElementById('filterStatus');
    const filterStatusText = document.getElementById('filterStatusText');
    
    const hasActiveFilters = Object.keys(currentFilters).length > 0;
    
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
    if (currentFilters.brand) {
        if (Array.isArray(currentFilters.brand)) {
            summaries.push(`Brands: ${currentFilters.brand.join(', ')}`);
        } else {
            summaries.push(`Brand: ${currentFilters.brand}`);
        }
    }
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
    
    if (currentFilters.flatness_min || currentFilters.flatness_max) {
        const flatnessRange = [];
        if (currentFilters.flatness_min) flatnessRange.push(`≥${currentFilters.flatness_min}`);
        if (currentFilters.flatness_max) flatnessRange.push(`≤${currentFilters.flatness_max}`);
        summaries.push(`Flatness: ${flatnessRange.join(' - ')}`);
    }
    
    if (currentFilters.stiffness_min || currentFilters.stiffness_max) {
        const stiffnessRange = [];
        if (currentFilters.stiffness_min) stiffnessRange.push(`≥${currentFilters.stiffness_min}`);
        if (currentFilters.stiffness_max) stiffnessRange.push(`≤${currentFilters.stiffness_max}`);
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
    delete currentFilters.brand;
    
    // Try to reset UI elements if they exist
    const fieldsToReset = ['mold', 'plastic_type', 'brand'];
    
    fieldsToReset.forEach(fieldName => {
        const optionsContainer = document.querySelector(`#${getOptionsContainerId(fieldName)}`);
        if (optionsContainer) {
            const dropdown = optionsContainer.closest('.dropdown-checklist');
            if (dropdown) {
                const allCheckbox = dropdown.querySelector(`input[name="${fieldName}_all"]`);
                const checkboxes = dropdown.querySelectorAll(`input[name="${fieldName}"]:not([name$="_all"])`);
                
                if (allCheckbox) {
                    allCheckbox.checked = true;
                    console.log(`✅ Reset ${fieldName} filter to "All"`);
                }
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
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
        
        // Reset mold-specific filters when searching for a new mold
        // This needs to happen after UI is ready but before building search request
        resetMoldSpecificFilters();
        
        // Build search request - limit to 3 product pages for reasonable response time
        const searchRequest = {
            product_name: formData.get('productName'),
            max_results: 3,
            filters: {}
        };
        
        // Add filters if they have values - but exclude mold-specific filters that were just reset
        const filterFields = [
            'brand', 'mold', 'plastic_type', 'plastic_color', 'rim_color', 'stamp_foil',
            'weight_min', 'weight_max', 'scaled_weight_min', 'scaled_weight_max',
            'flatness_min', 'flatness_max', 'stiffness_min', 'stiffness_max',
            'price_min', 'price_max'
        ];
        
        // Get fresh form data after reset
        const freshFormData = new FormData(document.getElementById('searchForm'));
        
        filterFields.forEach(field => {
            // Skip mold-specific filters that should be reset
            if (field === 'brand' || field === 'mold' || field === 'plastic_type') {
                return;
            }
            
            const value = freshFormData.get(field);
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
        
        // Load saved view preference or default to cards
        const savedView = localStorage.getItem('discViewPreference');
        if (savedView === 'table') {
            switchView('table');
        } else {
            switchView('cards'); // Default to cards view
        }
    }
});

// Set up event listeners for filter inputs
function setupFilterEventListeners() {
    const filterInputs = document.querySelectorAll('#filtersSection input[type="number"]');
    
    // Setup number input event listeners
    filterInputs.forEach(input => {
        input.addEventListener('change', updateFilters);
        input.addEventListener('blur', validateRangeInputs);
    });
    
    console.log(`🔧 Set up event listeners for ${filterInputs.length} number inputs`);
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
    
    // Reset dropdowns to "All" option
    dropdowns.forEach(dropdown => {
        const allCheckbox = dropdown.querySelector('input[name$="_all"]');
        const otherCheckboxes = dropdown.querySelectorAll('input:not([name$="_all"])');
        
        if (allCheckbox) {
            allCheckbox.checked = true;
        }
        
        otherCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    });
    
    // Reset range sliders to default values
    const flatnessSliderMin = document.querySelector('input[name="flatness_slider_min"]');
    const flatnessSliderMax = document.querySelector('input[name="flatness_slider_max"]');
    const stiffnessSliderMin = document.querySelector('input[name="stiffness_slider_min"]');
    const stiffnessSliderMax = document.querySelector('input[name="stiffness_slider_max"]');
    
    if (flatnessSliderMin) flatnessSliderMin.value = 1;
    if (flatnessSliderMax) flatnessSliderMax.value = 10;
    if (stiffnessSliderMin) stiffnessSliderMin.value = 1;
    if (stiffnessSliderMax) stiffnessSliderMax.value = 10;
    
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
    const headers = ['Brand', 'Mold', 'Plastic Type', 'Color', 'Weight', 'Flatness', 'Stiffness', 'Price', 'Stock', 'URL'];
    const csvContent = [
        headers.join(','),
        ...filteredDiscs.map(disc => [
            disc.brand || '',
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