<template>
  <div class="main-layout">
    <!-- Header with subtle branding and full width -->
    <header class="app-header">
      <h1 class="header-title">Daily Flow</h1>
      <p class="header-tagline">Kelola tugas harianmu dengan mudah.</p>
    </header>

    <!-- Loading overlay with spinner -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p class="loading-text">Memuat tugas...</p>
    </div>

    <!-- Main content area, centered and responsive -->
    <div class="content-wrapper">
      <!-- Card for adding a new task -->
      <div class="card add-task-card">
        <h2 class="card-title">Tambah Aktivitas Baru</h2>
        <form @submit.prevent="addTask" class="form">
          <div class="input-group">
            <input
              v-model="newTask"
              type="text"
              placeholder="Apa yang perlu kamu lakukan?"
              class="input-field"
              :disabled="isLoading"
            />
            <label for="newDeadline" class="input-label">Tenggat Waktu</label>
            <input
              v-model="newDeadline"
              type="date"
              id="newDeadline"
              class="input-field date-input"
              :disabled="isLoading"
            />
          </div>
          <button type="submit" class="btn-primary" :disabled="isLoading">
            Tambah Tugas <i class="fas fa-plus-circle"></i>
          </button>
        </form>
      </div>

      <!-- Card for displaying the list of tasks -->
      <div class="card task-list-card">
        <h2 class="card-title">Daftar Aktivitasmu</h2>
        <ul v-if="tasks.length" class="task-list">
          <li v-for="task in tasks" :key="task.id" class="task-item">
            <div class="task-details">
              <input
                type="checkbox"
                :checked="task.is_done"
                @change="toggleDone(task)"
                class="task-checkbox"
                :disabled="isLoading"
              />
              <div class="task-content-display">
                <div v-if="editingTaskId === task.id" class="edit-mode">
                  <input
                    v-model="editedTaskTitle"
                    type="text"
                    class="input-edit-task"
                    :disabled="isLoading"
                  />
                  <div class="edit-actions">
                    <button @click="updateTask(task)" class="btn-save" :disabled="isLoading">
                      Simpan
                    </button>
                    <button @click="cancelEdit" class="btn-cancel" :disabled="isLoading">
                      Batal
                    </button>
                  </div>
                </div>
                <div v-else class="display-mode">
                  <span :class="{ 'task-title-done': task.is_done }" class="task-title-main">
                    {{ task.title }}
                  </span>
                  <span class="task-deadline-info">
                    <i class="far fa-calendar-alt task-icon"></i>
                    {{ task.deadline }}
                  </span>
                </div>
              </div>
            </div>
            <div class="task-actions-group">
              <button
                v-if="editingTaskId !== task.id"
                @click="startEdit(task)"
                class="btn-icon btn-edit"
                title="Edit tugas"
                :disabled="isLoading"
              >
                <i class="fas fa-pen"></i>
              </button>
              <button
                @click="deleteTask(task.id)"
                class="btn-icon btn-delete"
                title="Hapus tugas"
                :disabled="isLoading"
              >
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </li>
        </ul>
        <p v-else class="no-task-message">Belum ada tugas. Yuk, tambahkan yang baru! 🎉</p>
      </div>
    </div>
  </div>
</template>

<script>
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

