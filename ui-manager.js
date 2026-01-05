// ui-manager.js - SIMPLE VERSION
import { auth, db } from './firebase-config.js';

class UIManager {
  constructor() {
    console.log("UIManager initialized");
    this.init();
  }

  init() {
    console.log("Initializing UI Manager");
    this.setupEventListeners();
    this.showLoginPage();
  }

  setupEventListeners() {
    console.log("Setting up event listeners");
    
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.onclick = () => this.handleLogin();
    }
    
    // Register button
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
      registerBtn.onclick = () => this.handleRegister();
    }
    
    // Other buttons
    const authLinks = document.querySelectorAll('.auth-link');
    authLinks.forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const action = link.getAttribute('data-action');
        this.handleAuthAction(action);
      };
    });
  }

  handleAuthAction(action) {
    console.log("Auth action:", action);
    switch(action) {
      case 'login':
        this.showLoginPage();
        break;
      case 'register':
        this.showRegisterPage();
        break;
      case 'forgot-password':
        this.showForgotPasswordPage();
        break;
      case 'admin-login':
        this.showAdminLoginPage();
        break;
    }
  }

  showLoginPage() {
    console.log("Showing login page");
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('forgotPasswordPage').style.display = 'none';
    document.getElementById('adminLoginPage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
  }

  showRegisterPage() {
    console.log("Showing register page");
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'flex';
    document.getElementById('forgotPasswordPage').style.display = 'none';
    document.getElementById('adminLoginPage').style.display = 'none';
  }

  showForgotPasswordPage() {
    console.log("Showing forgot password page");
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('forgotPasswordPage').style.display = 'flex';
    document.getElementById('adminLoginPage').style.display = 'none';
  }

  showAdminLoginPage() {
    console.log("Showing admin login page");
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('forgotPasswordPage').style.display = 'none';
    document.getElementById('adminLoginPage').style.display = 'flex';
  }

  async handleLogin() {
    console.log("Login attempt");
    const userId = document.getElementById('loginUserID').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!userId || !password) {
      this.showToast('Please enter credentials', 'error');
      return;
    }
    
    this.showToast('Login functionality coming soon...', 'info');
  }

  async handleRegister() {
    console.log("Register attempt");
    this.showToast('Registration functionality coming soon...', 'info');
  }

  showToast(message, type = 'info') {
    console.log(`Toast: ${type} - ${message}`);
    alert(`${type.toUpperCase()}: ${message}`);
  }
}

// Initialize
const uiManager = new UIManager();

// Export for global use
window.uiManager = uiManager;
window.showLogin = () => uiManager.showLoginPage();
window.showRegister = () => uiManager.showRegisterPage();
window.showForgotPassword = () => uiManager.showForgotPasswordPage();
window.showAdminLogin = () => uiManager.showAdminLoginPage();
window.login = () => uiManager.handleLogin();
window.register = () => uiManager.handleRegister();
