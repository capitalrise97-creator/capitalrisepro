// data-manager.js
import { 
  db, 
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from './firebase-config.js';

class DataManager {
  constructor() {
    this.db = db;
  }

  // User Management
  async getUser(userId) {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting user:", error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting user by email:", error);
      throw error;
    }
  }

  async updateUser(userId, data) {
    try {
      await updateDoc(doc(db, "users", userId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  async getAllUsers() {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "user"));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  // Deposit Management
  async createDepositRequest(data) {
    try {
      const depositId = 'DEP' + Date.now().toString().slice(-10);
      const depositData = {
        ...data,
        depositId: depositId,
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, "deposits", depositId), depositData);
      return depositId;
    } catch (error) {
      console.error("Error creating deposit request:", error);
      throw error;
    }
  }

  async getDepositRequests(status = null) {
    try {
      const depositsRef = collection(db, "deposits");
      let q;
      
      if (status) {
        q = query(depositsRef, where("status", "==", status));
      } else {
        q = query(depositsRef, orderBy("createdAt", "desc"));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error getting deposit requests:", error);
      throw error;
    }
  }

  async approveDeposit(depositId, adminId) {
    try {
      const depositRef = doc(db, "deposits", depositId);
      const depositDoc = await getDoc(depositRef);
      
      if (!depositDoc.exists()) {
        throw new Error("Deposit not found");
      }
      
      const depositData = depositDoc.data();
      const userRef = doc(db, "users", depositData.userUid);
      
      // Use batch for atomic operations
      const batch = writeBatch(db);
      
      // Update deposit status
      batch.update(depositRef, {
        status: 'Approved',
        approvedBy: adminId,
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update user balance
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const newBalance = (userData.balance || 0) + depositData.amount;
      
      batch.update(userRef, {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      
      // Create transaction record
      const transactionId = 'TXN' + Date.now().toString().slice(-10);
      const transactionRef = doc(db, "transactions", transactionId);
      
      batch.set(transactionRef, {
        transactionId: transactionId,
        userId: depositData.userId,
        userUid: depositData.userUid,
        userName: depositData.userName,
        type: 'Deposit',
        amount: depositData.amount,
        status: 'Success',
        date: serverTimestamp(),
        description: `Deposit via ${depositData.method}`,
        balanceAfter: newBalance,
        depositId: depositId,
        upiTransactionId: depositData.upiTransactionId
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error approving deposit:", error);
      throw error;
    }
  }

  // Withdrawal Management
  async createWithdrawalRequest(data) {
    try {
      const withdrawalId = 'WDR' + Date.now().toString().slice(-10);
      const withdrawalData = {
        ...data,
        withdrawalId: withdrawalId,
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, "withdrawals", withdrawalId), withdrawalData);
      return withdrawalId;
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      throw error;
    }
  }

  async getWithdrawalRequests(status = null) {
    try {
      const withdrawalsRef = collection(db, "withdrawals");
      let q;
      
      if (status) {
        q = query(withdrawalsRef, where("status", "==", status));
      } else {
        q = query(withdrawalsRef, orderBy("createdAt", "desc"));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error getting withdrawal requests:", error);
      throw error;
    }
  }

  async approveWithdrawal(withdrawalId, adminId, transactionId) {
    try {
      const withdrawalRef = doc(db, "withdrawals", withdrawalId);
      const withdrawalDoc = await getDoc(withdrawalRef);
      
      if (!withdrawalDoc.exists()) {
        throw new Error("Withdrawal not found");
      }
      
      const withdrawalData = withdrawalDoc.data();
      const userRef = doc(db, "users", withdrawalData.userUid);
      
      const batch = writeBatch(db);
      
      // Update withdrawal status
      batch.update(withdrawalRef, {
        status: 'Approved',
        approvedBy: adminId,
        approvedAt: serverTimestamp(),
        transactionId: transactionId,
        updatedAt: serverTimestamp()
      });
      
      // Update user's withdrawal record (if exists in user document)
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      // Create transaction record
      const txnId = 'TXN' + Date.now().toString().slice(-10);
      const transactionRef = doc(db, "transactions", txnId);
      
      const fee = (withdrawalData.amount * withdrawalData.fee) / 100;
      const netAmount = withdrawalData.amount - fee;
      
      batch.set(transactionRef, {
        transactionId: txnId,
        userId: withdrawalData.userId,
        userUid: withdrawalData.userUid,
        userName: withdrawalData.userName,
        type: 'Withdrawal',
        amount: withdrawalData.amount,
        fee: fee,
        netAmount: netAmount,
        status: 'Success',
        date: serverTimestamp(),
        description: `Withdrawal via ${withdrawalData.method}`,
        withdrawalId: withdrawalId,
        method: withdrawalData.method,
        accountDetails: withdrawalData.accountDetails
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      throw error;
    }
  }

  // Package Activation
  async activatePackage(userId, packageData) {
    try {
      const activationId = 'ACT' + Date.now().toString().slice(-10);
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userDoc.data();
      
      if (userData.balance < packageData.amount) {
        throw new Error("Insufficient balance");
      }
      
      const batch = writeBatch(db);
      
      // Update user balance and package
      const newBalance = userData.balance - packageData.amount;
      const newFund = userData.fund + packageData.amount;
      
      batch.update(userRef, {
        balance: newBalance,
        fund: newFund,
        package: packageData.name,
        updatedAt: serverTimestamp()
      });
      
      // Create activation record
      const activationRef = doc(db, "activations", activationId);
      const validityDate = new Date();
      validityDate.setDate(validityDate.getDate() + packageData.validity);
      
      batch.set(activationRef, {
        activationId: activationId,
        userId: userData.userId,
        userUid: userId,
        userName: userData.name,
        package: packageData.name,
        amount: packageData.amount,
        status: 'Active',
        createdAt: serverTimestamp(),
        validityTill: Timestamp.fromDate(validityDate),
        dailyIncome: packageData.dailyIncome
      });
      
      // Create transaction record
      const transactionId = 'TXN' + Date.now().toString().slice(-10);
      const transactionRef = doc(db, "transactions", transactionId);
      
      batch.set(transactionRef, {
        transactionId: transactionId,
        userId: userData.userId,
        userUid: userId,
        userName: userData.name,
        type: 'Package Activation',
        amount: packageData.amount,
        status: 'Success',
        date: serverTimestamp(),
        description: `${packageData.name} package activation`,
        balanceAfter: newBalance,
        package: packageData.name
      });
      
      await batch.commit();
      return activationId;
    } catch (error) {
      console.error("Error activating package:", error);
      throw error;
    }
  }

  // Task Management
  async completeTask(userId, taskData) {
    try {
      const taskId = 'TASK' + Date.now().toString().slice(-10);
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userDoc.data();
      
      // Check if user has active package
      const activationsRef = collection(db, "activations");
      const activeQ = query(
        activationsRef, 
        where("userUid", "==", userId),
        where("status", "==", "Active")
      );
      const activationsSnapshot = await getDocs(activeQ);
      
      if (activationsSnapshot.empty) {
        throw new Error("No active package found");
      }
      
      const batch = writeBatch(db);
      
      // Update user balance and task stats
      const newBalance = userData.balance + taskData.reward;
      const newTotalIncome = userData.totalIncome + taskData.reward;
      const newTodayIncome = userData.todayIncome + taskData.reward;
      const newTotalTasks = userData.totalTasks + 1;
      
      batch.update(userRef, {
        balance: newBalance,
        totalIncome: newTotalIncome,
        todayIncome: newTodayIncome,
        totalTasks: newTotalTasks,
        updatedAt: serverTimestamp()
      });
      
      // Create task record
      const taskRef = doc(db, "tasks", taskId);
      batch.set(taskRef, {
        taskId: taskId,
        userId: userData.userId,
        userUid: userId,
        userName: userData.name,
        type: 'Daily Click',
        reward: taskData.reward,
        clicks: taskData.clicks,
        totalClicks: taskData.totalClicks,
        package: userData.package,
        fund: userData.fund,
        completedAt: serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });
      
      // Create transaction record
      const transactionId = 'TXN' + Date.now().toString().slice(-10);
      const transactionRef = doc(db, "transactions", transactionId);
      
      batch.set(transactionRef, {
        transactionId: transactionId,
        userId: userData.userId,
        userUid: userId,
        userName: userData.name,
        type: 'Task Income',
        amount: taskData.reward,
        status: 'Success',
        date: serverTimestamp(),
        description: `Daily task reward for ${taskData.clicks} clicks`,
        balanceAfter: newBalance
      });
      
      await batch.commit();
      return taskId;
    } catch (error) {
      console.error("Error completing task:", error);
      throw error;
    }
  }

  // KYC Management
  async submitKYC(userId, kycData) {
    try {
      const kycId = 'KYC' + Date.now().toString().slice(-10);
      const kycRef = doc(db, "kycApplications", kycId);
      
      await setDoc(kycRef, {
        kycId: kycId,
        userId: userId,
        ...kycData,
        status: 'Pending',
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update user KYC status
      await updateDoc(doc(db, "users", userId), {
        kyc: 'Under Review',
        updatedAt: serverTimestamp()
      });
      
      return kycId;
    } catch (error) {
      console.error("Error submitting KYC:", error);
      throw error;
    }
  }

  // Get user transactions
  async getUserTransactions(userId) {
    try {
      const transactionsRef = collection(db, "transactions");
      const q = query(
        transactionsRef, 
        where("userUid", "==", userId),
        orderBy("date", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error getting user transactions:", error);
      throw error;
    }
  }

  // Get platform statistics
  async getPlatformStats() {
    try {
      // Get all users
      const users = await this.getAllUsers();
      
      // Get pending requests
      const pendingDeposits = await this.getDepositRequests('Pending');
      const pendingWithdrawals = await this.getWithdrawalRequests('Pending');
      
      // Calculate totals
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        totalDeposits: users.reduce((sum, user) => sum + (user.totalDeposits || 0), 0),
        totalWithdrawals: users.reduce((sum, user) => sum + (user.totalWithdrawals || 0), 0),
        totalInvestments: users.reduce((sum, user) => sum + (user.fund || 0), 0),
        pendingDeposits: pendingDeposits.length,
        pendingWithdrawals: pendingWithdrawals.length,
        totalCommission: users.reduce((sum, user) => sum + (user.referralIncome || 0), 0),
        platformBalance: 10000 // This would need a separate calculation
      };
      
      return stats;
    } catch (error) {
      console.error("Error getting platform stats:", error);
      throw error;
    }
  }

  // Get user's daily task status
  async getUserDailyTaskStatus(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tasksRef = collection(db, "tasks");
      const q = query(
        tasksRef,
        where("userUid", "==", userId),
        where("date", "==", today)
      );
      
      const querySnapshot = await getDocs(q);
      const todayTasks = querySnapshot.docs.map(doc => doc.data());
      
      let totalClicks = 0;
      let totalReward = 0;
      
      todayTasks.forEach(task => {
        totalClicks += task.clicks || 0;
        totalReward += task.reward || 0;
      });
      
      return {
        tasksCompleted: todayTasks.length,
        clicksCompleted: totalClicks,
        totalReward: totalReward,
        todayTasks: todayTasks
      };
    } catch (error) {
      console.error("Error getting daily task status:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataManager = new DataManager();