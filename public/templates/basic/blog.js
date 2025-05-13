document.addEventListener('DOMContentLoaded', function() {
    // Toggle between blog posts and empty state
    const toggleButton = document.getElementById('toggle-empty-state');
    const blogPosts = document.getElementById('blog-posts');
    const blogEmptyState = document.getElementById('blog-empty-state');
    const blogPagination = document.getElementById('blog-pagination');
    
    // For demo purposes, we'll add a URL parameter to show the empty state
    const urlParams = new URLSearchParams(window.location.search);
    const showEmpty = urlParams.get('empty') === 'true';
    
    if (showEmpty) {
        showEmptyState();
    }
    
    // Function to show empty state
    function showEmptyState() {
        if (blogPosts) blogPosts.style.display = 'none';
        if (blogEmptyState) blogEmptyState.style.display = 'block';
        if (blogPagination) blogPagination.style.display = 'none';
    }
    
    // Function to show blog posts
    function showBlogPosts() {
        if (blogPosts) blogPosts.style.display = 'flex';
        if (blogEmptyState) blogEmptyState.style.display = 'none';
        if (blogPagination) blogPagination.style.display = 'flex';
    }
    
    // Create demo posts button
    const createDemoPostsBtn = document.getElementById('create-demo-posts');
    if (createDemoPostsBtn) {
        createDemoPostsBtn.addEventListener('click', function() {
            showBlogPosts();
            
            // Update URL without reloading the page
            const url = new URL(window.location);
            url.searchParams.delete('empty');
            window.history.pushState({}, '', url);
            
            // Show notification
            showNotification('Sample blog posts loaded!');
        });
    }
    
    // Mobile sidebar toggle
    const mobileSidebarToggle = document.createElement('button');
    mobileSidebarToggle.className = 'mobile-sidebar-toggle';
    mobileSidebarToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-list"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/></svg>
        <span>Blog Categories</span>
    `;
    
    const blogContent = document.querySelector('.blog-content');
    if (blogContent) {
        blogContent.insertBefore(mobileSidebarToggle, blogContent.firstChild);
    }
    
    // Show/hide sidebar on mobile
    mobileSidebarToggle.addEventListener('click', function() {
        const blogSidebar = document.querySelector('.blog-sidebar');
        if (blogSidebar) {
            blogSidebar.classList.toggle('active');
        }
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        const blogSidebar = document.querySelector('.blog-sidebar');
        if (blogSidebar && blogSidebar.classList.contains('active')) {
            if (!blogSidebar.contains(e.target) && e.target !== mobileSidebarToggle) {
                blogSidebar.classList.remove('active');
            }
        }
    });
    
    // Category links
    const categoryLinks = document.querySelectorAll('.category-list a');
    
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            categoryLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // In a real application, this would filter the blog posts
            // For this demo, we'll just show a notification
            const category = this.textContent;
            showNotification(`Filtering by category: ${category}`);
        });
    });
    
    // Pagination functionality
    const paginationBtns = document.querySelectorAll('.pagination-btn');
    
    paginationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            paginationBtns.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // In a real application, this would load the next page of blog posts
            // For this demo, we'll just scroll to the top of the blog
            window.scrollTo({
                top: document.querySelector('.blog-header').offsetTop - 100,
                behavior: 'smooth'
            });
            
            // Show notification
            showNotification(`Navigated to page ${this.textContent}`);
        });
    });
    
    // Subscribe form
    const subscribeForm = document.querySelector('.subscribe-form');
    
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const emailInput = this.querySelector('input[type="email"]');
            if (emailInput && emailInput.value.trim()) {
                showNotification(`Subscribed with email: ${emailInput.value}`);
                emailInput.value = '';
            }
        });
    }
    
    // Prevent default form submission for search
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchInput = this.querySelector('.search-input');
            if (searchInput && searchInput.value.trim()) {
                showNotification(`Searching for: ${searchInput.value}`);
            }
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
});