export default {
  data() {
    return {
      tasks: [],
      newTask: "",
      newDeadline: "",
      editingTaskId: null,
      editedTaskTitle: "",
      isLoading: true, // Set to true initially as data fetch is asynchronous
      unsubscribe: null, // To store the onSnapshot unsubscribe function
    };
  },
  watch: {
    // Watch for changes in $userId (which becomes available after authentication)
    '$userId': {
      handler(newUserId) {
        if (newUserId) {
          this.fetchTasksRealtime();
        } else {
          if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
          }
          this.tasks = [];
        }
      },
      immediate: true
    }
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
  methods: {
    fetchTasksRealtime() {
      if (!this.$db || !this.$appId || !this.$userId) {
        console.warn("Firebase atau ID pengguna belum tersedia.");
        return;
      }

      this.isLoading = true;

      const tasksCollectionRef = collection(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`);
      const q = query(tasksCollectionRef);

      this.unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTasks = [];
        snapshot.forEach((doc) => {
          fetchedTasks.push({ id: doc.id, ...doc.data() });
        });
        this.tasks = fetchedTasks.sort((a, b) => {
          // Sort by is_done (false first), then by deadline (ascending), then by created_at (descending)
          if (a.is_done !== b.is_done) {
            return a.is_done ? 1 : -1; // Done tasks last
          }
          if (a.deadline && b.deadline) {
            return new Date(a.deadline) - new Date(b.deadline);
          }
          if (a.created_at && b.created_at) {
              // Assuming created_at is a Firebase Timestamp
              const dateA = a.created_at.toDate ? a.created_at.toDate() : new Date(a.created_at);
              const dateB = b.created_at.toDate ? b.created_at.toDate() : new Date(b.created_at);
              return dateB - dateA; // Newest first
          }
          return 0;
        });
        this.isLoading = false;
        console.log("Tugas diambil secara real-time:", this.tasks);
      }, (error) => {
        console.error("Error saat mengambil tugas real-time:", error);
        this.isLoading = false;
      });
    },

    async addTask() {
      if (!this.newTask.trim() || !this.newDeadline) return;

      try {
        await addDoc(collection(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`), {
          title: this.newTask,
          deadline: this.newDeadline,
          is_done: false,
          created_at: new Date(), // Add a timestamp for potential ordering/sorting
        });
        this.newTask = "";
        this.newDeadline = "";
        console.log("Tugas ditambahkan ke Firestore.");
      } catch (err) {
        console.error("Gagal menambahkan tugas:", err);
      }
    },

    async deleteTask(id) {
      if (!id) return; // Ensure ID exists

      try {
        await deleteDoc(doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, id));
        console.log(`Tugas dengan ID ${id} dihapus.`);
      } catch (err) {
        console.error("Gagal menghapus tugas:", err);
      }
    },

    async toggleDone(task) {
      if (!task || !task.id) return;

      try {
        await updateDoc(doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, task.id), {
          is_done: !task.is_done, // Toggle the 'is_done' status
        });
        console.log(`Status selesai tugas dengan ID ${task.id} diperbarui.`);
      } catch (err) {
        console.error("Gagal memperbarui status tugas:", err);
      }
    },

    startEdit(task) {
      this.editingTaskId = task.id;
      this.editedTaskTitle = task.title;
    },

    cancelEdit() {
      this.editingTaskId = null;
      this.editedTaskTitle = "";
    },

    async updateTask(task) {
      if (!this.editedTaskTitle.trim() || !task || !task.id) return;

      try {
        await updateDoc(doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, task.id), {
          title: this.editedTaskTitle, // Update only the title
        });
        this.editingTaskId = null;
        this.editedTaskTitle = "";
        console.log(`Tugas dengan ID ${task.id} diperbarui.`);
      } catch (err) {
        console.error("Gagal memperbarui tugas:", err);
      }
    },
  },
};
</script>

<style scoped>
/* Global styles for the main layout */
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-bottom: 3rem; /* Increased padding at the bottom */
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif; /* Modern font stack */
  width: 100%;
  overflow-x: hidden; /* Prevent horizontal scroll on small screens */
}

/* Header styling */
.app-header {
  background: linear-gradient(to right top, #6DD5ED, #2193B0); /* Fresh blue-teal gradient */
  width: 100%;
  padding: 2.5rem 2rem 3rem 2rem; /* Increased padding-bottom to prevent overlap */
  color: white;
  text-align: center; /* Center align header text */
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); /* Softer, wider shadow */
  border-bottom-left-radius: 2px; /* More pronounced curves */
  border-bottom-right-radius: 2px;
  position: relative;
  overflow: hidden; /* Hide overflow for decorative elements */
}

.header-title {
  font-size: 2.8rem; /* Larger, bolder title */
  font-weight: 800; /* Extra bold */
  margin: 0;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.05em; /* Slightly spaced out letters */
  position: relative;
  z-index: 2; /* Ensure text is above any decorative elements */
}

.header-tagline {
  font-size: 1rem;
  margin-top: 0.5rem;
  opacity: 0.9;
  position: relative;
  z-index: 2;
}

/* Decorative background elements for header */
.app-header::before,
.app-header::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.1); /* Subtle white overlay for texture */
  border-radius: 50%;
  opacity: 0.6;
  filter: blur(10px);
  z-index: 1;
}

.app-header::before {
  width: 150px;
  height: 150px;
  top: -50px;
  left: -50px;
}

.app-header::after {
  width: 200px;
  height: 200px;
  bottom: -80px;
  right: -80px;
}

/* Content wrapper for cards */
.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2.5rem; /* More space between cards */
  width: 100%;
  max-width: 720px; /* Increased max-width for content */
  margin: -30px auto 0 auto; /* Adjusted negative margin to prevent overlap */
  padding: 0 1.5rem;
  position: relative;
  z-index: 10; /* Ensure content is above background */
}

/* Common card styling */
.card {
  background-color: white;
  border-radius: 18px; /* More rounded cards */
  padding: 2.5rem; /* More generous padding */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); /* Deeper, softer shadow */
  border: none; /* Remove subtle border */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-5px); /* Slight lift on hover */
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15); /* Enhanced shadow on hover */
}

