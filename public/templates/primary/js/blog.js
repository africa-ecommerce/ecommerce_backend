document.addEventListener('DOMContentLoaded', function() {
    // Pagination
    const paginationNumbers = document.querySelectorAll('.pagination-number');
    const prevPageBtn = document.querySelector('.prev-page');
    const nextPageBtn = document.querySelector('.next-page');
    
    // Set current page
    let currentPage = 1;
    
    // Add event listeners to pagination numbers
    paginationNumbers.forEach(button => {
      button.addEventListener('click', () => {
        // Get page number
        const pageNumber = parseInt(button.textContent);
        
        // Update current page
        currentPage = pageNumber;
        
        // Update pagination UI
        updatePaginationUI();
        
        // Scroll to top of blog posts
        document.querySelector('.blog-posts').scrollIntoView({ behavior: 'smooth' });
      });
    });
    
    // Add event listeners to prev/next buttons
    if (prevPageBtn) {
      prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          updatePaginationUI();
          document.querySelector('.blog-posts').scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
    
    if (nextPageBtn) {
      nextPageBtn.addEventListener('click', () => {
        if (currentPage < paginationNumbers.length) {
          currentPage++;
          updatePaginationUI();
          document.querySelector('.blog-posts').scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
    
    // Update pagination UI
    function updatePaginationUI() {
      // Update pagination numbers
      paginationNumbers.forEach(button => {
        const pageNumber = parseInt(button.textContent);
        
        if (pageNumber === currentPage) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
      
      // Update prev/next buttons
      if (prevPageBtn) {
        prevPageBtn.disabled = currentPage === 1;
      }
      
      if (nextPageBtn) {
        nextPageBtn.disabled = currentPage === paginationNumbers.length;
      }
    }
    
    // Newsletter form
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value.trim();
        
        if (email) {
          // Show success message
          const successMessage = document.createElement('div');
          successMessage.className = 'newsletter-success';
          successMessage.textContent = 'Thank you for subscribing!';
          successMessage.style.color = 'var(--color-success)';
          successMessage.style.marginTop = 'var(--spacing-2)';
          
          // Replace form with success message
          newsletterForm.innerHTML = '';
          newsletterForm.appendChild(successMessage);
        }
      });
    }
    
    // Category list
    const categoryLinks = document.querySelectorAll('.category-list a');
    
    categoryLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get category name
        const category = link.textContent.split(' ')[0];
        
        // Show alert for demo purposes
        alert(`Filtering by category: ${category}`);
      });
    });
    
    // Tags
    const tagLinks = document.querySelectorAll('.tag');
    
    tagLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get tag name
        const tag = link.textContent;
        
        // Show alert for demo purposes
        alert(`Filtering by tag: ${tag}`);
      });
    });
    
    // Read more links
    const readMoreLinks = document.querySelectorAll('.read-more');
    
    readMoreLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Get post title
        const postTitle = link.closest('.post-content').querySelector('.post-title').textContent;
        
        // Show alert for demo purposes
        alert(`Reading article: ${postTitle}`);
      });
    });
  });