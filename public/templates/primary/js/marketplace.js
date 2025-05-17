document.addEventListener('DOMContentLoaded', function() {
    // Sample product data
    const products = [
      {
        id: '1',
        title: 'Smartphone Pro',
        price: 999,
        category: 'smartphones',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'The latest flagship smartphone with cutting-edge features.'
      },
      {
        id: '2',
        title: 'Laptop Ultra',
        price: 1299,
        category: 'laptops',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Powerful laptop for professionals and creatives.'
      },
      {
        id: '3',
        title: 'Wireless Earbuds',
        price: 149,
        category: 'accessories',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Premium wireless earbuds with noise cancellation.'
      },
      {
        id: '4',
        title: 'Smart Watch',
        price: 299,
        category: 'accessories',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Track your fitness and stay connected with this smart watch.'
      },
      {
        id: '5',
        title: 'Tablet Pro',
        price: 799,
        category: 'tablets',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'The perfect tablet for work and entertainment.'
      },
      {
        id: '6',
        title: 'Wireless Headphones',
        price: 249,
        category: 'accessories',
        brand: 'sony',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Premium wireless headphones with exceptional sound quality.'
      },
      {
        id: '7',
        title: 'Bluetooth Speaker',
        price: 129,
        category: 'accessories',
        brand: 'sony',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Portable Bluetooth speaker with powerful sound.'
      },
      {
        id: '8',
        title: 'Wireless Charger',
        price: 59,
        category: 'accessories',
        brand: 'samsung',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Fast wireless charging for compatible devices.'
      },
      {
        id: '9',
        title: 'Galaxy S21',
        price: 899,
        category: 'smartphones',
        brand: 'samsung',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Flagship Android smartphone with advanced camera system.'
      },
      {
        id: '10',
        title: 'Galaxy Tab S7',
        price: 649,
        category: 'tablets',
        brand: 'samsung',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Premium Android tablet for productivity and entertainment.'
      },
      {
        id: '11',
        title: 'Pixel 6 Pro',
        price: 899,
        category: 'smartphones',
        brand: 'google',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Google\'s flagship smartphone with exceptional camera capabilities.'
      },
      {
        id: '12',
        title: 'MacBook Pro',
        price: 1999,
        category: 'laptops',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Professional-grade laptop with powerful performance.'
      },
      {
        id: '13',
        title: 'Dell XPS 13',
        price: 1299,
        category: 'laptops',
        brand: 'dell',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Premium Windows laptop with InfinityEdge display.'
      },
      {
        id: '14',
        title: 'iPad Air',
        price: 599,
        category: 'tablets',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Lightweight and powerful tablet for everyday use.'
      },
      {
        id: '15',
        title: 'AirPods Pro',
        price: 249,
        category: 'accessories',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Wireless earbuds with active noise cancellation.'
      },
      {
        id: '16',
        title: 'Galaxy Buds Pro',
        price: 199,
        category: 'accessories',
        brand: 'samsung',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Premium wireless earbuds with immersive sound.'
      },
      {
        id: '17',
        title: 'Surface Laptop 4',
        price: 1299,
        category: 'laptops',
        brand: 'microsoft',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Sleek and powerful Windows laptop.'
      },
      {
        id: '18',
        title: 'Galaxy Watch 4',
        price: 249,
        category: 'accessories',
        brand: 'samsung',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Advanced smartwatch with health tracking features.'
      },
      {
        id: '19',
        title: 'iPhone 13',
        price: 799,
        category: 'smartphones',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'The latest iPhone with improved camera and performance.'
      },
      {
        id: '20',
        title: 'iPad Pro',
        price: 999,
        category: 'tablets',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'The most powerful iPad with M1 chip.'
      },
      {
        id: '21',
        title: 'Surface Pro 8',
        price: 1099,
        category: 'tablets',
        brand: 'microsoft',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Versatile 2-in-1 tablet with laptop performance.'
      },
      {
        id: '22',
        title: 'Galaxy Z Fold 3',
        price: 1799,
        category: 'smartphones',
        brand: 'samsung',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Foldable smartphone with large internal display.'
      },
      {
        id: '23',
        title: 'Sony WH-1000XM4',
        price: 349,
        category: 'accessories',
        brand: 'sony',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Industry-leading noise cancelling headphones.'
      },
      {
        id: '24',
        title: 'MacBook Air',
        price: 999,
        category: 'laptops',
        brand: 'apple',
        image: '/placeholder.svg?height=200&width=200',
        description: 'Thin and light laptop with all-day battery life.'
      }
    ];
  
    // Filter and sort state
    let filters = {
      category: [],
      brand: [],
      price: {
        min: 0,
        max: 5000
      }
    };
    
    let sortBy = 'featured';
    let currentPage = 1;
    const productsPerPage = 9;
    
    // DOM elements
    const productGrid = document.querySelector('.product-grid');
    const productsTotalElement = document.getElementById('products-total');
    const sortSelect = document.getElementById('sort-by');
    const minPriceInput = document.getElementById('min-price');
    const maxPriceInput = document.getElementById('max-price');
    const priceRangeSlider = document.getElementById('price-range');
    const applyFiltersBtn = document.querySelector('.apply-filters-btn');
    const resetFiltersBtn = document.querySelector('.reset-filters-btn');
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    const brandCheckboxes = document.querySelectorAll('input[name="brand"]');
    const paginationNumbers = document.querySelector('.pagination-numbers');
    const prevPageBtn = document.querySelector('.prev-page');
    const nextPageBtn = document.querySelector('.next-page');
    
    // Initialize
    function init() {
      // Check URL parameters for initial filters
      const urlParams = new URLSearchParams(window.location.search);
      
      // Apply category filter from URL if present
      const categoryParam = urlParams.get('category');
      if (categoryParam) {
        categoryCheckboxes.forEach(checkbox => {
          if (checkbox.value === 'all') {
            checkbox.checked = false;
          }
          if (checkbox.value === categoryParam) {
            checkbox.checked = true;
            filters.category.push(categoryParam);
          }
        });
      }
      
      // Apply search filter from URL if present
      const searchParam = urlParams.get('search');
      if (searchParam) {
        // Update search input if it exists
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
          searchInput.value = searchParam;
        }
      }
      
      // Render products
      renderProducts();
      
      // Add event listeners
      addEventListeners();
    }
    
    // Add event listeners
    function addEventListeners() {
      // Sort select
      sortSelect.addEventListener('change', () => {
        sortBy = sortSelect.value;
        currentPage = 1;
        renderProducts();
      });
      
      // Price inputs
      minPriceInput.addEventListener('input', () => {
        const minValue = parseInt(minPriceInput.value);
        if (minValue >= 0 && minValue <= parseInt(maxPriceInput.value)) {
          filters.price.min = minValue;
        }
      });
      
      maxPriceInput.addEventListener('input', () => {
        const maxValue = parseInt(maxPriceInput.value);
        if (maxValue >= parseInt(minPriceInput.value)) {
          filters.price.max = maxValue;
          priceRangeSlider.value = maxValue;
        }
      });
      
      // Price slider
      priceRangeSlider.addEventListener('input', () => {
        const value = parseInt(priceRangeSlider.value);
        maxPriceInput.value = value;
        filters.price.max = value;
      });
      
      // Category checkboxes
      categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          if (checkbox.value === 'all' && checkbox.checked) {
            // Uncheck all other category checkboxes
            categoryCheckboxes.forEach(cb => {
              if (cb.value !== 'all') {
                cb.checked = false;
              }
            });
            filters.category = [];
          } else if (checkbox.value !== 'all') {
            // Uncheck "All Categories" checkbox
            const allCategoriesCheckbox = document.querySelector('input[name="category"][value="all"]');
            allCategoriesCheckbox.checked = false;
            
            // Update filters
            if (checkbox.checked) {
              filters.category.push(checkbox.value);
            } else {
              filters.category = filters.category.filter(cat => cat !== checkbox.value);
            }
            
            // If no categories are selected, check "All Categories"
            if (filters.category.length === 0) {
              allCategoriesCheckbox.checked = true;
            }
          }
        });
      });
      
      // Brand checkboxes
      brandCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
          if (checkbox.value === 'all' && checkbox.checked) {
            // Uncheck all other brand checkboxes
            brandCheckboxes.forEach(cb => {
              if (cb.value !== 'all') {
                cb.checked = false;
              }
            });
            filters.brand = [];
          } else if (checkbox.value !== 'all') {
            // Uncheck "All Brands" checkbox
            const allBrandsCheckbox = document.querySelector('input[name="brand"][value="all"]');
            allBrandsCheckbox.checked = false;
            
            // Update filters
            if (checkbox.checked) {
              filters.brand.push(checkbox.value);
            } else {
              filters.brand = filters.brand.filter(brand => brand !== checkbox.value);
            }
            
            // If no brands are selected, check "All Brands"
            if (filters.brand.length === 0) {
              allBrandsCheckbox.checked = true;
            }
          }
        });
      });
      
      // Apply filters button
      applyFiltersBtn.addEventListener('click', () => {
        currentPage = 1;
        renderProducts();
      });
      
      // Reset filters button
      resetFiltersBtn.addEventListener('click', () => {
        // Reset filters
        filters = {
          category: [],
          brand: [],
          price: {
            min: 0,
            max: 5000
          }
        };
        
        // Reset UI
        minPriceInput.value = 0;
        maxPriceInput.value = 5000;
        priceRangeSlider.value = 5000;
        
        // Reset checkboxes
        categoryCheckboxes.forEach(checkbox => {
          checkbox.checked = checkbox.value === 'all';
        });
        
        brandCheckboxes.forEach(checkbox => {
          checkbox.checked = checkbox.value === 'all';
        });
        
        // Reset sort
        sortSelect.value = 'featured';
        sortBy = 'featured';
        
        // Reset page
        currentPage = 1;
        
        // Render products
        renderProducts();
      });
      
      // Pagination
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderProducts();
        }
      });
      
      nextPageBtn.addEventListener('click', () => {
        const filteredProducts = filterProducts();
        const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
        
        if (currentPage < totalPages) {
          currentPage++;
          renderProducts();
        }
      });
    }
    
    // Filter products based on current filters
    function filterProducts() {
      // Start with all products
      let filteredProducts = [...products];
      
      // Apply search filter if present in URL
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      
      if (searchParam) {
        const searchTerm = searchParam.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
          product.title.toLowerCase().includes(searchTerm) || 
          product.description.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply category filter
      if (filters.category.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
          filters.category.includes(product.category)
        );
      }
      
      // Apply brand filter
      if (filters.brand.length > 0) {
        filteredProducts = filteredProducts.filter(product => 
          filters.brand.includes(product.brand)
        );
      }
      
      // Apply price filter
      filteredProducts = filteredProducts.filter(product => 
        product.price >= filters.price.min && product.price <= filters.price.max
      );
      
      // Apply sorting
      switch (sortBy) {
        case 'price-low':
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
          // For demo purposes, we'll just reverse the array
          filteredProducts.reverse();
          break;
        default:
          // 'featured' - no sorting needed
          break;
      }
      
      return filteredProducts;
    }
    
    // Render products
    function renderProducts() {
      // Filter and sort products
      const filteredProducts = filterProducts();
      
      // Update total count
      productsTotalElement.textContent = filteredProducts.length;
      
      // Calculate pagination
      const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
      const startIndex = (currentPage - 1) * productsPerPage;
      const endIndex = startIndex + productsPerPage;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
      
      // Update pagination UI
      renderPagination(totalPages);
      
      // Update pagination buttons
      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = currentPage === totalPages;
      
      // Render products
      productGrid.innerHTML = '';
      
      if (paginatedProducts.length === 0) {
        productGrid.innerHTML = `
          <div class="no-products">
            <p>No products found matching your criteria.</p>
            <button class="btn btn-primary reset-filters-btn">Reset Filters</button>
          </div>
        `;
        
        // Add event listener to reset filters button
        const resetBtn = productGrid.querySelector('.reset-filters-btn');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            resetFiltersBtn.click();
          });
        }
      } else {
        paginatedProducts.forEach(product => {
          const productCard = document.createElement('a');
          productCard.className = 'product-card';
          productCard.href = `product-details.html?id=${product.id}`;
          productCard.setAttribute('data-id', product.id);
          
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
          
          productGrid.appendChild(productCard);
        });
      }
    }
    
    // Render pagination
    function renderPagination(totalPages) {
      paginationNumbers.innerHTML = '';
      
      // Determine which page numbers to show
      let startPage = Math.max(1, currentPage - 1);
      let endPage = Math.min(totalPages, startPage + 2);
      
      // Adjust if we're at the end
      if (endPage - startPage < 2) {
        startPage = Math.max(1, endPage - 2);
      }
      
      // Create page number buttons
      for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `pagination-number${i === currentPage ? ' active' : ''}`;
        pageButton.textContent = i;
        
        pageButton.addEventListener('click', () => {
          currentPage = i;
          renderProducts();
        });
        
        paginationNumbers.appendChild(pageButton);
      }
    }
    
    // Initialize
    init();
  });