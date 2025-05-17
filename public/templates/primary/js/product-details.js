document.addEventListener('DOMContentLoaded', function() {
    // Sample product data
    const products = [
      {
        id: '1',
        title: 'Smartphone Pro',
        price: 999,
        originalPrice: 1299,
        category: 'smartphones',
        brand: 'apple',
        image: '/placeholder.svg?height=400&width=400',
        sku: 'SP-12345',
        description: 'The latest flagship smartphone with cutting-edge features. Featuring a stunning display, powerful processor, and advanced camera system.',
        features: [
          'Super Retina XDR display',
          'A15 Bionic chip',
          'Pro camera system',
          'Up to 1TB storage',
          'Face ID'
        ],
        specifications: {
          dimensions: '146.7 x 71.5 x 7.4 mm',
          weight: '174 g',
          display: '6.1 inches, Super Retina XDR OLED',
          resolution: '1170 x 2532 pixels',
          processor: 'A15 Bionic',
          storage: '128GB, 256GB, 512GB, 1TB',
          camera: '12 MP, f/1.5, 26mm (wide), 12 MP, f/2.8, 77mm (telephoto), 12 MP, f/1.8, 13mm (ultrawide)',
          battery: '3095 mAh'
        },
        colors: ['Black', 'White', 'Blue', 'Red'],
        rating: 4.5,
        reviewCount: 24
      },
      {
        id: '2',
        title: 'Laptop Ultra',
        price: 1299,
        originalPrice: 1499,
        category: 'laptops',
        brand: 'apple',
        image: '/placeholder.svg?height=400&width=400',
        sku: 'LU-67890',
        description: 'Powerful laptop for professionals and creatives. Featuring a high-resolution display, fast processor, and long battery life.',
        features: [
          'Retina display',
          'M1 chip',
          'Up to 16GB RAM',
          'Up to 2TB storage',
          'Touch ID'
        ],
        specifications: {
          dimensions: '304.1 x 212.4 x 16.1 mm',
          weight: '1.4 kg',
          display: '13.3 inches, Retina',
          resolution: '2560 x 1600 pixels',
          processor: 'Apple M1',
          storage: '256GB, 512GB, 1TB, 2TB',
          memory: '8GB, 16GB',
          battery: 'Up to 20 hours'
        },
        colors: ['Silver', 'Space Gray', 'Gold'],
        rating: 4.8,
        reviewCount: 36
      },
      {
        id: '3',
        title: 'Wireless Earbuds',
        price: 149,
        originalPrice: 199,
        category: 'accessories',
        brand: 'apple',
        image: '/placeholder.svg?height=400&width=400',
        sku: 'WE-54321',
        description: 'Premium wireless earbuds with noise cancellation. Featuring high-quality sound, comfortable fit, and long battery life.',
        features: [
          'Active noise cancellation',
          'Transparency mode',
          'Spatial audio',
          'Up to 6 hours of listening time',
          'Wireless charging case'
        ],
        specifications: {
          dimensions: '30.9 x 21.8 x 24.0 mm',
          weight: '5.4 g (each)',
          battery: 'Up to 6 hours (24 hours with case)',
          connectivity: 'Bluetooth 5.0',
          waterResistant: 'IPX4',
          sensors: 'Optical, Motion, Speech detecting accelerometer',
          chipset: 'H1 chip'
        },
        colors: ['White', 'Black'],
        rating: 4.7,
        reviewCount: 42
      },
      {
        id: '4',
        title: 'Smart Watch',
        price: 299,
        originalPrice: 349,
        category: 'accessories',
        brand: 'apple',
        image: '/placeholder.svg?height=400&width=400',
        sku: 'SW-98765',
        description: 'Track your fitness and stay connected with this smart watch. Featuring health monitoring, notifications, and customizable watch faces.',
        features: [
          'Always-On Retina display',
          'ECG app',
          'Blood oxygen sensor',
          'Sleep tracking',
          'Water resistant 50m'
        ],
        specifications: {
          dimensions: '44 x 38 x 10.7 mm',
          weight: '36.5 g',
          display: '1.78 inches, Retina LTPO OLED',
          resolution: '448 x 368 pixels',
          processor: 'S6 SiP',
          storage: '32GB',
          battery: 'Up to 18 hours',
          connectivity: 'Wi-Fi, Bluetooth 5.0, NFC'
        },
        colors: ['Silver', 'Space Gray', 'Gold', 'Blue', 'Red'],
        rating: 4.6,
        reviewCount: 31
      },
      {
        id: '5',
        title: 'Tablet Pro',
        price: 799,
        originalPrice: 899,
        category: 'tablets',
        brand: 'apple',
        image: '/placeholder.svg?height=400&width=400',
        sku: 'TP-24680',
        description: 'The perfect tablet for work and entertainment. Featuring a stunning display, powerful processor, and versatile accessories.',
        features: [
          'Liquid Retina display',
          'M1 chip',
          'Up to 16GB RAM',
          'Up to 2TB storage',
          'Face ID'
        ],
        specifications: {
          dimensions: '247.6 x 178.5 x 5.9 mm',
          weight: '466 g',
          display: '11 inches, Liquid Retina',
          resolution: '2388 x 1668 pixels',
          processor: 'Apple M1',
          storage: '128GB, 256GB, 512GB, 1TB, 2TB',
          memory: '8GB, 16GB',
          battery: 'Up to 10 hours'
        },
        colors: ['Silver', 'Space Gray'],
        rating: 4.9,
        reviewCount: 28
      }
    ];
  
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || '1';
    
    // Find product by ID
    const product = products.find(p => p.id === productId) || products[0];
    
    // Update page title
    document.title = `${product.title} - TechVibe`;
    
    // Update product details
    updateProductDetails(product);
    
    // Add event listeners
    addEventListeners(product);
  });
  
  // Update product details
  function updateProductDetails(product) {
    // Update breadcrumb
    const breadcrumbTitle = document.getElementById('product-title-breadcrumb');
    if (breadcrumbTitle) {
      breadcrumbTitle.textContent = product.title;
    }
    
    // Update product title
    const productTitle = document.getElementById('product-title');
    if (productTitle) {
      productTitle.textContent = product.title;
    }
    
    // Update product SKU
    const productSku = document.getElementById('product-sku');
    if (productSku) {
      productSku.textContent = product.sku;
    }
    
    // Update product price
    const productPrice = document.getElementById('product-price');
    if (productPrice) {
      productPrice.textContent = `$${product.price}`;
    }
    
    // Update product description
    const productDescription = document.getElementById('product-description');
    if (productDescription) {
      productDescription.textContent = product.description;
    }
    
    // Update main product image
    const mainProductImage = document.getElementById('main-product-image');
    if (mainProductImage) {
      mainProductImage.src = product.image;
      mainProductImage.alt = product.title;
    }
    
    // Update tab content
    updateTabContent(product);
  }
  
  // Update tab content
  function updateTabContent(product) {
    // Update description tab
    const descriptionTab = document.getElementById('description');
    if (descriptionTab) {
      let featuresHtml = '';
      
      if (product.features && product.features.length > 0) {
        featuresHtml = `
          <h3>Key Features</h3>
          <ul>
            ${product.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        `;
      }
      
      descriptionTab.innerHTML = `
        <h2>Product Description</h2>
        <p>${product.description}</p>
        ${featuresHtml}
      `;
    }
    
    // Update specifications tab
    const specificationsTab = document.getElementById('specifications');
    if (specificationsTab && product.specifications) {
      let specsHtml = `
        <h2>Product Specifications</h2>
        <table class="specs-table">
          <tbody>
      `;
      
      for (const [key, value] of Object.entries(product.specifications)) {
        specsHtml += `
          <tr>
            <th>${key.charAt(0).toUpperCase() + key.slice(1)}</th>
            <td>${value}</td>
          </tr>
        `;
      }
      
      specsHtml += `
          </tbody>
        </table>
      `;
      
      specificationsTab.innerHTML = specsHtml;
    }
  }
  
  // Add event listeners
  function addEventListeners(product) {
    // Thumbnail images
    const thumbnails = document.querySelectorAll('.thumbnail');
    const mainImage = document.getElementById('main-product-image');
    
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener('click', () => {
        // Remove active class from all thumbnails
        thumbnails.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked thumbnail
        thumbnail.classList.add('active');
        
        // Update main image
        const imageUrl = thumbnail.getAttribute('data-image');
        if (imageUrl && mainImage) {
          mainImage.src = imageUrl;
        }
      });
    });
    
    // Color options
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Remove active class from all color options
        colorOptions.forEach(o => o.classList.remove('active'));
        
        // Add active class to clicked color option
        option.classList.add('active');
        
        // Get selected color
        const selectedColor = option.getAttribute('data-color');
        console.log('Selected color:', selectedColor);
      });
    });
    
    // Quantity selector
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.querySelector('.decrease-quantity');
    const increaseBtn = document.querySelector('.increase-quantity');
    
    if (quantityInput && decreaseBtn && increaseBtn) {
      decreaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          quantityInput.value = currentValue - 1;
        }
      });
      
      increaseBtn.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value);
        const maxValue = parseInt(quantityInput.getAttribute('max'));
        
        if (currentValue < maxValue) {
          quantityInput.value = currentValue + 1;
        }
      });
      
      quantityInput.addEventListener('change', () => {
        const currentValue = parseInt(quantityInput.value);
        const minValue = parseInt(quantityInput.getAttribute('min'));
        const maxValue = parseInt(quantityInput.getAttribute('max'));
        
        if (currentValue < minValue) {
          quantityInput.value = minValue;
        } else if (currentValue > maxValue) {
          quantityInput.value = maxValue;
        }
      });
    }
    
    // Add to cart button
    const addToCartBtn = document.getElementById('add-to-cart');
    
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value);
        const selectedColor = document.querySelector('.color-option.active')?.getAttribute('data-color') || product.colors[0];
        
        // Add product to cart
        window.cart.addItem({
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          quantity: quantity,
          color: selectedColor
        });
      });
    }
    
    // Buy now button
    const buyNowBtn = document.getElementById('buy-now');
    
    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', () => {
        const quantity = parseInt(quantityInput.value);
        const selectedColor = document.querySelector('.color-option.active')?.getAttribute('data-color') || product.colors[0];
        
        // Add product to cart
        window.cart.addItem({
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          quantity: quantity,
          color: selectedColor
        });
        
        // Redirect to checkout page
        // window.location.href = 'checkout.html';
        
        // For demo purposes, just open the cart
        document.querySelector('.cart-btn').click();
      });
    }
    
    // Tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all tab buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked tab button
        button.classList.add('active');
        
        // Hide all tab panes
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Show selected tab pane
        const tabId = button.getAttribute('data-tab');
        const tabPane = document.getElementById(tabId);
        
        if (tabPane) {
          tabPane.classList.add('active');
        }
      });
    });
    
    // Load more reviews button
    const loadMoreBtn = document.querySelector('.load-more-btn');
    
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        // For demo purposes, just show a message
        loadMoreBtn.textContent = 'No more reviews';
        loadMoreBtn.disabled = true;
      });
    }
  }