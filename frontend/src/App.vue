<template>
  <div class="main-layout">
    <div class="animated-bg">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
        <div class="shape shape-5"></div>
      </div>
    </div>

    <div v-if="isLoadingAuth" class="loading-overlay">
      <div class="modern-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">Synchronizing your universe...</p>
    </div>

    <template v-else>
      <router-view v-if="isAuthenticated"></router-view>
      <router-view v-else name="auth"></router-view>
    </template>


    <template v-if="isAuthenticated">
      <header class="app-header">
        <div class="header-content">
          <div class="logo-section">
            <div class="logo-icon">
              <i class="fas fa-seedling"></i>
            </div>
            <h1 class="header-title">Daily Flow</h1>
          </div>
          <p class="header-tagline">
            Transform your daily routine into a masterpiece
          </p>
          <button @click="handleLogout" class="logout-button">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </header>

      <div class="content-area">
        <div class="add-task-section glassmorphism-card">
          <input
            type="text"
            v-model="newTask"
            @keyup.enter="addTask"
            placeholder="Tambahkan tugas baru..."
            class="task-input"
          />
          <input
            type="date"
            v-model="newDeadline"
            class="deadline-input"
          />
          <button @click="addTask" class="add-button">
            <i class="fas fa-plus"></i> Tambah
          </button>
        </div>

        <div class="task-list-container glassmorphism-card">
          <ul v-if="tasks.length" class="task-list">
            <li v-for="task in sortedTasks" :key="task.id" class="task-item">
              <div v-if="editingTaskId === task.id" class="edit-mode">
                <input
                  type="text"
                  v-model="editedTaskTitle"
                  class="edit-input"
                />
                <input
                  type="date"
                  v-model="editedTaskDeadline"
                  class="edit-input"
                />
                <div class="edit-actions">
                  <button @click="updateTask(task.id)" class="btn-save">
                    <i class="fas fa-save"></i> Simpan
                  </button>
                  <button @click="cancelEdit" class="btn-cancel">
                    <i class="fas fa-times"></i> Batal
                  </button>
                </div>
              </div>
              <div v-else class="view-mode">
                <input
                  type="checkbox"
                  :checked="task.is_done"
                  @change="toggleDone(task.id, task.is_done)"
                  class="task-checkbox"
                />
                <span :class="{ 'task-done': task.is_done }" class="task-title">
                  {{ task.title }}
                </span>
                <span class="task-deadline">
                  Tenggat: {{ formatDate(task.deadline) }}
                </span>
                <div class="task-actions">
                  <button @click="startEdit(task)" class="icon-button edit-button">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button @click="deleteTask(task.id)" class="icon-button delete-button">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            </li>
          </ul>
          <div v-else class="empty-state">
            <i class="fas fa-clipboard-list empty-icon"></i>
            <p class="empty-text">Belum ada tugas.</p>
            <p class="empty-subtext">Tambahkan tugas baru untuk memulai!</p>
          </div>
        </div>
      </div>
       <div class="stripe-section glassmorphism-card">
        <h3>Dukung Daily Flow</h3>
        <p>Bantu kami terus mengembangkan aplikasi ini!</p>
        <button @click="processPayment" class="donate-button">
          <i class="fas fa-heart"></i> Dukung dengan Stripe
        </button>
      </div>

      <div class="map-section glassmorphism-card">
        <h3>Lokasi Favorit Anda</h3>
        <MapComponent />
      </div>

    </template>
  </div>
</template>

<script>
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { loadStripe } from '@stripe/stripe-js';
import { logEvent } from 'firebase/analytics';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Import signOut
import MapComponent from './MapComponent.vue';
import AuthForm from './components/AuthForm.vue'; // Import AuthForm

