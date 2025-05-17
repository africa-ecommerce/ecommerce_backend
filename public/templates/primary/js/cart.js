// // Cart functionality
// class ShoppingCart {
//   constructor() {
//     this.items = [];
//     this.total = 0;
//     this.count = 0;
//     this.init();
//   }

//   init() {
//     // Load cart from localStorage
//     this.loadCart();

//     // Update cart UI
//     this.updateCartUI();

//     // Add event listeners
//     this.addEventListeners();
//   }

//   loadCart() {
//     const savedCart = localStorage.getItem("cart");
//     if (savedCart) {
//       this.items = JSON.parse(savedCart);
//       this.calculateTotals();
//     }
//   }

//   saveCart() {
//     localStorage.setItem("cart", JSON.stringify(this.items));
//     this.calculateTotals();
//     this.updateCartUI();
//   }

//   calculateTotals() {
//     this.count = this.items.reduce((total, item) => total + item.quantity, 0);
//     this.total = this.items.reduce(
//       (total, item) => total + item.price * item.quantity,
//       0
//     );
//   }

//   addItem(product) {
//     // Check if product already exists in cart
//     const existingItem = this.items.find((item) => item.id === product.id);

//     if (existingItem) {
//       existingItem.quantity += 1;
//     } else {
//       this.items.push({
//         ...product,
//         quantity: 1,
//       });
//     }

//     this.saveCart();
//     this.showNotification(`${product.title} added to cart!`);
//   }

//   removeItem(productId) {
//     this.items = this.items.filter((item) => item.id !== productId);
//     this.saveCart();
//   }

//   updateQuantity(productId, quantity) {
//     const item = this.items.find((item) => item.id === productId);

//     if (item) {
//       item.quantity = quantity;

//       if (item.quantity <= 0) {
//         this.removeItem(productId);
//       } else {
//         this.saveCart();
//       }
//     }
//   }

//   clearCart() {
//     this.items = [];
//     this.saveCart();
//   }

//   updateCartUI() {
//     // Update cart count
//     const cartCountElements = document.querySelectorAll(".cart-count");
//     cartCountElements.forEach((element) => {
//       element.textContent = this.count;
//     });

//     // Update cart items
//     const cartItemsContainer = document.querySelector(".cart-modal-items");
//     const cartEmptyElement = document.querySelector(".cart-empty");
//     const totalAmountElement = document.querySelector(".total-amount");

//     if (cartItemsContainer) {
//       if (this.items.length === 0) {
//         // Show empty cart message
//         cartItemsContainer.innerHTML = `
//             <div class="cart-empty">
//               <p>Your cart is empty</p>
//               <a href="marketplace.html" class="btn btn-primary">Shop Now</a>
//             </div>
//           `;
//       } else {
//         // Hide empty cart message if it exists
//         if (cartEmptyElement) {
//           cartEmptyElement.style.display = "none";
//         }

//         // Render cart items
//         cartItemsContainer.innerHTML = this.items
//           .map(
//             (item) => `
//             <div class="cart-item" data-id="${item.id}">
//               <div class="cart-item-image">
//                 <img src="${item.image}" alt="${item.title}">
//               </div>
//               <div class="cart-item-details">
//                 <h4 class="cart-item-title">${item.title}</h4>
//                 <p class="cart-item-price">$${item.price.toFixed(2)}</p>
//                 <div class="cart-item-quantity">
//                   <button class="quantity-btn decrease-quantity" data-id="${
//                     item.id
//                   }">-</button>
//                   <span>${item.quantity}</span>
//                   <button class="quantity-btn increase-quantity" data-id="${
//                     item.id
//                   }">+</button>
//                   <span class="cart-item-remove" data-id="${
//                     item.id
//                   }">Remove</span>
//                 </div>
//               </div>
//             </div>
//           `
//           )
//           .join("");

//         // Add event listeners to cart items
//         this.addCartItemEventListeners();
//       }

