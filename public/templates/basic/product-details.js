document.addEventListener('DOMContentLoaded', function() {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    // Mock showNotification function
    function showNotification(message, type) {
        console.log(`${type}: ${message}`);
    }

    // Mock loadRelatedProducts function
    function loadRelatedProducts(category) {
        console.log(`Loading related products for category: ${category}`);
    }
    
    if (!productId) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Fetch product data
    // In a real application, this would be an API call
    // For this demo, we'll use a mock product database
    const product = getProductById(productId);
    
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    // Update page title
    document.title = `${product.title} - Store`;
    
    // Update product details
    updateProductDetails(product);
    
    // Initialize product functionality
    initProductFunctionality();
    
    // Load related products
    loadRelatedProducts(product.category);
});

// Mock product database
function getProductById(id) {
    const products = {
        '1': {
            id: '1',
            title: 'Phone 13 Pro',
            price: 999,
            originalPrice: 1099,
            discount: '10%',
            rating: 4.8,
            reviewCount: 120,
            description: 'Experience the next generation of mobile technology with our most advanced camera system and stunning Super Retina XDR display. The Phone 13 Pro features a powerful A15 Bionic chip, all-day battery life, and 5G capability.',
            colors: [
                { name: 'Midnight Black', code: '#1F2937' },
                { name: 'Gold', code: '#D1B000' },
                { name: 'Silver', code: '#E5E7EB' },
                { name: 'Sierra Blue', code: '#0369A1' }
            ],
            storage: ['128GB', '256GB', '512GB', '1TB'],
            sku: 'P13PRO-128GB-BLK',
            category: 'Smartphones',
            tags: 'Phone, 5G, Premium',
            fullDescription: `<h3>The Ultimate Smartphone Experience</h3>
                <p>The Phone 13 Pro is the most advanced smartphone we've ever created. It features a stunning Super Retina XDR display with ProMotion technology for a faster, more responsive feel. The new camera system delivers impressive improvements in low-light photography, and the A15 Bionic chip provides exceptional performance and power efficiency.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>6.1-inch Super Retina XDR display with ProMotion technology</li>
                    <li>A15 Bionic chip with 5-core GPU</li>
                    <li>Pro camera system with new 12MP Telephoto, Wide, and Ultra Wide cameras</li>
                    <li>Up to 22 hours of video playback</li>
                    <li>5G capable for superfast downloads and high-quality streaming</li>
                    <li>Ceramic Shield front, tougher than any smartphone glass</li>
                    <li>IP68 water resistance</li>
                    <li>iOS 15 with new features for FaceTime, Messages, Photos, and more</li>
                </ul>`,
            specifications: `<div class="specs-group">
                <h3>Display</h3>
                <div class="spec-item">
                    <div class="spec-name">Type</div>
                    <div class="spec-value">Super Retina XDR OLED, ProMotion</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Size</div>
                    <div class="spec-value">6.1 inches</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Resolution</div>
                    <div class="spec-value">2532 x 1170 pixels, 460 ppi</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Protection</div>
                    <div class="spec-value">Ceramic Shield glass</div>
                </div>
            </div>
            
            <div class="specs-group">
                <h3>Processor</h3>
                <div class="spec-item">
                    <div class="spec-name">Chipset</div>
                    <div class="spec-value">A15 Bionic</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">CPU</div>
                <div class="spec-value">Hexa-core (2x3.22 GHz + 4x1.82 GHz)</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">GPU</div>
                    <div class="spec-value">Apple GPU (5-core graphics)</div>
                </div>
            </div>
            
            <div class="specs-group">
                <h3>Memory</h3>
                <div class="spec-item">
                    <div class="spec-name">RAM</div>
                    <div class="spec-value">6GB</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Storage</div>
                    <div class="spec-value">128GB/256GB/512GB/1TB</div>
                </div>
            </div>
            
            <div class="specs-group">
                <h3>Camera</h3>
                <div class="spec-item">
                    <div class="spec-name">Main</div>
                    <div class="spec-value">12 MP, f/1.5, 26mm (wide)</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Telephoto</div>
                    <div class="spec-value">12 MP, f/2.8, 77mm (telephoto), 3x optical zoom</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Ultra Wide</div>
                    <div class="spec-value">12 MP, f/1.8, 13mm, 120° (ultrawide)</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Front</div>
                    <div class="spec-value">12 MP, f/2.2, 23mm (wide)</div>
                </div>
            </div>
            
            <div class="specs-group">
                <h3>Battery</h3>
                <div class="spec-item">
                    <div class="spec-name">Type</div>
                    <div class="spec-value">Li-Ion, non-removable</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Capacity</div>
                    <div class="spec-value">3095 mAh</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Charging</div>
                    <div class="spec-value">Fast charging 20W, 50% in 30 min</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Wireless</div>
                    <div class="spec-value">15W MagSafe wireless charging</div>
                </div>
            </div>`,
            reviews: [
                {
                    name: 'John D.',
                    rating: 5,
                    date: '2 weeks ago',
                    title: 'Best phone I\'ve ever owned!',
                    text: 'The camera quality is absolutely stunning, especially in low light. Battery life is impressive too - I can go a full day of heavy use without needing to recharge. The display is bright and responsive with the new ProMotion technology. Highly recommend!'
                },
                {
                    name: 'Sarah M.',
                    rating: 4,
                    date: '1 month ago',
                    title: 'Great upgrade from my old phone',
                    text: 'I upgraded from the Phone 11 and the difference is noticeable. The screen is much better, the camera takes amazing photos, and everything feels faster. The only reason I\'m giving 4 stars instead of 5 is that the battery life could be a bit better, but it\'s still good enough for a full day.'
                },
                {
                    name: 'Michael T.',
                    rating: 5,
                    date: '3 months ago',
                    title: 'Professional photographer\'s dream',
                    text: 'As a professional photographer, I\'m extremely impressed with the camera system on this phone. The macro photography capabilities are outstanding, and the ProRAW format gives me so much flexibility in post-processing. The cinematic mode for video is also a game-changer. Highly recommended for anyone serious about mobile photography.'
                }
            ]
        },
        '2': {
            id: '2',
            title: 'Phone 13',
            price: 799,
            originalPrice: 899,
            discount: '11%',
            rating: 4.7,
            reviewCount: 95,
            description: 'The Phone 13 features a bright Super Retina XDR display, impressive dual-camera system, and the powerful A15 Bionic chip for lightning-fast performance. With all-day battery life and 5G capability, it\'s the perfect everyday companion.',
            colors: [
                { name: 'Midnight', code: '#1F2937' },
                { name: 'Starlight', code: '#F9FAFB' },
                { name: 'Blue', code: '#60A5FA' },
                { name: 'Pink', code: '#F9A8D4' },
                { name: 'Red', code: '#EF4444' }
            ],
            storage: ['128GB', '256GB', '512GB'],
            sku: 'P13-128GB-BLU',
            category: 'Smartphones',
            tags: 'Phone, 5G, Mid-range',
            fullDescription: `<h3>Beautifully Designed. Beautifully Capable.</h3>
                <p>The Phone 13 brings impressive new capabilities to our most popular smartphone. With the powerful A15 Bionic chip, Super Retina XDR display, and advanced dual-camera system, it delivers an experience that's both beautiful and incredibly capable.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>6.1-inch Super Retina XDR display</li>
                    <li>A15 Bionic chip with 4-core GPU</li>
                    <li>Advanced dual-camera system with 12MP Wide and Ultra Wide cameras</li>
                    <li>Up to 19 hours of video playback</li>
                    <li>5G capable for superfast downloads and high-quality streaming</li>
                    <li>Ceramic Shield front, tougher than any smartphone glass</li>
                    <li>IP68 water resistance</li>
                    <li>iOS 15 with new features for FaceTime, Messages, Photos, and more</li>
                </ul>`,
            specifications: `<div class="specs-group">
                <h3>Display</h3>
                <div class="spec-item">
                    <div class="spec-name">Type</div>
                    <div class="spec-value">Super Retina XDR OLED</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Size</div>
                    <div class="spec-value">6.1 inches</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Resolution</div>
                    <div class="spec-value">2532 x 1170 pixels, 460 ppi</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Protection</div>
                    <div class="spec-value">Ceramic Shield glass</div>
                </div>
            </div>
            
            <div class="specs-group">
                <h3>Processor</h3>
                <div class="spec-item">
                    <div class="spec-name">Chipset</div>
                    <div class="spec-value">A15 Bionic</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">CPU</div>
                    <div class="spec-value">Hexa-core (2x3.22 GHz + 4x1.82 GHz)</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">GPU</div>
                    <div class="spec-value">Apple GPU (4-core graphics)</div>
                </div>
            </div>
            
            <div class="specs-group">
                <h3>Memory</h3>
                <div class="spec-item">
                    <div class="spec-name">RAM</div>
                    <div class="spec-value">4GB</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Storage</div>
                    <div class="spec-value">128GB/256GB/512GB</div>
                </div>
            </div>
            
            <div class="specs-group">
                <h3>Camera</h3>
                <div class="spec-item">
                    <div class="spec-name">Main</div>
                    <div class="spec-value">12 MP, f/1.6, 26mm (wide)</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Ultra Wide</div>
                    <div class="spec-value">12 MP, f/2.4, 13mm, 120° (ultrawide)</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Front</div>
                    <div class="spec-value">12 MP, f/2.2, 23mm (wide)</div>
                </div>
            </div>
            
            <div class="specs-group">
                <h3>Battery</h3>
                <div class="spec-item">
                    <div class="spec-name">Type</div>
                    <div class="spec-value">Li-Ion, non-removable</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Capacity</div>
                    <div class="spec-value">3240 mAh</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Charging</div>
                    <div class="spec-value">Fast charging 20W, 50% in 30 min</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Wireless</div>
                    <div class="spec-value">15W MagSafe wireless charging</div>
                </div>
            </div>`,
            reviews: [
                {
                    name: 'Emily R.',
                    rating: 5,
                    date: '3 weeks ago',
                    title: 'Perfect for everyday use',
                    text: 'I love my new Phone 13! The camera is amazing, the battery lasts all day, and it\'s so much faster than my old phone. The blue color is gorgeous too!'
                },
                {
                    name: 'David K.',
                    rating: 4,
                    date: '2 months ago',
                    title: 'Great phone, but not a huge upgrade',
                    text: 'If you\'re coming from a Phone 12, the upgrade might not be worth it. But from anything older, this is a fantastic phone. Camera and battery life are both excellent.'
                }
            ]
        },
        // Add more products as needed
        '3': {
            id: '3',
            title: 'Phone 13 Pro Max',
            price: 1099,
            originalPrice: 1199,
            discount: '8%',
            rating: 4.9,
            reviewCount: 150,
            description: 'Our most advanced Pro camera system ever. Super Retina XDR display with ProMotion technology. Lightning-fast A15 Bionic chip. Exceptional battery life. The Phone 13 Pro Max is the ultimate smartphone.',
            colors: [
                { name: 'Midnight Black', code: '#1F2937' },
                { name: 'Gold', code: '#D1B000' },
                { name: 'Silver', code: '#E5E7EB' },
                { name: 'Sierra Blue', code: '#0369A1' }
            ],
            storage: ['128GB', '256GB', '512GB', '1TB'],
            sku: 'P13PROMAX-128GB-BLK',
            category: 'Smartphones',
            tags: 'Phone, 5G, Premium',
            fullDescription: `<h3>The Ultimate Smartphone Experience</h3>
                <p>The Phone 13 Pro Max is our largest and most advanced smartphone ever. With its expansive 6.7-inch Super Retina XDR display with ProMotion technology, it delivers an unparalleled viewing experience. The Pro camera system takes mobile photography to new heights, and the A15 Bionic chip provides incredible performance and efficiency.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>6.7-inch Super Retina XDR display with ProMotion technology</li>
                    <li>A15 Bionic chip with 5-core GPU</li>
                    <li>Pro camera system with new 12MP Telephoto, Wide, and Ultra Wide cameras</li>
                    <li>Up to 28 hours of video playback</li>
                    <li>5G capable for superfast downloads and high-quality streaming</li>
                    <li>Ceramic Shield front, tougher than any smartphone glass</li>
                    <li>IP68 water resistance</li>
                    <li>iOS 15 with new features for FaceTime, Messages, Photos, and more</li>
                </ul>`,
            specifications: `<div class="specs-group">
                <h3>Display</h3>
                <div class="spec-item">
                    <div class="spec-name">Type</div>
                    <div class="spec-value">Super Retina XDR OLED, ProMotion</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Size</div>
                    <div class="spec-value">6.7 inches</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Resolution</div>
                    <div class="spec-value">2778 x 1284 pixels, 458 ppi</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Protection</div>
                    <div class="spec-value">Ceramic Shield glass</div>
                </div>
            </div>`,
            reviews: [
                {
                    name: 'Robert J.',
                    rating: 5,
                    date: '1 week ago',
                    title: 'The best phone on the market',
                    text: 'This phone exceeds all expectations. The screen is gorgeous, the camera system is incredible, and the battery life is phenomenal. I can easily get through two days of moderate use without charging.'
                }
            ]
        },
        '4': {
            id: '4',
            title: 'Wireless Earbuds',
            price: 199,
            originalPrice: 249,
            discount: '20%',
            rating: 4.7,
            reviewCount: 85,
            description: 'Immersive sound, active noise cancellation, and a comfortable fit make these wireless earbuds the perfect audio companion for your daily life.',
            colors: [
                { name: 'White', code: '#FFFFFF' },
                { name: 'Black', code: '#000000' }
            ],
            sku: 'WE-PRO-WHT',
            category: 'Audio',
            tags: 'Earbuds, Wireless, Audio',
            fullDescription: `<h3>Immersive Sound. All-Day Comfort.</h3>
                <p>Our Wireless Earbuds deliver an exceptional audio experience with rich, detailed sound and powerful active noise cancellation. The custom-designed drivers provide clear highs, natural mids, and deep, powerful bass for an immersive listening experience.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>Active Noise Cancellation blocks outside noise</li>
                    <li>Transparency mode for hearing and interacting with the world around you</li>
                    <li>Spatial audio with dynamic head tracking</li>
                    <li>Up to 6 hours of listening time with ANC enabled</li>
                    <li>Up to 30 hours total listening time with the charging case</li>
                    <li>Sweat and water resistant (IPX4)</li>
                    <li>Force sensor for easy control of music, calls, and more</li>
                    <li>Automatic switching between devices</li>
                </ul>`,
            specifications: `<div class="specs-group">
                <h3>Audio</h3>
                <div class="spec-item">
                    <div class="spec-name">Driver</div>
                    <div class="spec-value">Custom high-excursion driver</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Microphones</div>
                    <div class="spec-value">Dual beamforming microphones</div>
                </div>
                <div class="spec-item">
                    <div class="spec-name">Chip</div>
                    <div class="spec-value">H1 headphone chip</div>
                </div>
            </div>`,
            reviews: [
                {
                    name: 'Lisa T.',
                    rating: 5,
                    date: '2 weeks ago',
                    title: 'Amazing sound quality',
                    text: 'These earbuds have incredible sound quality and the noise cancellation is top-notch. I use them every day for work calls and listening to music, and they never disappoint.'
                }
            ]
        }
    };
    
    return products[id];
}

