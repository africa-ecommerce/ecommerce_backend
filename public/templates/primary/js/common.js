// document.addEventListener('DOMContentLoaded', function() {
//     // Mobile menu functionality
//     const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
//     const mobileSidebar = document.querySelector('.mobile-sidebar');
//     const sidebarOverlay = document.querySelector('.sidebar-overlay');
//     const sidebarClose = document.querySelector('.sidebar-close');
    
//     if (mobileMenuBtn && mobileSidebar && sidebarOverlay && sidebarClose) {
//       mobileMenuBtn.addEventListener('click', () => {
//         mobileSidebar.classList.add('active');
//         sidebarOverlay.classList.add('active');
//         document.body.style.overflow = 'hidden';
//       });
      
//       sidebarClose.addEventListener('click', () => {
//         mobileSidebar.classList.remove('active');
//         sidebarOverlay.classList.remove('active');
//         document.body.style.overflow = '';
//       });
      
//       sidebarOverlay.addEventListener('click', () => {
//         mobileSidebar.classList.remove('active');
//         sidebarOverlay.classList.remove('active');
//         document.body.style.overflow = '';
        
//         // Also close cart modal if open
//         const cartModal = document.querySelector('.cart-modal');
//         if (cartModal) {
//           cartModal.classList.remove('active');
//         }
//       });
//     }
    
//     // Search functionality
//     const searchToggle = document.querySelector('.search-toggle');
//     const searchForm = document.querySelector('.search-form');
    
//     if (searchToggle && searchForm) {
//       searchToggle.addEventListener('click', () => {
//         searchForm.classList.toggle('active');
        
//         // Focus on input when search form is opened
//         if (searchForm.classList.contains('active')) {
//           searchForm.querySelector('.search-input').focus();
//         }
//       });
      
//       // Close search form when clicking outside
//       document.addEventListener('click', (e) => {
//         if (!searchForm.contains(e.target) && !searchToggle.contains(e.target)) {
//           searchForm.classList.remove('active');
//         }
//       });
      
//       // Handle search form submission
//       searchForm.addEventListener('submit', (e) => {
//         e.preventDefault();
        
//         const searchInput = searchForm.querySelector('.search-input');
//         const searchTerm = searchInput.value.trim();
        
//         if (searchTerm) {
//           // Redirect to marketplace page with search query
//           window.location.href = `marketplace.html?search=${encodeURIComponent(searchTerm)}`;
//         }
//       });
//     }
    
//     // Set active nav link based on current page
//     const currentPage = window.location.pathname.split('/').pop() || 'index.html';
//     const navLinks = document.querySelectorAll('.nav-link');
    
//     navLinks.forEach(link => {
//       const href = link.getAttribute('href');
//       if (href === currentPage) {
//         link.classList.add('active');
//       } else if (currentPage === 'index.html' && href === '/') {
//         link.classList.add('active');
//       }
//     });
    
//     // Same for mobile nav
//     const mobileNavLinks = document.querySelectorAll('.sidebar-nav a');
    
//     mobileNavLinks.forEach(link => {
//       const href = link.getAttribute('href');
//       if (href === currentPage) {
//         link.classList.add('active');
//       } else if (currentPage === 'index.html' && href === '/') {
//         link.classList.add('active');
//       }
//     });
//   });








document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu functionality
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileSidebar = document.querySelector('.mobile-sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const sidebarClose = document.querySelector('.sidebar-close');
    
    if (mobileMenuBtn && mobileSidebar && sidebarOverlay && sidebarClose) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileSidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
      
      sidebarClose.addEventListener('click', () => {
        mobileSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
      
      sidebarOverlay.addEventListener('click', () => {
        mobileSidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
        
        // Also close cart modal if open
        const cartModal = document.querySelector('.cart-modal');
        if (cartModal) {
          cartModal.classList.remove('active');
        }
      });
    }
    
    // Search functionality
    const searchToggle = document.querySelector('.search-toggle');
    const searchForm = document.querySelector('.search-form');
    
    if (searchToggle && searchForm) {
      searchToggle.addEventListener('click', () => {
        searchForm.classList.toggle('active');
        
        // Focus on input when search form is opened
        if (searchForm.classList.contains('active')) {
          searchForm.querySelector('.search-input').focus();
        }
      });
      
      // Close search form when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target) && !searchToggle.contains(e.target)) {
          searchForm.classList.remove('active');
        }
      });
      
      // Handle search form submission
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const searchInput = searchForm.querySelector('.search-input');
        const searchTerm = searchInput.value.trim();
        
        if (searchTerm) {
          // Redirect to marketplace page with search query
          window.location.href = `marketplace.html?search=${encodeURIComponent(searchTerm)}`;
        }
      });
    }
    
    // Set active nav link based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
      } else if (currentPage === 'index.html' && href === '/') {
        link.classList.add('active');
      }
    });
    
    // Same for mobile nav
    const mobileNavLinks = document.querySelectorAll('.sidebar-nav a');
    
    mobileNavLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
      } else if (currentPage === 'index.html' && href === '/') {
        link.classList.add('active');
      }
    });
  });