//       // Update total amount
//       if (totalAmountElement) {
//         totalAmountElement.textContent = `$${this.total.toFixed(2)}`;
//       }
//     }
//   }

//   addCartItemEventListeners() {
//     // Increase quantity
//     const increaseButtons = document.querySelectorAll(".increase-quantity");
//     increaseButtons.forEach((button) => {
//       button.addEventListener("click", () => {
//         const productId = button.getAttribute("data-id");
//         const item = this.items.find((item) => item.id === productId);
//         if (item) {
//           this.updateQuantity(productId, item.quantity + 1);
//         }
//       });
//     });

//     // Decrease quantity
//     const decreaseButtons = document.querySelectorAll(".decrease-quantity");
//     decreaseButtons.forEach((button) => {
//       button.addEventListener("click", () => {
//         const productId = button.getAttribute("data-id");
//         const item = this.items.find((item) => item.id === productId);
//         if (item) {
//           this.updateQuantity(productId, item.quantity - 1);
//         }
//       });
//     });

//     // Remove item
//     const removeButtons = document.querySelectorAll(".cart-item-remove");
//     removeButtons.forEach((button) => {
//       button.addEventListener("click", () => {
//         const productId = button.getAttribute("data-id");
//         this.removeItem(productId);
//       });
//     });
//   }

//   addEventListeners() {
//     // Cart toggle
//     const cartBtn = document.querySelector(".cart-btn");
//     const cartModal = document.querySelector(".cart-modal");
//     const cartClose = document.querySelector(".cart-close");
//     const sidebarOverlay = document.querySelector(".sidebar-overlay");

//     if (cartBtn && cartModal && cartClose && sidebarOverlay) {
//       cartBtn.addEventListener("click", () => {
//         cartModal.classList.add("active");
//         sidebarOverlay.classList.add("active");
//         document.body.style.overflow = "hidden";
//       });

//       cartClose.addEventListener("click", () => {
//         cartModal.classList.remove("active");
//         sidebarOverlay.classList.remove("active");
//         document.body.style.overflow = "";
//       });

//       sidebarOverlay.addEventListener("click", () => {
//         cartModal.classList.remove("active");
//         sidebarOverlay.classList.remove("active");
//         document.body.style.overflow = "";
//       });
//     }

//     // Add to cart buttons
//     document.addEventListener("click", (e) => {
//       if (e.target.classList.contains("add-to-cart-btn")) {
//         e.preventDefault();
//         e.stopPropagation();

//         const productCard = e.target.closest(".product-card");
//         if (productCard) {
//           const productId =
//             productCard.getAttribute("data-id") ||
//             productCard.getAttribute("href").split("id=")[1];
//           const productTitle =
//             productCard.querySelector(".product-title").textContent;
//           const productPrice = parseFloat(
//             productCard
//               .querySelector(".product-price")
//               .textContent.replace("$", "")
//           );
//           const productImage = productCard
//             .querySelector(".product-image img")
//             .getAttribute("src");

//           this.addItem({
//             id: productId,
//             title: productTitle,
//             price: productPrice,
//             image: productImage,
//           });
//         }
//       }
//     });
//   }

//   showNotification(message) {
//     // Check if notification container exists
//     let notificationContainer = document.querySelector(
//       ".notification-container"
//     );

//     // Create notification container if it doesn't exist
//     if (!notificationContainer) {
//       notificationContainer = document.createElement("div");
//       notificationContainer.className = "notification-container";
//       document.body.appendChild(notificationContainer);

//       // Add styles
//       notificationContainer.style.position = "fixed";
//       notificationContainer.style.bottom = "20px";
//       notificationContainer.style.right = "20px";
//       notificationContainer.style.zIndex = "1000";
//     }

//     // Create notification
//     const notification = document.createElement("div");
//     notification.className = "notification";
//     notification.textContent = message;

