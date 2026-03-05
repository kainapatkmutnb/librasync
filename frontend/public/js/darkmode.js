// Dark Mode Toggle Functionality
const themeToggle = {
  init() {
    // Check for saved theme preference or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    this.setTheme(savedTheme);
    
    // Add click event listener to toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  },
  
  setTheme(theme) {
    // Set data-theme attribute on html element
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save preference to localStorage
    localStorage.setItem('theme', theme);
    
    // Update button icon
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      toggleBtn.title = theme === 'dark' ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด';
    }
  },
  
  toggle() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  themeToggle.init();
});

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = themeToggle;
}
