// auth-manager.js
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from './firebase-config.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.initAuthListener();
  }

  initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData(user.uid);
      } else {
        this.currentUser = null;
        this.clearUserSession();
      }
    });
  }

  async loadUserData(userId) {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        localStorage.setItem('currentUser', JSON.stringify({
          ...userDoc.data(),
          uid: userId
        }));
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error("Error loading user data:", error);
      return null;
    }
  }

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user is admin
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role === 'admin') {
          return { success: true, role: 'admin', userId: user.uid };
        } else {
          return { success: true, role: 'user', userId: user.uid };
        }
      }
      
      return { success: false, error: "User data not found" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      const user = userCredential.user;

      // Generate user ID
      const userId = await this.generateUserId();
      
      // Prepare user document
      const userDoc = {
        uid: user.uid,
        userId: userId,
        email: userData.email,
        name: userData.name,
        mobile: userData.mobile,
        password: userData.password, // Note: In production, don't store plain passwords
        role: 'user',
        status: 'active',
        balance: 50, // Registration bonus
        fund: 0,
        package: 'None',
        kyc: 'Pending',
        joinDate: serverTimestamp(),
        lastLogin: serverTimestamp(),
        sponsorId: userData.sponsorId || 'CAPITAL01',
        referrals: 0,
        totalIncome: 0,
        todayIncome: 0,
        referralIncome: 0,
        totalTasks: 0,
        rank: 'Beginner',
        createdBy: 'Self Registration',
        deviceInfo: navigator.userAgent,
        ipAddress: 'N/A' // Would need server-side implementation for real IP
      };

      // Save user to Firestore
      await setDoc(doc(db, "users", user.uid), userDoc);

      // Create initial transaction
      await this.createInitialTransaction(user.uid, userId, userData.name);

      // Handle referral bonus
      if (userData.sponsorId) {
        await this.handleReferralBonus(userData.sponsorId, userId, userData.name);
      }

      return { 
        success: true, 
        userId: userId, 
        userData: userDoc 
      };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: error.message };
    }
  }

  async generateUserId() {
    // Get counter from Firestore and increment
    const counterRef = doc(db, "counters", "users");
    try {
      const counterDoc = await getDoc(counterRef);
      let count = 1;
      if (counterDoc.exists()) {
        count = counterDoc.data().count + 1;
      }
      await setDoc(counterRef, { count: count }, { merge: true });
      return 'USER' + String(count).padStart(4, '0');
    } catch (error) {
      console.error("Error generating user ID:", error);
      // Fallback to timestamp-based ID
      return 'USER' + Date.now().toString().slice(-8);
    }
  }

  async createInitialTransaction(userUid, userId, userName) {
    const transactionId = 'TXN' + Date.now().toString().slice(-10);
    
    const transaction = {
      transactionId: transactionId,
      userId: userId,
      userUid: userUid,
      userName: userName,
      type: 'Registration Bonus',
      amount: 50,
      status: 'Success',
      date: serverTimestamp(),
      description: 'Welcome bonus for registration',
      balanceAfter: 50
    };

    await setDoc(doc(db, "transactions", transactionId), transaction);
  }

  async handleReferralBonus(sponsorId, newUserId, newUserName) {
    try {
      // Find sponsor by userId
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("userId", "==", sponsorId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const sponsorDoc = querySnapshot.docs[0];
        const sponsorData = sponsorDoc.data();
        const sponsorUid = sponsorDoc.id;
        
        // Update sponsor's referral count
        await updateDoc(doc(db, "users", sponsorUid), {
          referrals: (sponsorData.referrals || 0) + 1,
          balance: (sponsorData.balance || 0) + 10,
          referralIncome: (sponsorData.referralIncome || 0) + 10,
          totalIncome: (sponsorData.totalIncome || 0) + 10
        });
        
        // Create referral transaction
        const referralTransactionId = 'REF' + Date.now().toString().slice(-10);
        const referralTransaction = {
          transactionId: referralTransactionId,
          userId: sponsorData.userId,
          userUid: sponsorUid,
          userName: sponsorData.name,
          type: 'Referral Commission',
          amount: 10,
          status: 'Success',
          date: serverTimestamp(),
          description: `Referral commission for ${newUserName} (${newUserId})`,
          balanceAfter: (sponsorData.balance || 0) + 10,
          referredUser: newUserId
        };
        
        await setDoc(doc(db, "transactions", referralTransactionId), referralTransaction);
        
        // Add to referral income list
        const referralIncomeId = 'REFINC' + Date.now().toString().slice(-10);
        const referralIncome = {
          referralIncomeId: referralIncomeId,
          userId: sponsorData.userId,
          date: serverTimestamp(),
          referralId: newUserId,
          name: newUserName,
          package: 'None',
          commission: '10%',
          amount: 10,
          status: 'Paid'
        };
        
        await setDoc(doc(db, "referralIncomes", referralIncomeId), referralIncome);
      }
    } catch (error) {
      console.error("Error handling referral bonus:", error);
    }
  }

  async adminLogin(username, password) {
    try {
      // Check if admin exists
      const adminsRef = collection(db, "admins");
      const q = query(adminsRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const adminDoc = querySnapshot.docs[0];
        const adminData = adminDoc.data();
        
        if (adminData.password === password) {
          // Update last login
          await updateDoc(doc(db, "admins", adminDoc.id), {
            lastLogin: serverTimestamp(),
            ipAddress: 'N/A' // Would need server-side for real IP
          });
          
          localStorage.setItem('adminSession', JSON.stringify({
            uid: adminDoc.id,
            username: adminData.username,
            name: adminData.name,
            role: 'admin'
          }));
          
          return { success: true, role: 'admin', adminId: adminDoc.id };
        }
      }
      
      return { success: false, error: "Invalid admin credentials" };
    } catch (error) {
      console.error("Admin login error:", error);
      return { success: false, error: error.message };
    }
  }

  logout() {
    return signOut(auth);
  }

  clearUserSession() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('adminSession');
  }

  getCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  }

  getAdminSession() {
    const adminData = localStorage.getItem('adminSession');
    return adminData ? JSON.parse(adminData) : null;
  }
}

// Export singleton instance
export const authManager = new AuthManager();