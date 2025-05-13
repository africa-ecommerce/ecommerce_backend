document.addEventListener('DOMContentLoaded', function() {
    // Mobile filter toggle
    const mobileFilterToggle = document.createElement('button');
    mobileFilterToggle.className = 'mobile-filter-toggle';
    mobileFilterToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sliders"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>
        <span>Filters</span>
    `;
    
    const productsContainer = document.querySelector('.products-container');
    if (productsContainer) {
        productsContainer.insertBefore(mobileFilterToggle, productsContainer.firstChild);
    }
    
    // Show/hide filters on mobile
    mobileFilterToggle.addEventListener('click', function() {
        const filtersSidebar = document.querySelector('.filters-sidebar');
        if (filtersSidebar) {
            filtersSidebar.classList.toggle('active');
        }
    });
    
    // Close filters when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const filtersSidebar = document.querySelector('.filters-sidebar');
        if (filtersSidebar && filtersSidebar.classList.contains('active')) {
            if (!filtersSidebar.contains(e.target) && e.target !== mobileFilterToggle) {
                filtersSidebar.classList.remove('active');
            }
        }
    });
    
    // Filter functionality
    const filterCheckboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
    const filterRadios = document.querySelectorAll('.filter-option input[type="radio"]');
    const clearFiltersBtn = document.querySelector('.clear-filters-btn');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    
    // Clear all filters
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            filterCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            
            filterRadios.forEach(radio => {
                radio.checked = false;
            });
            
            // Reset price range
            const minPriceInput = document.getElementById('min-price');
            const maxPriceInput = document.getElementById('max-price');
            
            if (minPriceInput) minPriceInput.value = 0;
            if (maxPriceInput) maxPriceInput.value = 2000;
            
            // Update price slider
            updatePriceSlider();
        });
    }
    
    // Apply filters
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            // In a real application, this would filter the products
            // For this demo, we'll just show a notification
            showNotification('Filters applied!');
            
            // Close mobile filters if open
            const filtersSidebar = document.querySelector('.filters-sidebar');
            if (filtersSidebar && filtersSidebar.classList.contains('active')) {
                filtersSidebar.classList.remove('active');
            }
        });
    }
    
    // Price range slider functionality
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const priceSlider = document.getElementById('price-slider');
    
    function updatePriceSlider() {
        if (!minPriceInput || !maxPriceInput || !priceSlider) return;
        
        const min = parseInt(minPriceInput.value) || 0;
        const max = parseInt(maxPriceInput.value) || 2000;
        const range = 2000; // Max possible price
        
        // Update slider position and width
        const leftPercent = (min / range) * 100;
        const rightPercent = 100 - ((max / range) * 100);
        
        priceSlider.style.left = leftPercent + '%';
        priceSlider.style.width = (100 - leftPercent - rightPercent) + '%';
    }
    
    if (minPriceInput && maxPriceInput) {
        minPriceInput.addEventListener('input', updatePriceSlider);
        maxPriceInput.addEventListener('input', updatePriceSlider);
        
        // Initialize slider
        updatePriceSlider();
    }
    
    // Pagination functionality
    const paginationBtns = document.querySelectorAll('.pagination-btn');
    
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            paginationBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // In a real application, this would load the next page of products
            // For this demo, we'll just scroll to the top of the products
            window.scrollTo({
                top: document.querySelector('.marketplace-header').offsetTop - 100,
                behavior: 'smooth'
            });
        });
    });
    
    // Sort functionality
    const sortSelect = document.getElementById('sort-select');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            // In a real application, this would sort the products
            // For this demo, we'll just show a notification
            showNotification(`Products sorted by: ${this.options[this.selectedIndex].text}`);
        });
    }
    
    // Notification function
    function showNotification(message) {
        // Create notification element if it doesn't exist
        let notification = document.querySelector('.notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'notification';
            document.body.appendChild(notification);
            
            // Add styles if not already in CSS
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.padding = '10px 20px';
            notification.style.backgroundColor = 'var(--color-primary)';
            notification.style.color = 'white';
            notification.style.borderRadius = 'var(--border-radius-md)';
            notification.style.boxShadow = 'var(--shadow-md)';
            notification.style.zIndex = '1000';
            notification.style.transform = 'translateY(100px)';
            notification.style.opacity = '0';
            notification.style.transition = 'transform 0.3s, opacity 0.3s';
        }
        
        // Set message and show notification
        notification.textContent = message;
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateY(100px)';
            notification.style.opacity = '0';
        }, 3000);
    }
    
    // Prevent default form submission for search
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchInput = this.querySelector('.search-input');
            if (searchInput && searchInput.value.trim()) {
                showNotification(`Searching for: ${searchInput.value}`);
            }
        });
    }
    
    // Product card click handling
    document.querySelectorAll('.product-card').forEach(card => {
        // Prevent default action when clicking buttons inside the card
        card.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Handle button click (add to cart or buy now)
                if (this.classList.contains('add-to-cart-btn')) {
                    // Add to cart logic is in cart.js
                } else if (this.classList.contains('buy-now-btn')) {
                    // Buy now logic is in cart.js
                }
            });
        });
    });
});