//     // Add styles
//     notification.style.backgroundColor = "var(--color-success)";
//     notification.style.color = "white";
//     notification.style.padding = "10px 20px";
//     notification.style.borderRadius = "var(--radius-md)";
//     notification.style.marginTop = "10px";
//     notification.style.boxShadow = "var(--shadow-md)";
//     notification.style.animation = "fadeIn 0.3s, fadeOut 0.3s 2.7s";

//     // Add animation styles
//     const style = document.createElement("style");
//     style.textContent = `
//         @keyframes fadeIn {
//           from { opacity: 0; transform: translateY(20px); }
//           to { opacity: 1; transform: translateY(0); }
//         }
        
//         @keyframes fadeOut {
//           from { opacity: 1; transform: translateY(0); }
//           to { opacity: 0; transform: translateY(20px); }
//         }
//       `;
//     document.head.appendChild(style);

//     // Add notification to container
//     notificationContainer.appendChild(notification);

//     // Remove notification after 3 seconds
//     setTimeout(() => {
//       notification.remove();
//     }, 3000);
//   }
// }

// // Initialize cart
// const cart = new ShoppingCart();

// // Export cart for use in other files
// window.cart = cart;




// Cart functionality
class ShoppingCart {
    constructor() {
      this.items = [];
      this.total = 0;
      this.count = 0;
      this.init();
    }
  
    init() {
      // Load cart from localStorage
      this.loadCart();
      
      // Update cart UI
      this.updateCartUI();
      
      // Add event listeners
      this.addEventListeners();
    }
  