// Update product details on the page
function updateProductDetails(product) {
    // Update breadcrumb
    document.getElementById('product-breadcrumb').textContent = product.title;
    
    // Update title
    document.getElementById('product-title').textContent = product.title;
    
    // Update price
    document.getElementById('product-price').textContent = `$${product.price}`;
    document.getElementById('product-original-price').textContent = `$${product.originalPrice}`;
    document.getElementById('product-discount').textContent = `-${product.discount}`;
    
    // Update rating
    document.getElementById('product-rating').textContent = `${product.rating} (${product.reviewCount} reviews)`;
    document.getElementById('average-rating').textContent = product.rating;
    document.getElementById('total-reviews').textContent = `Based on ${product.reviewCount} reviews`;
    
    // Update description
    document.getElementById('product-description').innerHTML = `<p>${product.description}</p>`;
    
    // Update full description
    document.getElementById('full-description').innerHTML = product.fullDescription;
    
    // Update specifications
    document.getElementById('specifications-content').innerHTML = product.specifications;
    
    // Update meta information
    document.getElementById('product-sku').textContent = product.sku;
    document.getElementById('product-category').textContent = product.category;
    document.getElementById('product-tags').textContent = product.tags;
    
    // Update color options
    const colorOptions = document.getElementById('color-options');
    colorOptions.innerHTML = '';
    
    product.colors.forEach((color, index) => {
        const colorBtn = document.createElement('button');
        colorBtn.className = `color-option ${index === 0 ? 'active' : ''}`;
        colorBtn.style.backgroundColor = color.code;
        colorBtn.setAttribute('data-color', color.name);
        colorOptions.appendChild(colorBtn);
    });
    
    // Update selected color text
    document.querySelector('.selected-color').textContent = product.colors[0].name;
    
    // Update storage options if available
    const storageContainer = document.getElementById('storage-container');
    const storageOptions = document.getElementById('storage-options');
    
    if (product.storage && product.storage.length > 0) {
        storageContainer.style.display = 'block';
        storageOptions.innerHTML = '';
        
        product.storage.forEach((storage, index) => {
            const storageBtn = document.createElement('button');
            storageBtn.className = `storage-option ${index === 0 ? 'active' : ''}`;
            storageBtn.setAttribute('data-storage', storage);
            storageBtn.textContent = storage;
            storageOptions.appendChild(storageBtn);
        });
    } else {
        storageContainer.style.display = 'none';
    }
    
    // Update reviews
    const reviewsList = document.getElementById('reviews-list');
    reviewsList.innerHTML = '';
    
    if (product.reviews && product.reviews.length > 0) {
        product.reviews.forEach(review => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            
            // Create stars HTML
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= review.rating) {
                    starsHtml += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
                } else {
                    starsHtml += `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
                }
            }
            
            reviewItem.innerHTML = `
                <div class="review-header">
                    <div class="reviewer-info">
                        <div class="reviewer-avatar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                        <div class="reviewer-name">${review.name}</div>
                    </div>
                    <div class="review-rating">
                        <div class="stars">
                            ${starsHtml}
                        </div>
                        <div class="review-date">${review.date}</div>
                    </div>
                </div>
                <h4 class="review-title">${review.title}</h4>
                <p class="review-text">${review.text}</p>
            `;
            
            reviewsList.appendChild(reviewItem);
        });
    } else {
        reviewsList.innerHTML = '<p>No reviews yet. Be the first to review this product!</p>';
    }
}

// Initialize product functionality
function initProductFunctionality() {
    // Product image gallery
    const mainImage = document.getElementById('main-product-image');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Update main image
            const imageUrl = this.getAttribute('data-image');
            if (mainImage && imageUrl) {
                mainImage.src = imageUrl;
            }
            
            // Update active thumbnail
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Color selection
    const colorOptions = document.querySelectorAll('.color-option');
    const selectedColorText = document.querySelector('.selected-color');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Update active color
            colorOptions.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            
            // Update selected color text
            if (selectedColorText) {
                selectedColorText.textContent = this.getAttribute('data-color') || 'Selected Color';
            }
        });
    });
    
    // Storage selection
    const storageOptions = document.querySelectorAll('.storage-option');
    
    storageOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Update active storage
            storageOptions.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Quantity controls
    const quantityInput = document.querySelector('.quantity-input');
    const minusBtn = document.querySelector('.quantity-btn.minus');
    const plusBtn = document.querySelector('.quantity-btn.plus');
    
    if (quantityInput && minusBtn && plusBtn) {
        minusBtn.addEventListener('click', function() {
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
        
        plusBtn.addEventListener('click', function() {
            const currentValue = parseInt(quantityInput.value);
            const max = parseInt(quantityInput.getAttribute('max') || '10');
            if (currentValue < max) {
                quantityInput.value = currentValue + 1;
            }
        });
        
        quantityInput.addEventListener('change', function() {
            const min = parseInt(this.getAttribute('min') || '1');
            const max = parseInt(this.getAttribute('max') || '10');
            let value = parseInt(this.value);
            
            if (isNaN(value) || value < min) {
                this.value = min;
            } else if (value > max) {
                this.value = max;
            }
        });
    }
    
    // Product tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding tab pane
            const tabId = this.getAttribute('data-tab');
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === tabId) {
                    pane.classList.add('active');
                }
            });
        });
    });
    
    // Write review button
    const writeReviewBtn = document.querySelector('.write-review-btn');
    
    if (writeReviewBtn) {
        writeReviewBtn.addEventListener('click', function() {
            showNotification('Review form will be implemented in a future update');
        });
    }
    
    // Wishlist button
    const wishlistBtn = document.querySelector('.wishlist-btn');
    
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            
            if (this.classList.contains('active')) {
                // Fill the heart icon when active
                this.querySelector('svg').setAttribute('fill', 'currentColor');
                showNotification('Product added to wishlist');
            } else {
                // Unfill the heart icon when inactive
                this.querySelector('svg').setAttribute('fill', 'none');
                showNotification('Product removed from wishlist');
            }
        });
    }
    
    // Share button
    const shareBtn = document.querySelector('.share-btn');
    
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            // Check if Web Share API is supported
            if (navigator.share) {
                navigator.share({
                    title: document.title,
                    url: window.location.href
                })
                .catch(error => {
                    showNotification('Error sharing product');
                });
            } else {
                // Fallback for browsers that don't support Web Share API
                // Copy URL to clipboard
                const tempInput = document.createElement('input');
                document.body.appendChild(tempInput);
                tempInput.value = window.location.href;
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                
                showNotification('Product URL copied to clipboard');
            }
        });
    }
}

// Load related products
function loadRelatedProducts(category) {
    const relatedProductsContainer = document.getElementById('related-products');
    
    if (!relatedProductsContainer) return;
    
    // In a real application, this would fetch related products from an API
    // For this demo, we'll use a mock list of related products
    const relatedProducts = [
        {
            id: '5',
            title: 'Smart Watch',
            price: 399,
            image: '/placeholder.svg?height=200&width=150'
        },
        {
            id: '6',
            title: 'Tablet Pro',
            price: 799,
            image: '/placeholder.svg?height=200&width=150'
        },
        {
            id: '7',
            title: 'Wireless Headphones',
            price: 349,
            image: '/placeholder.svg?height=200&width=150'
        },
        {
            id: '8',
            title: 'Laptop Pro',
            price: 1299,
            image: '/placeholder.svg?height=200&width=150'
        }
    ];
    
    // Clear container
    relatedProductsContainer.innerHTML = '';
    
    // Add related products
    relatedProducts.forEach(product => {
        const productCard = document.createElement('a');
        productCard.href = `product-details.html?id=${product.id}`;
        productCard.className = 'product-card';
        
        productCard.innerHTML = `
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <p class="product-price">$${product.price}</p>
                <div class="product-actions">
                    <button class="btn btn-sm btn-dark add-to-cart-btn">Add to Cart</button>
                    <button class="btn btn-sm btn-primary buy-now-btn">Buy Now</button>
                </div>
            </div>
        `;
        
        relatedProductsContainer.appendChild(productCard);
    });
    
    // Add event listeners to buttons inside the product cards
    relatedProductsContainer.querySelectorAll('.product-card button').forEach(button => {
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
}

// Notification function
function showNotification(message, type = 'success') {
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
        notification.style.backgroundColor = type === 'success' ? 'var(--color-primary)' : '#EF4444';
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
    notification.style.backgroundColor = type === 'success' ? 'var(--color-primary)' : '#EF4444';
    notification.style.transform = 'translateY(0)';
    notification.style.opacity = '1';
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateY(100px)';
        notification.style.opacity = '0';
    }, 3000);
}