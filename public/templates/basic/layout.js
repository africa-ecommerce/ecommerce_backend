



document.addEventListener('DOMContentLoaded', function() {
    // Check if we're using dynamic loading or static HTML
    const headerContainer = document.getElementById('header-container');
    const footerContainer = document.getElementById('footer-container');
    
    // If header container exists, load it dynamically
    if (headerContainer) {
      fetch('components/header.html')
        .then(response => response.text())
        .then(data => {
          headerContainer.innerHTML = data;
          initializeHeader(); // Initialize header functionality after loading
        })
        .catch(error => {
          console.error('Error loading header:', error);
          // If header fails to load, still try to initialize with existing elements
          initializeHeader();
        });
    } else {
      // Header is already in the HTML, just initialize it
      initializeHeader();
    }
    
    // If footer container exists, load it dynamically
    if (footerContainer) {
      fetch('components/footer.html')
        .then(response => response.text())
        .then(data => {
          footerContainer.innerHTML = data;
        })
        .catch(error => {
          console.error('Error loading footer:', error);
        });
    }
  });
  
  // Initialize header functionality
  function initializeHeader() {
    // Search functionality
    const searchToggle = document.querySelector('.search-toggle');
    const searchForm = document.querySelector('.search-form');
    
    if (searchToggle && searchForm) {
      searchToggle.addEventListener('click', function() {
        searchForm.classList.toggle('active');
        const searchInput = searchForm.querySelector('input');
        if (searchInput) searchInput.focus();
      });
    }
    
    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.mobile-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (mobileMenuBtn && sidebar && overlay) {
      mobileMenuBtn.addEventListener('click', function() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    }
    
    // Close sidebar when clicking on overlay
    if (overlay && sidebar) {
      overlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
    
    // Close button in sidebar
    const closeBtn = document.querySelector('.sidebar-close');
    if (closeBtn && sidebar && overlay) {
      closeBtn.addEventListener('click', function() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
    
    // Cart functionality
    const cartBtn = document.querySelector('.cart-btn');
    const cartModal = document.querySelector('.cart-modal');
    const cartClose = document.querySelector('.cart-close');
    
    if (cartBtn && cartModal) {
      cartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        cartModal.classList.toggle('active');
      });
      
      // Close cart with the close button
      if (cartClose) {
        cartClose.addEventListener('click', function() {
          cartModal.classList.remove('active');
        });
      }
    }
    
    // Close cart when clicking outside
    document.addEventListener('click', function(e) {
      if (cartModal && cartModal.classList.contains('active')) {
        if (!cartModal.contains(e.target) && !cartBtn.contains(e.target)) {
          cartModal.classList.remove('active');
        }
      }
    });
  }