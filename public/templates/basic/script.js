// Configuration object that can be updated from Studio
const config = {
    // Colors
    colorPrimary: null, // Default is black (#000000)
    colorSecondary: null, // Default is dark gray (#333333)
    colorAccent: null, // Default is purple (#5D5FEF)
    colorBackground: null, // Default is white (#FFFFFF)
    colorText: null, // Default is dark gray (#333333)
    colorTextLight: null, // Default is medium gray (#666666)
    colorBorder: null, // Default is light gray (#E5E5E5)
    colorFooterBg: null, // Default is very dark gray (#111111)
    colorFooterText: null, // Default is white (#FFFFFF)
    
    // Content
    heroTitle: null, // Default is "Phone 13 Pro"
    heroSubtitle: null, // Default is "The ultimate smartphone experience"
    heroDescription: null, // Default is the description in the HTML
    
    // Products
    featuredProducts: null, // Default is the products in the HTML
    
    // Categories
    categories: null, // Default is the categories in the HTML
    
    // Sale
    saleTitle: null, // Default is "Big Summer Sale"
    saleDescription: null, // Default is "Up to 50% off on selected items"
};

// Function to apply configuration from Studio
function applyConfig() {
    const root = document.documentElement;
    
    // Apply colors if provided
    if (config.colorPrimary) root.style.setProperty('--color-primary', config.colorPrimary);
    if (config.colorSecondary) root.style.setProperty('--color-secondary', config.colorSecondary);
    if (config.colorAccent) root.style.setProperty('--color-accent', config.colorAccent);
    if (config.colorBackground) root.style.setProperty('--color-background', config.colorBackground);
    if (config.colorText) root.style.setProperty('--color-text', config.colorText);
    if (config.colorTextLight) root.style.setProperty('--color-text-light', config.colorTextLight);
    if (config.colorBorder) root.style.setProperty('--color-border', config.colorBorder);
    if (config.colorFooterBg) root.style.setProperty('--color-footer-bg', config.colorFooterBg);
    if (config.colorFooterText) root.style.setProperty('--color-footer-text', config.colorFooterText);
    
    // Apply content if provided
    const heroTitleEl = document.querySelector('.hero h1');
    const heroSubtitleEl = document.querySelector('.hero .subtitle');
    const heroDescriptionEl = document.querySelector('.hero .description');
    
    if (config.heroTitle && heroTitleEl) heroTitleEl.textContent = config.heroTitle;
    if (config.heroSubtitle && heroSubtitleEl) heroSubtitleEl.textContent = config.heroSubtitle;
    if (config.heroDescription && heroDescriptionEl) heroDescriptionEl.textContent = config.heroDescription;
    
    // Apply sale content if provided
    const saleTitleEl = document.querySelector('.sale-text h2');
    const saleDescriptionEl = document.querySelector('.sale-text p');
    
    if (config.saleTitle && saleTitleEl) saleTitleEl.textContent = config.saleTitle;
    if (config.saleDescription && saleDescriptionEl) saleDescriptionEl.textContent = config.saleDescription;
    
    // Apply featured products if provided
    if (config.featuredProducts && Array.isArray(config.featuredProducts)) {
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            productGrid.innerHTML = '';
            config.featuredProducts.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <div class="product-image">
                        <img src="${product.image || '/placeholder.svg?height=200&width=150'}" alt="${product.title}">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title}</h3>
                        <p class="product-variant">${product.variant}</p>
                        <p class="product-price">${product.price}</p>
                        <button class="btn btn-sm btn-dark">Add to Cart</button>
                    </div>
                `;
                productGrid.appendChild(productCard);
            });
        }
    }
    
    // Apply categories if provided
    if (config.categories && Array.isArray(config.categories)) {
        const categoryGrid = document.querySelector('.category-grid');
        if (categoryGrid) {
            categoryGrid.innerHTML = '';
            config.categories.forEach(category => {
                const categoryCard = document.createElement('div');
                categoryCard.className = 'category-card';
                categoryCard.innerHTML = `
                    <div class="category-image">
                        <img src="${category.image || '/placeholder.svg?height=150&width=150'}" alt="${category.title}">
                    </div>
                    <h3 class="category-title">${category.title}</h3>
                    <a href="${category.link || '#'}" class="category-link">View All</a>
                `;
                categoryGrid.appendChild(categoryCard);
            });
        }
    }
}

// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    
    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', function() {
            mainNav.style.display = mainNav.style.display === 'block' ? 'none' : 'block';
        });
    }
    
    // Apply configuration
    applyConfig();
    
    // Add to cart functionality
    const addToCartButtons = document.querySelectorAll('.btn-dark');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productTitle = this.closest('.product-info').querySelector('.product-title').textContent;
            alert(`Added ${productTitle} to cart!`);
        });
    });
});

// Function to receive configuration from Studio
window.updateConfig = function(newConfig) {
    // Merge new config with existing config
    Object.assign(config, newConfig);
    
    // Apply the updated configuration
    applyConfig();
};










