// Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize cart from localStorage
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    updateCartCount();
    
    // Add event listeners to all "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        const productCard = this.closest('.product-card') || this.closest('.product-info-detail');
        if (!productCard) return;
        
        const productTitle = productCard.querySelector('.product-title').textContent;
        const productVariant = productCard.querySelector('.product-variant')?.textContent || '';
        const productPrice = productCard.querySelector('.product-price').textContent.replace('$', '');
        const productImage = productCard.closest('.product-detail')?.querySelector('#main-product-image')?.src || 
                            productCard.querySelector('.product-image img')?.src;
        
        // Get quantity if available (product detail page)
        const quantityInput = productCard.querySelector('.quantity-input');
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
        
        // Get color and storage if available (product detail page)
        const selectedColor = document.querySelector('.selected-color')?.textContent || '';
        const selectedStorage = document.querySelector('.storage-option.active')?.dataset.storage || '';
        
        // Create product object
        const product = {
          id: Date.now().toString(),
          title: productTitle,
          variant: selectedColor || productVariant,
          storage: selectedStorage,
          price: parseFloat(productPrice),
          image: productImage,
          quantity: quantity
        };
        
        // Add to cart
        addToCart(product);
        
        // Show confirmation
        showNotification('Product added to cart!');
        
        // Update cart modal if open
        updateCartModal();
      });
    });
    
    // Add event listeners to all "Buy Now" buttons
    document.querySelectorAll('.buy-now-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        const productCard = this.closest('.product-card') || this.closest('.product-info-detail');
        if (!productCard) return;
        
        const productTitle = productCard.querySelector('.product-title').textContent;
        const productVariant = productCard.querySelector('.product-variant')?.textContent || '';
        const productPrice = productCard.querySelector('.product-price').textContent.replace('$', '');
        const productImage = productCard.closest('.product-detail')?.querySelector('#main-product-image')?.src || 
                            productCard.querySelector('.product-image img')?.src;
        
        // Get quantity if available (product detail page)
        const quantityInput = productCard.querySelector('.quantity-input');
        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
        
        // Get color and storage if available (product detail page)
        const selectedColor = document.querySelector('.selected-color')?.textContent || '';
        const selectedStorage = document.querySelector('.storage-option.active')?.dataset.storage || '';
        
        // Create product object
        const product = {
          id: Date.now().toString(),
          title: productTitle,
          variant: selectedColor || productVariant,
          storage: selectedStorage,
          price: parseFloat(productPrice),
          image: productImage,
          quantity: quantity
        };
        
        // Add to cart
        addToCart(product);
        
        // Redirect to checkout
        window.location.href = 'checkout.html';
      });
    });
    
    // Close cart modal
    const cartClose = document.querySelector('.cart-close');
    if (cartClose) {
      cartClose.addEventListener('click', function() {
        document.querySelector('.cart-modal').classList.remove('active');
      });
    }
    
    // Helper functions
    function addToCart(product) {
      // Check if product already exists in cart
      const existingProductIndex = cart.findIndex(item => 
        item.title === product.title && 
        item.variant === product.variant &&
        item.storage === product.storage
      );
      
      if (existingProductIndex > -1) {
        // Update quantity if product exists
        cart[existingProductIndex].quantity += product.quantity;
      } else {
        // Add new product to cart
        cart.push(product);
      }
      
      // Save cart to localStorage
      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Update cart count
      updateCartCount();
    }
    
    function updateCartCount() {
      const cartCount = document.querySelector('.cart-count');
      if (!cartCount) return;
      
      const count = cart.reduce((total, item) => total + item.quantity, 0);
      cartCount.textContent = count;
      
      if (count > 0) {
        cartCount.style.display = 'flex';
      } else {
        cartCount.style.display = 'none';
      }
    }
    
    function updateCartModal() {
      const cartItems = document.querySelector('.cart-modal-items');
      const cartEmpty = document.querySelector('.cart-empty');
      const totalAmount = document.querySelector('.total-amount');
      
      if (!cartItems || !cartEmpty || !totalAmount) return;
      
      if (cart.length === 0) {
        cartEmpty.style.display = 'block';
        cartItems.innerHTML = '';
        totalAmount.textContent = '$0.00';
        return;
      }
      
      cartEmpty.style.display = 'none';
      
      // Clear cart items
      cartItems.innerHTML = '';
      
      // Add each cart item
      let total = 0;
      
      cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
          <div class="cart-item-image">
            <img src="${item.image}" alt="${item.title}">
          </div>
          <div class="cart-item-details">
            <h4>${item.title}</h4>
            <p>${item.variant}${item.storage ? ', ' + item.storage : ''}</p>
            <div class="cart-item-price">
              <span>$${item.price.toFixed(2)} × ${item.quantity}</span>
              <span>$${itemTotal.toFixed(2)}</span>
            </div>
          </div>
          <button class="cart-item-remove" data-id="${item.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        `;
        
        cartItems.appendChild(cartItem);
      });
      
      // Update total
      totalAmount.textContent = `$${total.toFixed(2)}`;
      
      // Add event listeners to remove buttons
      document.querySelectorAll('.cart-item-remove').forEach(button => {
        button.addEventListener('click', function() {
          const id = this.dataset.id;
          removeFromCart(id);
          updateCartModal();
        });
      });
    }
    
    function removeFromCart(id) {
      cart = cart.filter(item => item.id !== id);
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartCount();
    }
    
    function showNotification(message) {
      // Create notification element if it doesn't exist
      let notification = document.querySelector('.notification');
      
      if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
      }
      
      // Set message and show notification
      notification.textContent = message;
      notification.classList.add('active');
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        notification.classList.remove('active');
      }, 3000);
    }
  });