// Configuration object that can be updated from Studio
const config = {

    templateId: "basic",

    styles: {
        FONT_FAMILY: null,
        TEXT_COLOR: null,
        BACKGROUND_COLOR: null,
        PRIMARY_COLOR: null,
        SECONDARY_COLOR: null,
        ACCENT_COLOR: null,
        FOOTER_BACKGROUND: null,
        FOOTER_TEXT_COLOR: null,
      },
    

    content: {
        BRAND_NAME: null,
        
        HERO_TITLE: null,
        HERO_DESCRIPTION:
          null,
        PRIMARY_CTA_TEXT: null,
        SECONDARY_CTA_TEXT: null,
      
        ABOUT_TEXT:
          null,
       
        INSTAGRAM_LINK: null,
        FACEBOOK_LINK: null,
        TWITTER_LINK: null,
        PHONE_NUMBER: null,
        MAIL: null,
      },
   
    
    // Products
    featuredProducts: null, // Default is the products in the HTML

    metadata: {
        title: null,
        description: null,
      },
    
    
   
};



// Function to apply configuration from Studio

function applyConfig() {
    const root = document.documentElement;
    
    // Apply styles if provided
    if (config.styles.FONT_FAMILY) root.style.setProperty('--font-family', config.styles.FONT_FAMILY);
    if (config.styles.PRIMARY_COLOR) root.style.setProperty('--color-primary', config.styles.PRIMARY_COLOR);
    if (config.styles.SECONDARY_COLOR) root.style.setProperty('--color-secondary', config.styles.SECONDARY_COLOR);
    if (config.styles.ACCENT_COLOR) root.style.setProperty('--color-accent', config.styles.ACCENT_COLOR);
    if (config.styles.BACKGROUND_COLOR) root.style.setProperty('--color-background', config.styles.BACKGROUND_COLOR);
    if (config.styles.TEXT_COLOR) root.style.setProperty('--color-text', config.styles.TEXT_COLOR);
    if (config.styles.FOOTER_BACKGROUND) root.style.setProperty('--color-footer-bg', config.styles.FOOTER_BACKGROUND);
    if (config.styles.FOOTER_TEXT_COLOR) root.style.setProperty('--color-footer-text', config.styles.FOOTER_TEXT_COLOR);
    
    // Apply brand name if provided
    if (config.content.BRAND_NAME) {
        // Update all logo elements
        const logoElements = document.querySelectorAll('.logo a, .logo');
        logoElements.forEach(element => {
            element.textContent = config.content.BRAND_NAME;
        });
        
        // Update footer brand name
        const footerTitle = document.querySelector('.footer-title');
        if (footerTitle) footerTitle.textContent = config.content.BRAND_NAME;
        
        // Update copyright text
        const copyrightElement = document.querySelector('.footer-bottom p');
        if (copyrightElement) {
            copyrightElement.textContent = `© ${new Date().getFullYear()} ${config.content.BRAND_NAME}. All rights reserved.`;
        }
        
        // Update title tag if no specific title is set
        if (!config.metadata.title) {
            document.title = config.content.BRAND_NAME + ' - Premium Electronics';
        }
    }
    
    // Apply hero content if provided
    const heroTitleEl = document.querySelector('.hero h1');
    const heroDescriptionEl = document.querySelector('.hero .description');
    
    if (config.content.HERO_TITLE && heroTitleEl) heroTitleEl.textContent = config.content.HERO_TITLE;
    if (config.content.HERO_DESCRIPTION && heroDescriptionEl) heroDescriptionEl.textContent = config.content.HERO_DESCRIPTION;
    
    // Apply CTA button text if provided
    const primaryCTABtn = document.querySelector('.hero-actions .btn-primary');
    const secondaryCTABtn = document.querySelector('.hero-actions .btn-outline');
    
    if (config.content.PRIMARY_CTA_TEXT && primaryCTABtn) primaryCTABtn.textContent = config.content.PRIMARY_CTA_TEXT;
    if (config.content.SECONDARY_CTA_TEXT && secondaryCTABtn) secondaryCTABtn.textContent = config.content.SECONDARY_CTA_TEXT;
    
    // Apply about text if provided
    const aboutTextElement = document.querySelector('.about-text');
    if (config.content.ABOUT_TEXT && aboutTextElement) {
        // Check if the text contains paragraph tags
        if (config.content.ABOUT_TEXT.trim().startsWith('<p>')) {
            aboutTextElement.innerHTML = config.content.ABOUT_TEXT;
        } else {
            // Split text by newlines and create paragraphs
            const paragraphs = config.content.ABOUT_TEXT.split('\n\n');
            aboutTextElement.innerHTML = '';
            paragraphs.forEach(paragraph => {
                if (paragraph.trim()) {
                    const p = document.createElement('p');
                    p.textContent = paragraph.trim();
                    aboutTextElement.appendChild(p);
                }
            });
        }
    }
    
    // Apply social media links if provided
    const socialLinks = document.querySelectorAll('.social-links a');
    if (socialLinks.length >= 3) {
        if (config.content.FACEBOOK_LINK) socialLinks[0].href = config.content.FACEBOOK_LINK;
        if (config.content.TWITTER_LINK) socialLinks[1].href = config.content.TWITTER_LINK;
        if (config.content.INSTAGRAM_LINK) socialLinks[2].href = config.content.INSTAGRAM_LINK;
    }
    
    // Apply contact information if provided
    // Find elements by checking all paragraphs in footer columns
    const footerParagraphs = document.querySelectorAll('.footer-column p');
    let emailElement = null;
    let phoneElement = null;
    
    footerParagraphs.forEach(p => {
        const text = p.textContent.toLowerCase();
        if (text.includes('email')) emailElement = p;
        if (text.includes('phone')) phoneElement = p;
    });
    
    if (config.content.MAIL && emailElement) {
        emailElement.textContent = `Email: ${config.content.MAIL}`;
    }
    
    if (config.content.PHONE_NUMBER && phoneElement) {
        phoneElement.textContent = `Phone: ${config.content.PHONE_NUMBER}`;
    }
    
    // Apply featured products if provided
    if (config.featuredProducts && Array.isArray(config.featuredProducts)) {
        const productGrid = document.querySelector('.product-grid');
        if (productGrid) {
            productGrid.innerHTML = '';
            config.featuredProducts.forEach(product => {
                const productCard = document.createElement('a');
                productCard.className = 'product-card';
                productCard.href = `product-details.html?id=${product.id || '1'}`;
                productCard.innerHTML = `
                    <div class="product-image">
                        <img src="${product.image || '/placeholder.svg?height=200&width=150'}" alt="${product.title}">
                    </div>
                    <div class="product-info">
                        <h3 class="product-title">${product.title}</h3>
                        ${product.variant ? `<p class="product-variant">${product.variant}</p>` : ''}
                        <p class="product-price">${product.price}</p>
                        <div class="product-actions">
                            <button class="btn btn-sm btn-dark add-to-cart-btn">Add to Cart</button>
                            <button class="btn btn-sm btn-primary buy-now-btn">Buy Now</button>
                        </div>
                    </div>
                `;
                productGrid.appendChild(productCard);
            });
        }
    }
    
    // Apply metadata if provided
    if (config.metadata.title) {
        document.title = config.metadata.title;
    }
    
    if (config.metadata.description) {
        // Look for existing meta description tag
        let metaDescription = document.querySelector('meta[name="description"]');
        
        // If it doesn't exist, create it
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
        }
        
        // Set content attribute
        metaDescription.setAttribute('content', config.metadata.description);
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