export default {
  components: {
    MapComponent,
    AuthForm, // Daftarkan AuthForm
  },
  data() {
    return {
      tasks: [],
      newTask: "",
      newDeadline: "",
      editingTaskId: null,
      editedTaskTitle: "",
      editedTaskDeadline: "",
      isLoading: true, // Mengelola loading state untuk task fetching
      isLoadingAuth: true, // New: Mengelola loading state untuk autentikasi
      isAuthenticated: false, // New: Status autentikasi
    };
  },
  computed: {
    sortedTasks() {
      return [...this.tasks].sort((a, b) => {
        if (a.is_done !== b.is_done) {
          return a.is_done ? 1 : -1; // Tugas selesai di bagian bawah
        }
        return new Date(a.deadline) - new Date(b.deadline); // Urutkan berdasarkan tenggat waktu
      });
    },
  },
  watch: {
    // Memantau perubahan userId untuk memicu fetchTasksRealtime
    "$userId": {
      immediate: true, // Panggil handler segera saat komponen dibuat
      handler(newUserId) {
        if (newUserId) {
          this.isAuthenticated = true; // Set isAuthenticated ke true jika ada userId
          console.log("User authenticated, fetching tasks.");
          this.fetchTasksRealtime();
          this.isLoadingAuth = false; // Auth selesai, sembunyikan loading
        } else {
          this.isAuthenticated = false; // Set isAuthenticated ke false
          this.tasks = []; // Kosongkan task jika tidak ada user
          this.isLoadingAuth = false; // Auth selesai, sembunyikan loading
          // Redirect ke login jika belum di-redirect oleh router guard
          if (this.$router.currentRoute.value.name !== 'Login') {
              this.$router.push({ name: 'Login' });
          }
        }
      },
    },
  },
  async created() {
    // Pindahkan inisialisasi onAuthStateChanged ke main.js.
    // Di sini, kita hanya menunggu status auth yang sudah diatur di global properties.
    // isLoadingAuth akan dikelola oleh main.js dan watch userId
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
  methods: {
    async fetchTasksRealtime() {
      if (!this.$userId) {
        console.warn("User ID tidak tersedia untuk mengambil tugas.");
        this.tasks = [];
        this.isLoading = false;
        return;
      }
      this.isLoading = true;
      const q = query(
        collection(
          this.$db,
          `artifacts/${this.$appId}/users/${this.$userId}/tasks`
        )
      );
      this.unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          this.tasks = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          this.isLoading = false;
          console.log("Tugas berhasil diambil secara real-time.");
        },
        (error) => {
          console.error("Error mengambil tugas:", error);
          this.isLoading = false;
          // if (Sentry) Sentry.captureException(error);
        }
      );
    },
    async addTask() {
      if (!this.newTask.trim() || !this.newDeadline) return;

      try {
        await addDoc(
          collection(
            this.$db,
            `artifacts/${this.$appId}/users/${this.$userId}/tasks`
          ),
          {
            title: this.newTask,
            deadline: this.newDeadline,
            is_done: false,
            created_at: new Date(),
          }
        );
        console.log("Tugas ditambahkan ke Firestore.");

        if (this.$analytics) {
          logEvent(this.$analytics, 'task_added', {
            task_title: this.newTask,
            deadline: this.newDeadline,
          });
        }

        // --- Memicu email setelah tugas ditambahkan ---
        const currentUserEmail = this.$auth.currentUser?.email;
        if (currentUserEmail) {
          const emailSubject = `Daily Flow: Task Added!`;
          const emailText = `Hello,\n\nYou have successfully added a new task:\n\nTitle: "${this.newTask}"\nDeadline: ${this.formatDate(this.newDeadline)}\n\nKeep up the great work!`;
          const emailHtml = `
            <p>Hello,</p>
            <p>You have successfully added a new task to Daily Flow:</p>
            <p><strong>Title:</strong> ${this.newTask}</p>
            <p><strong>Deadline:</strong> ${this.formatDate(this.newDeadline)}</p>
            <p>Keep up the great work!</p>
          `;
          this.sendEmailNotification(currentUserEmail, emailSubject, emailText, emailHtml);
        } else {
            console.warn("User email not available to send task added notification.");
        }

        // --- Memicu notifikasi push setelah tugas ditambahkan ---
        this.sendPushNotificationToUser(
            this.$userId,
            'Daily Flow: New Task Added!',
            `"${this.newTask}" has been added to your list. Deadline: ${this.formatDate(this.newDeadline)}.`
        );

        this.newTask = "";
        this.newDeadline = "";

      } catch (err) {
        console.error("Gagal menambahkan tugas:", err);
        // if (Sentry) Sentry.captureException(err);
      }
    },
    async deleteTask(id) {
      try {
        await deleteDoc(
          doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, id)
        );
        console.log("Tugas dihapus dari Firestore.");
        if (this.$analytics) {
          logEvent(this.$analytics, 'task_deleted');
        }
      } catch (err) {
        console.error("Gagal menghapus tugas:", err);
        // if (Sentry) Sentry.captureException(err);
      }
    },
    async toggleDone(id, currentStatus) {
      try {
        await updateDoc(
          doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, id),
          {
            is_done: !currentStatus,
          }
        );
        console.log("Status tugas diperbarui di Firestore.");
        if (this.$analytics) {
          logEvent(this.$analytics, 'task_toggled', { status: !currentStatus });
        }
      } catch (err) {
        console.error("Gagal memperbarui status tugas:", err);
        // if (Sentry) Sentry.captureException(err);
      }
    },
    startEdit(task) {
      this.editingTaskId = task.id;
      this.editedTaskTitle = task.title;
      this.editedTaskDeadline = task.deadline;
    },
    cancelEdit() {
      this.editingTaskId = null;
      this.editedTaskTitle = "";
      this.editedTaskDeadline = "";
    },
    async updateTask(id) {
      try {
        await updateDoc(
          doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, id),
          {
            title: this.editedTaskTitle,
            deadline: this.editedTaskDeadline,
          }
        );
        console.log("Tugas diperbarui di Firestore.");
        if (this.$analytics) {
          logEvent(this.$analytics, 'task_updated');
        }
        this.cancelEdit(); // Keluar dari mode edit
      } catch (err) {
        console.error("Gagal memperbarui tugas:", err);
        // if (Sentry) Sentry.captureException(err);
      }
    },
    formatDate(dateString) {
      if (!dateString) return "No Deadline";
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    async processPayment() {
      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        alert("Kunci publik Stripe tidak diatur. Tidak dapat memproses pembayaran.");
        return;
      }
      try {
        const stripe = await loadStripe(publishableKey);
        // Implementasi sebenarnya akan memanggil Firebase Function untuk membuat PaymentIntent
        // Untuk demo, ini adalah placeholder.
        alert("Simulasi pembayaran berhasil! Terima kasih atas dukungan Anda.");
        if (this.$analytics) {
          logEvent(this.$analytics, 'payment_processed');
        }
      } catch (error) {
        console.error("Kesalahan pembayaran:", error);
        alert("Terjadi kesalahan saat memproses pembayaran.");
        // if (Sentry) Sentry.captureException(error);
      }
    },
    async sendEmailNotification(toEmail, subject, textContent, htmlContent) {
      if (!toEmail || !subject || !textContent) {
        console.warn("Missing email parameters for notification.");
        return;
      }
      try {
        const functions = getFunctions();
        const sendEmail = httpsCallable(functions, 'sendEmail');

        const result = await sendEmail({
          to: toEmail,
          subject: subject,
          text: textContent,
          html: htmlContent,
        });

        console.log('Email notification sent:', result.data.message);
        if (this.$analytics) {
          logEvent(this.$analytics, 'email_sent', {
            email_type: subject.includes("New Task") ? 'new_task' : 'general_notification',
            to_email: toEmail,
          });
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
        // if (Sentry) Sentry.captureException(error);
        alert(`Failed to send email: ${error.message}`);
      }
    },
    async sendPushNotificationToUser(targetUserId, title, body, customData = {}) {
      if (!targetUserId || !title || !body) {
        console.warn("Missing parameters for push notification.");
        return;
      }

      try {
        const functions = getFunctions();
        const sendPushNotification = httpsCallable(functions, 'sendPushNotification');

        const result = await sendPushNotification({
          userId: targetUserId,
          title: title,
          body: body,
          customData: customData,
        });

        console.log('Push notification result:', result.data);
        if (this.$analytics) {
          logEvent(this.$analytics, 'push_notification_sent', {
            target_user_id: targetUserId,
            notification_type: title,
          });
        }
      } catch (error) {
        console.error("Error sending push notification:", error);
        // if (Sentry) Sentry.captureException(error);
        alert(`Failed to send push notification: ${error.message}`);
      }
    },
    async handleLogout() {
      try {
        await signOut(this.$auth);
        console.log('User logged out.');
        if (this.$analytics) {
          logEvent(this.$analytics, 'logout');
        }
        // $userId akan berubah menjadi null, memicu watcher untuk mengosongkan task dan redirect
      } catch (error) {
        console.error('Error logging out:', error);
        alert(`Failed to logout: ${error.message}`);
        // if (Sentry) Sentry.captureException(error);
      }
    },
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

/* Root variables for soft blue theme */
:root {
  --primary-gradient: #5582ff;
  --secondary-gradient: #0331b1;
  --success-gradient: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
  --danger-gradient: linear-gradient(135deg, #f48fb1 0%, #ec407a 100%);
  --glass-bg: rgba(255, 255, 255, 0.719);
  --glass-border: rgba(124, 155, 240, 0.2);
  --text-primary: #000000;
  --text-secondary: #696969;
  --shadow-soft: 0 8px 24px rgba(124, 155, 240, 0.12);
  --shadow-hover: 0 12px 32px rgba(124, 155, 240, 0.18);
  --border-radius: 14px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Main layout with soft animated background */
.main-layout {
  min-height: 100vh;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  background: #e3f2fd;
  position: relative;
  overflow-x: hidden;
}
/* Refined glassmorphism header */
.app-header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(227, 242, 253, 0.5);
  /* Modified styles */
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  margin: 0; /* Full width */
  padding: 1rem; /* Smaller height */
  position: relative;
  z-index: 10;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.header-content {
  text-align: center;
  color: var(--text-primary);
  position: relative;
  z-index: 2;
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  margin-bottom: 0.4rem;
}

.header-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.header-tagline {
  font-size: 0.9rem;
  opacity: 0.75;
  margin: 0;
  font-weight: 400;
  color: #666;
}

.header-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(173, 216, 230, 0.5);
  animation: softPulse 6s ease-in-out infinite;
}

.deco-1 {
  width: 80px;
  height: 80px;
  top: -40px;
  right: -25px;
  animation-delay: 0s;
}

.deco-2 {
  width: 50px;
  height: 50px;
  bottom: -15px;
  left: -15px;
  animation-delay: 2s;
}

.deco-3 {
  width: 65px;
  height: 65px;
  top: 50%;
  left: -32px;
  animation-delay: 4s;
}

@keyframes softPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.2;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.4;
  }
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(173, 216, 230, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modern-spinner {
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 1.5rem;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: gentleSpin 1.8s linear infinite;
}

.spinner-ring:nth-child(2) {
  width: 75%;
  height: 75%;
  top: 12.5%;
  left: 12.5%;
  animation-delay: -0.6s;
}

.spinner-ring:nth-child(3) {
  width: 50%;
  height: 50%;
  top: 25%;
  left: 25%;
  animation-delay: -1.2s;
}

@keyframes gentleSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: white;
  font-size: 1rem;
  font-weight: 400;
  opacity: 0.9;
}

/* Content wrapper */
.content-wrapper {
  max-width: 780px;
  margin: 3rem auto 0; /* Increased margin-top to create space */
  padding: 0 16px 2.5rem;
  position: relative;
  z-index: 10;
}

/* Refined card styling */
.card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(227, 242, 253, 0.5);
  border-radius: var(--border-radius);
  padding: 1.8rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
  position: relative;
}