.card-title {
  font-size: 1.6rem; /* Larger card titles */
  font-weight: 700;
  color: #2C3E50;
  margin-bottom: 1.8rem; /* More space below title */
  text-align: center; /* Center card titles */
}

/* Form styling */
.form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem; /* More space between form elements */
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.input-label {
  font-size: 0.9rem;
  color: #7F8C8D;
  margin-bottom: 0.2rem;
  font-weight: 500;
}

.input-field {
  padding: 1rem 1.2rem; /* Larger padding for inputs */
  font-size: 1.05rem;
  border: 2px solid #E0E0E0; /* Softer border */
  border-radius: 10px; /* More rounded */
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  width: 100%;
}

.input-field:focus {
  border-color: #3498DB;
  box-shadow: 0 0 12px rgba(52, 152, 219, 0.2); /* Enhanced shadow on focus */
}

.date-input {
  /* Specific styles for date input if needed */
}

.btn-primary {
  background: linear-gradient(to right, #3498DB, #2980B9); /* Gradient for primary button */
  color: white;
  border: none;
  padding: 1.1rem 0; /* More padding */
  font-size: 1.15rem;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
  font-weight: 600;
  letter-spacing: 0.03em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem; /* Space between text and icon */
}

.btn-primary i {
  font-size: 1.2em;
}

.btn-primary:hover {
  background: linear-gradient(to right, #2980B9, #3498DB); /* Reverse gradient on hover */
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}
.btn-primary:active {
  transform: translateY(0);
  box-shadow: none;
}

/* Task list styling */
.task-list {
  list-style: none;
  margin-top: 1rem;
  padding: 0;
}

.task-item {
  background-color: #FDFDFD; /* Very subtle background for task items */
  border: 1px solid #EAEAEA; /* Very light border */
  border-radius: 12px; /* Consistent rounded corners */
  padding: 1.2rem 1.8rem; /* Generous padding */
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06); /* Softer shadow for items */
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.task-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  background-color: #F8FCFE; /* Slightly lighter on hover */
}

.task-details {
  display: flex;
  align-items: flex-start; /* Align content to the top of task item */
  gap: 1.2rem;
  flex-grow: 1;
}

.task-checkbox {
  width: 24px; /* Larger checkbox */
  height: 24px;
  cursor: pointer;
  accent-color: #3498DB;
  border: 2px solid #BDC3C7;
  border-radius: 6px; /* Slightly more square/modern checkbox */
  transition: border-color 0.2s ease, background-color 0.2s ease;
  min-width: 24px; /* Prevent shrinking */
  min-height: 24px;
}

.task-checkbox:checked {
  border-color: #3498DB;
  background-color: #3498DB; /* Solid background when checked */
}

.task-content-display {
  flex-grow: 1;
  display: flex;
  flex-direction: column; /* Stack title and deadline vertically */
  gap: 0.3rem; /* Small gap between title and deadline */
}

.task-title-main {
  font-weight: 600; /* Bolder title */
  font-size: 1.15rem; /* Larger font */
  color: #333333;
  line-height: 1.4; /* Better readability */
}

.task-title-done {
  text-decoration: line-through;
  color: #95A5A6;
  font-style: normal; /* No italic for done tasks */
  opacity: 0.8;
}

.task-deadline-info {
  font-size: 0.88rem;
  color: #7F8C8D;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.task-deadline-info .task-icon {
  font-size: 0.9em;
  color: #7F8C8D;
}

.task-actions-group {
  display: flex;
  flex-direction: row;
  gap: 0.8rem; /* More space between action buttons */
  margin-left: 1rem; /* Push actions slightly from content */
}

.btn-icon {
  background: #F0F0F0; /* Light gray background for icons */
  border: none;
  cursor: pointer;
  font-size: 1rem; /* Consistent icon size */
  color: #7F8C8D;
  padding: 0.8rem; /* Larger touch/click area */
  border-radius: 8px; /* Rounded icon buttons */
  transition: background-color 0.3s ease, color 0.3s ease, transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background-color: #E5E5E5;
  color: #3498DB; /* Blue on hover */
  transform: translateY(-2px);
}
.btn-icon:active {
  transform: translateY(0);
}

.btn-edit:hover {
  background-color: #d1ecf1; /* Light teal for edit hover */
  color: #1a718f;
}

.btn-delete:hover {
  background-color: #f8d7da; /* Light red for delete hover */
  color: #721c24;
}

/* Edit mode specific styles */
.edit-mode {
  display: flex;
  flex-direction: column; /* Stack input and buttons vertically for better flow */
  gap: 0.8rem;
  flex-grow: 1;
  width: 100%; /* Ensure edit mode takes full width */
}

.input-edit-task {
  padding: 0.8rem 1rem;
  font-size: 1rem;
  border: 2px solid #BDC3C7;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  width: 100%;
}

.input-edit-task:focus {
  border-color: #3498DB;
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.2);
}

