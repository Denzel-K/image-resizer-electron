// Get the current page path
const currentPage = window.location.pathname.split('/').pop();

// Add active class to current page link
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.sidebar-menu a');
  
  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href').split('/').pop();
    
    if (currentPage === linkPage || 
        (currentPage === 'index.html' && linkPage === 'index.html') ||
        (currentPage === '' && linkPage === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Add fade-in animation to content
  const contentContainer = document.querySelector('.content-container');
  if (contentContainer) {
    contentContainer.classList.add('fade-in');
  }

  // Add slide-in animation to sidebar menu items
  const menuItems = document.querySelectorAll('.sidebar-menu li');
  menuItems.forEach((item, index) => {
    item.style.animationDelay = `${index * 0.05}s`;
    item.classList.add('slide-in');
  });
});