.card-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex-grow: 1;
}

.task-counter {
  background: linear-gradient(135deg, #81c784 0%, #66bb6a 100%); /* Greenish */
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  box-shadow: 0 3px 12px rgba(102, 187, 106, 0.25);
}

/* Form styling */
.form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.input-group {
  display: grid;
  gap: 0.8rem;
}

@media (min-width: 768px) {
  .input-group {
    grid-template-columns: 2fr 1fr;
  }
}

/* Floating input design */
.floating-input {
  position: relative;
}

.input-field {
  width: 100%;
  padding: 1rem 0.9rem 0.7rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid rgba(173, 216, 230, 0.5);
  border-radius: 10px;
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  transition: all 0.3s ease;
}

.input-field::placeholder {
  color: transparent;
}

.floating-label {
  position: absolute;
  left: 0.9rem;
  top: 0.9rem; /* Initial position when input is empty and not focused */
  font-size: 0.85rem;
  color: #666;
  transition: all 0.3s ease;
  pointer-events: none;
  font-weight: 500;
}

.input-field:focus + .floating-label,
.input-field:not(:placeholder-shown) + .floating-label {
  top: 0.25rem; /* Position when input is focused or has content */
  font-size: 0.7rem;
  color: #666;
}

.input-highlight {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1.5px;
  background: #64b5f6; /* Blue highlight */
  transition: width 0.3s ease;
}

.input-field:focus ~ .input-highlight {
  width: 100%;
}

/* Refined button */
.btn-primary {
  width: 100%;
  padding: 1rem;
  background: #64b5f6; /* Blue button */
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  box-shadow: 0 6px 16px rgba(100, 181, 246, 0.25);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(100, 181, 246, 0.35);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.15),
    transparent
  );
  transition: left 0.6s ease;
}