    loadCart() {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        this.items = JSON.parse(savedCart);
        this.calculateTotals();
      }
    }
  
    saveCart() {
      localStorage.setItem('cart', JSON.stringify(this.items));
      this.calculateTotals();
      this.updateCartUI();
    }
  
    calculateTotals() {
      this.count = this.items.reduce((total, item) => total + item.quantity, 0);
      this.total = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }
  
    addItem(product) {
      // Check if product already exists in cart
      const existingItem = this.items.find(item => item.id === product.id);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        this.items.push({
          ...product,
          quantity: 1
        });
      }
      
      this.saveCart();
      this.showNotification(`${product.title} added to cart!`);
    }
  
    removeItem(productId) {
      this.items = this.items.filter(item => item.id !== productId);
      this.saveCart();
    }
  
    updateQuantity(productId, quantity) {
      const item = this.items.find(item => item.id === productId);
      
      if (item) {
        item.quantity = quantity;
        
        if (item.quantity <= 0) {
          this.removeItem(productId);
        } else {
          this.saveCart();
        }
      }
    }
  
    clearCart() {
      this.items = [];
      this.saveCart();
    }
  
    updateCartUI() {
      // Update cart count
      const cartCountElements = document.querySelectorAll('.cart-count');
      cartCountElements.forEach(element => {
        element.textContent = this.count;
      });
      
      // Update cart items
      const cartItemsContainer = document.querySelector('.cart-modal-items');
      const cartEmptyElement = document.querySelector('.cart-empty');
      const totalAmountElement = document.querySelector('.total-amount');
      
      if (cartItemsContainer) {
        if (this.items.length === 0) {
          // Show empty cart message
          cartItemsContainer.innerHTML = `
            <div class="cart-empty">
              <p>Your cart is empty</p>
              <a href="marketplace.html" class="btn btn-primary">Shop Now</a>
            </div>
          `;
        } else {
          // Hide empty cart message if it exists
          if (cartEmptyElement) {
            cartEmptyElement.style.display = 'none';
          }
          
          // Render cart items
          cartItemsContainer.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${item.id}">
              <div class="cart-item-image">
                <img src="${item.image}" alt="${item.title}">
              </div>
              <div class="cart-item-details">
                <h4 class="cart-item-title">${item.title}</h4>
                <p class="cart-item-price">$${item.price.toFixed(2)}</p>
                <div class="cart-item-quantity">
                  <button class="quantity-btn decrease-quantity" data-id="${item.id}">-</button>
                  <span>${item.quantity}</span>
                  <button class="quantity-btn increase-quantity" data-id="${item.id}">+</button>
                  <span class="cart-item-remove" data-id="${item.id}">Remove</span>
                </div>
              </div>
            </div>
          `).join('');
          
          // Add event listeners to cart items
          this.addCartItemEventListeners();
        }
        
        // Update total amount
        if (totalAmountElement) {
          totalAmountElement.textContent = `$${this.total.toFixed(2)}`;
        }
      }
    }
  
    addCartItemEventListeners() {
      // Increase quantity
      const increaseButtons = document.querySelectorAll('.increase-quantity');
      increaseButtons.forEach(button => {
        button.addEventListener('click', () => {
          const productId = button.getAttribute('data-id');
          const item = this.items.find(item => item.id === productId);
          if (item) {
            this.updateQuantity(productId, item.quantity + 1);
          }
        });
      });
      
      // Decrease quantity
      const decreaseButtons = document.querySelectorAll('.decrease-quantity');
      decreaseButtons.forEach(button => {
        button.addEventListener('click', () => {
          const productId = button.getAttribute('data-id');
          const item = this.items.find(item => item.id === productId);
          if (item) {
            this.updateQuantity(productId, item.quantity - 1);
          }
        });
      });
      
      // Remove item
      const removeButtons = document.querySelectorAll('.cart-item-remove');
      removeButtons.forEach(button => {
        button.addEventListener('click', () => {
          const productId = button.getAttribute('data-id');
          this.removeItem(productId);
        });
      });
    }
  
    addEventListeners() {
      // Cart toggle
      const cartBtn = document.querySelector('.cart-btn');
      const cartModal = document.querySelector('.cart-modal');
      const cartClose = document.querySelector('.cart-close');
      const sidebarOverlay = document.querySelector('.sidebar-overlay');
      
      if (cartBtn && cartModal && cartClose && sidebarOverlay) {
        cartBtn.addEventListener('click', () => {
          cartModal.classList.add('active');
          sidebarOverlay.classList.add('active');
          document.body.style.overflow = 'hidden';
        });
        
        cartClose.addEventListener('click', () => {
          cartModal.classList.remove('active');
          sidebarOverlay.classList.remove('active');
          document.body.style.overflow = '';
        });
        
        sidebarOverlay.addEventListener('click', () => {
          cartModal.classList.remove('active');
          sidebarOverlay.classList.remove('active');
          document.body.style.overflow = '';
        });
      }
      
      // Add to cart buttons
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
          e.preventDefault();
          e.stopPropagation();
          
          const productCard = e.target.closest('.product-card');
          if (productCard) {
            const productId = productCard.getAttribute('data-id') || productCard.getAttribute('href').split('id=')[1];
            const productTitle = productCard.querySelector('.product-title').textContent;
            const productPrice = parseFloat(productCard.querySelector('.product-price').textContent.replace('$', ''));
            const productImage = productCard.querySelector('.product-image img').getAttribute('src');
            
            this.addItem({
              id: productId,
              title: productTitle,
              price: productPrice,
              image: productImage
            });
          }
        }
      });
    }
  
    showNotification(message) {
      // Check if notification container exists
      let notificationContainer = document.querySelector('.notification-container');
      
      // Create notification container if it doesn't exist
      if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
        
        // Add styles
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.bottom = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
      }
      
      // Create notification
      const notification = document.createElement('div');
      notification.className = 'notification';
      notification.textContent = message;
      
      // Add styles
      notification.style.backgroundColor = 'var(--color-success)';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = 'var(--radius-md)';
      notification.style.marginTop = '10px';
      notification.style.boxShadow = 'var(--shadow-md)';
      notification.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 2.7s';
      
      // Add animation styles
      const style = document.createElement('style');
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(20px); }
        }
      `;
      document.head.appendChild(style);
      
      // Add notification to container
      notificationContainer.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  }
  
  // Initialize cart
  const cart = new ShoppingCart();
  
  // Export cart for use in other files
  window.cart = cart;