.edit-actions {
  display: flex;
  gap: 0.6rem;
  width: 100%;
}

.btn-save, .btn-cancel {
  flex-grow: 1; /* Make buttons expand to fill space */
  padding: 0.8rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.btn-save {
  background-color: #2ECC71; /* Green */
  color: white;
}
.btn-save:hover {
  background-color: #27AE60;
  transform: translateY(-2px);
}

.btn-cancel {
  background-color: #E74C3C; /* Red */
  color: white;
}
.btn-cancel:hover {
  background-color: #C0392B;
  transform: translateY(-2px);
}

/* Message for no tasks */
.no-task-message {
  text-align: center;
  color: #95A5A6;
  font-style: italic;
  margin-top: 2rem;
  font-size: 1rem;
  padding: 0 1rem;
}

/* Loading overlay and spinner styling */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9); /* More opaque overlay */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(5px); /* Subtle blur effect */
}

.spinner {
  border: 6px solid #f3f3f3;
  border-top: 6px solid #3498db;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

.loading-text {
  color: #333;
  font-size: 1.1rem;
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Styles for disabled elements when loading */
.input-field:disabled,
.btn-primary:disabled,
.task-checkbox:disabled,
.btn-icon:disabled,
.input-edit-task:disabled,
.btn-save:disabled,
.btn-cancel:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  filter: grayscale(50%); /* Subtle grayscale effect */
  background-color: #F0F0F0;
  box-shadow: none;
  transform: none; /* Remove hover transform */
}


/* Responsive adjustments */
@media (max-width: 768px) {
  .app-header {
    padding: 2rem 1.5rem;
    border-bottom-left-radius: 30px;
    border-bottom-right-radius: 30px;
  }
  .header-title {
    font-size: 2.2rem;
  }
  .header-tagline {
    font-size: 1rem;
  }
  .content-wrapper {
    margin-top: -30px;
    padding: 0 1rem;
    gap: 2rem;
  }
  .card {
    padding: 1.8rem;
    border-radius: 15px;
  }
  .card-title {
    font-size: 1.4rem;
    margin-bottom: 1.5rem;
  }
  .input-field, .btn-primary {
    padding: 0.9rem 1rem;
    font-size: 1rem;
  }
  .task-item {
    padding: 1rem 1.2rem;
    flex-direction: column; /* Stack content and actions vertically */
    align-items: flex-start;
    gap: 1rem;
  }
  .task-details {
    width: 100%;
  }
  .task-actions-group {
    width: 100%;
    justify-content: flex-end; /* Align actions to the right */
    margin-left: 0;
  }
  .task-checkbox {
    width: 20px;
    height: 20px;
    min-width: 20px;
    min-height: 20px;
  }
  .task-title-main {
    font-size: 1.05rem;
  }
  .task-deadline-info {
    font-size: 0.8rem;
  }
  .btn-icon {
    font-size: 0.95rem;
    padding: 0.6rem;
  }
  .edit-mode {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .input-edit-task, .edit-actions {
    width: 100%;
  }
  .btn-save, .btn-cancel {
    font-size: 0.85rem;
    padding: 0.7rem 1rem;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 1.5rem 1rem;
    border-bottom-left-radius: 25px;
    border-bottom-right-radius: 25px;
  }
  .header-title {
    font-size: 1.8rem;
  }
  .header-tagline {
    font-size: 0.9rem;
  }
  .content-wrapper {
    margin-top: -20px;
    padding: 0 0.8rem;
    gap: 1.8rem;
  }
  .card {
    padding: 1.5rem;
    border-radius: 12px;
  }
  .card-title {
    font-size: 1.2rem;
    margin-bottom: 1.2rem;
  }
  .input-field {
    padding: 0.8rem 1rem;
    font-size: 0.95rem;
  }
  .btn-primary {
    padding: 0.9rem 0;
    font-size: 1rem;
  }
  .task-item {
    padding: 0.8rem 1rem;
    gap: 0.8rem;
  }
  .task-details {
    gap: 0.8rem;
  }
  .task-title-main {
    font-size: 1rem;
  }
  .task-deadline-info {
    font-size: 0.75rem;
  }
  .btn-icon {
    font-size: 0.9rem;
    padding: 0.5rem;
  }
}
</style>