.btn-primary:hover .btn-shimmer {
  left: 100%;
}

.btn-text {
  position: relative;
  z-index: 2;
}

.btn-icon {
  position: relative;
  z-index: 2;
  font-size: 1rem;
}

/* Task grid layout */
.task-container {
  margin-top: 0.8rem;
}

.task-grid {
  display: grid;
  gap: 0.8rem;
}

.task-item {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(227, 242, 253, 0.5);
  border-radius: 10px;
  padding: 1.2rem;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.task-item:hover {
  transform: translateX(3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.task-completed {
  opacity: 0.65;
  transform: scale(0.98);
}

.task-priority-indicator {
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  height: 100%;
  background: #64b5f6; /* Blue indicator */
  border-radius: 0 1px 1px 0;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.custom-checkbox {
  position: relative;
}

.checkbox-input {
  display: none;
}

.checkbox-label {
  display: block;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(173, 216, 230, 0.7);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.checkbox-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  color: white;
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}

.checkbox-input:checked + .checkbox-label {
  background: #81c784; /* Greenish when checked */
  border-color: transparent;
  box-shadow: 0 3px 12px rgba(102, 187, 106, 0.932);
}

.checkbox-input:checked + .checkbox-label .checkbox-icon {
  transform: translate(-50%, -50%) scale(1);
}

.task-actions {
  display: flex;
  gap: 0.4rem;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  background: rgba(173, 216, 230, 0.3); /* Light blue, transparent */
  color: #64b5f6; /* Blue icon */
  position: relative;
}

.action-btn:hover {
  background: rgba(173, 216, 230, 0.5);
  transform: scale(1.05);
}

/* Custom edit and delete icons using CSS */
.edit-btn:before {
  content: "";
  width: 12px;
  height: 12px;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'%3E%3C/path%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'%3E%3C/path%3E%3C/svg%3E")
    no-repeat center;
  mask-size: contain;
}

.delete-btn {
  background: rgba(255, 128, 171, 0.3); /* Light pink, transparent */
  color: #ef5350; /* Red icon */
}

.delete-btn:hover {
  background: rgba(255, 128, 171, 0.5);
}

.delete-btn:before {
  content: "";
  width: 12px;
  height: 12px;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3,6 5,6 21,6'%3E%3C/polyline%3E%3Cpath d='M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6'%3E%3C/path%3E%3C/svg%3E")
    no-repeat center;
  mask-size: contain;
}

.task-body {
  color: #333;
}

.task-title {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  transition: all 0.3s ease;
}

.task-title.completed {
  text-decoration: line-through;
  opacity: 0.6;
  color: #666;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.deadline-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(173, 216, 230, 0.3); /* Light blue, transparent */
  padding: 0.25rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  color: #666;
}

/* Edit mode styling */
.edit-mode {
  margin-top: 0.8rem;
}

.edit-input {
  margin-bottom: 0.8rem;
}

.edit-actions {
  display: flex;
  gap: 0.4rem;
}

.btn-save,
.btn-cancel {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-save {
  background: linear-gradient(135deg, #81c784 0%, #66bb6a 100%); /* Greenish */
  color: white;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(102, 187, 106, 0.904);
}

.btn-cancel {
  background: rgba(173, 216, 230, 0.3); /* Light blue, transparent */
  color: #666;
}

.btn-cancel:hover {
  background: rgba(173, 216, 230, 0.5);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #666;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.8rem;
  opacity: 0.5;
  color: #90caf9; /* Lighter blue */
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: #333;
}

.empty-subtitle {
  opacity: 0.75;
  font-size: 0.9rem;
}

.logout-button {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); /* Reddish */
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem; /* Sesuaikan posisi jika perlu */
}

.logout-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(192, 57, 43, 0.4);
}

/* Update loading overlay style to cover whole screen */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.85); /* Slightly opaque white */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* Ensure it's on top */
  transition: opacity 0.3s ease-in-out;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-header {
    margin: 8px auto 0; /* Centered horizontally for smaller screens */
    padding: 1.2rem;
  }

  .header-title {
    font-size: 1.7rem;
  }

  .header-tagline {
    font-size: 0.8rem;
  }

  .content-wrapper {
    padding: 0 8px 2rem;
  }

  .card {
    padding: 1.2rem;
  }

  .input-group {
    grid-template-columns: 1fr;
  }
}
</style>
