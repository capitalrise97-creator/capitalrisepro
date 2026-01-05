// ui-manager.js
import { authManager } from './auth-manager.js';
import { dataManager } from './data-manager.js';

class UIManager {
  constructor() {
    this.init();
  }

  init() {
    this.checkSession();
    this.setupEventListeners();
  }

  checkSession() {
    const adminSession = authManager.getAdminSession();
    const currentUser = authManager.getCurrentUser();
    
    if (adminSession) {
      this.showAdminDashboard();
    } else if (currentUser) {
      this.showUserDashboard();
    } else {
      this.showLoginPage();
    }
  }

  setupEventListeners() {
    // Login form
    document.getElementById('loginUserID')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
    
    // Register form
    document.getElementById('regFullName')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleRegister();
    });
    
    // Other event listeners...
  }

  async handleLogin() {
    const userId = document.getElementById('loginUserID').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!userId || !password) {
      this.showToast('Please enter User ID and Password', 'error');
      return;
    }
    
    this.showLoading();
    
    try {
      // First try to find user by userId
      const users = await dataManager.getAllUsers();
      const user = users.find(u => u.userId === userId);
      
      if (!user) {
        throw new Error('User ID not found');
      }
      
      const result = await authManager.login(user.email, password);
      
      if (result.success) {
        if (result.role === 'admin') {
          this.showAdminDashboard();
          this.showToast('Admin login successful!', 'success');
        } else {
          this.showUserDashboard();
          this.showToast(`Welcome back, ${user.name}!`, 'success');
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  async handleRegister() {
    const name = document.getElementById('regFullName').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const sponsorId = document.getElementById('regSponsorID').value.trim().toUpperCase();
    
    if (!name || !mobile || !email || !password || !confirmPassword) {
      this.showToast('Please fill all fields', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      this.showToast('Passwords do not match!', 'error');
      return;
    }
    
    if (password.length < 6) {
      this.showToast('Password must be at least 6 characters', 'error');
      return;
    }
    
    this.showLoading();
    
    try {
      const userData = {
        name,
        mobile,
        email,
        password,
        sponsorId
      };
      
      const result = await authManager.register(userData);
      
      if (result.success) {
        this.showRegistrationPopup(result.userId, result.userData);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  async handleAdminLogin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    if (!username || !password) {
      this.showToast('Please enter admin credentials', 'error');
      return;
    }
    
    this.showLoading();
    
    try {
      const result = await authManager.adminLogin(username, password);
      
      if (result.success) {
        this.showAdminDashboard();
        this.showToast('Admin login successful!', 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    } finally {
      this.hideLoading();
    }
  }

  showRegistrationPopup(userId, userData) {
    document.getElementById('popupUserId').innerText = userId;
    document.getElementById('popupPassword').innerText = '********';
    document.getElementById('popupSponsorId').innerText = userData.sponsorId || 'CAPITAL01';
    document.getElementById('popupJoinDate').innerText = new Date().toLocaleDateString();
    
    document.getElementById('popupOverlay').style.display = 'block';
    document.getElementById('registrationPopup').style.display = 'block';
  }

  closeRegistrationPopup() {
    document.getElementById('popupOverlay').style.display = 'none';
    document.getElementById('registrationPopup').style.display = 'none';
    this.showLoginPage();
  }

  showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('forgotPasswordPage').style.display = 'none';
    document.getElementById('adminLoginPage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
  }

  showRegisterPage() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'flex';
    document.getElementById('forgotPasswordPage').style.display = 'none';
    document.getElementById('adminLoginPage').style.display = 'none';
  }

  showForgotPasswordPage() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('forgotPasswordPage').style.display = 'flex';
    document.getElementById('adminLoginPage').style.display = 'none';
  }

  showAdminLoginPage() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('registerPage').style.display = 'none';
    document.getElementById('forgotPasswordPage').style.display = 'none';
    document.getElementById('adminLoginPage').style.display = 'flex';
  }

  async showUserDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    await this.updateUserDashboard();
  }

  showAdminDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    
    this.updateAdminDashboard();
  }

  async updateUserDashboard() {
    const currentUser = authManager.getCurrentUser();
    if (!currentUser) return;
    
    // Update UI with user data
    document.getElementById('userName').innerText = currentUser.name;
    document.getElementById('userId').innerText = currentUser.userId;
    document.getElementById('userBalance').innerText = `₹${currentUser.balance}`;
    document.getElementById('userFund').innerText = `₹${currentUser.fund}`;
    // ... update other fields
    
    // Load additional data
    await this.loadUserTransactions();
    await this.loadUserTasks();
  }

  async updateAdminDashboard() {
    try {
      const stats = await dataManager.getPlatformStats();
      
      // Update admin dashboard stats
      document.getElementById('adminTotalUsers').innerText = stats.totalUsers;
      document.getElementById('adminActiveUsers').innerText = stats.activeUsers;
      document.getElementById('adminTotalDeposits').innerText = `₹${stats.totalDeposits}`;
      // ... update other stats
      
      await this.loadAdminTables();
    } catch (error) {
      console.error("Error updating admin dashboard:", error);
    }
  }

  async loadUserTransactions() {
    try {
      const currentUser = authManager.getCurrentUser();
      if (!currentUser) return;
      
      const transactions = await dataManager.getUserTransactions(currentUser.uid);
      // Update transactions table...
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  }

  async loadAdminTables() {
    // Load admin tables data
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      ${message}
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  showLoading() {
    document.getElementById('loading').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loading').style.display = 'none';
  }

  logout() {
    authManager.logout();
    this.showLoginPage();
  }

  adminLogout() {
    authManager.clearUserSession();
    this.showLoginPage();
  }
}

// Export singleton instance
export const uiManager = new UIManager();

// Export functions for global use
window.uiManager = uiManager;