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
  padding-bottom: 3rem;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  width: 100%;
  overflow-x: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
}

.main-layout::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: 
    radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
  z-index: 1;
}

/* Header styling */
.app-header {
  background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
  background-size: 300% 300%;
  animation: gradientShift 8s ease infinite;
  width: 100%;
  padding: 3rem 2rem 4rem 2rem;
  color: white;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border-bottom-left-radius: 3rem;
  border-bottom-right-radius: 3rem;
  position: relative;
  overflow: hidden;
  z-index: 2;
}

.app-header::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
  animation: shimmer 3s ease-in-out infinite;
  z-index: 1;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes shimmer {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}

.header-title {
  font-size: 3.2rem;
  font-weight: 900;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.05em;
  position: relative;
  z-index: 2;
  background: linear-gradient(45deg, #fff, #f8f9fa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-tagline {
  font-size: 1.1rem;
  margin-top: 0.8rem;
  opacity: 0.95;
  position: relative;
  z-index: 2;
  font-weight: 500;
}

/* Content wrapper for cards */
.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  width: 100%;
  max-width: 750px;
  margin: -40px auto 0 auto;
  padding: 0 1.5rem;
  position: relative;
  z-index: 10;
}

/* Common card styling */
.card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2.8rem;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 1px 0px rgba(255, 255, 255, 0.2) inset;
  border: 1px solid rgba(255, 255, 255, 0.18);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transition: left 0.5s ease;
}

.card:hover::before {
  left: 100%;
}

.card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.15),
    0 1px 0px rgba(255, 255, 255, 0.3) inset;
}

.card-title {
  font-size: 1.8rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 2rem;
  text-align: center;
  position: relative;
}

.card-title::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 2px;
}

/* Form styling */
.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.input-label {
  font-size: 0.95rem;
  color: #6c757d;
  margin-bottom: 0.3rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-field {
  padding: 1.2rem 1.5rem;
  font-size: 1.1rem;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 16px;
  outline: none;
  transition: all 0.3s ease;
  width: 100%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
}

.input-field:focus {
  border-color: #667eea;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-2px);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 1.3rem 0;
  font-size: 1.2rem;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 700;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
}

.btn-primary::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s ease;
}

.btn-primary:hover::before {
  left: 100%;
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(-1px);
}

/* Task list styling */
.task-list {
  list-style: none;
  margin-top: 1.5rem;
  padding: 0;
}

.task-item {
  background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 20px;
  padding: 1.5rem 2rem;
  margin-bottom: 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.task-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.task-item:hover::before {
  width: 8px;
}

.task-item:hover {
  transform: translateY(-5px) translateX(8px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
}

.task-details {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  flex-grow: 1;
}

.task-checkbox {
  width: 28px;
  height: 28px;
  cursor: pointer;
  accent-color: #667eea;
  border: 3px solid #dee2e6;
  border-radius: 8px;
  transition: all 0.3s ease;
  min-width: 28px;
  min-height: 28px;
  position: relative;
}

.task-checkbox:checked {
  border-color: #667eea;
  background-color: #667eea;
  transform: scale(1.1);
}

.task-checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  font-size: 16px;
}

.task-content-display {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-title-main {
  font-weight: 700;
  font-size: 1.2rem;
  color: #2d3748;
  line-height: 1.4;
  transition: all 0.3s ease;
}

.task-title-done {
  text-decoration: line-through;
  color: #a0aec0;
  opacity: 0.7;
  transform: scale(0.98);
}

.task-deadline-info {
  font-size: 0.9rem;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 500;
}

.task-deadline-info .task-icon {
  font-size: 1em;
  color: #667eea;
}

.task-actions-group {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  margin-left: 1rem;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(102, 126, 234, 0.2);
  cursor: pointer;
  font-size: 1rem;
  color: #667eea;
  padding: 0.8rem;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
}

.btn-icon::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  transition: all 0.3s ease;
  z-index: -1;
}

.btn-icon:hover {
  transform: translateY(-3px) scale(1.1);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border-color: transparent;
}

.btn-edit::before {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
}

.btn-edit:hover {
  color: white;
}

.btn-edit:hover::before {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border-radius: 12px;
}

.btn-delete::before {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
}

.btn-delete:hover {
  color: white;
}

.btn-delete:hover::before {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  border-radius: 12px;
}

/* Edit mode specific styles */
.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-grow: 1;
  width: 100%;
}

.input-edit-task {
  padding: 1rem 1.3rem;
  font-size: 1.05rem;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-radius: 12px;
  outline: none;
  transition: all 0.3s ease;
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.input-edit-task:focus {
  border-color: #667eea;
  box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
  transform: translateY(-2px);
}

.edit-actions {
  display: flex;
  gap: 0.8rem;
  width: 100%;
}

.btn-save, .btn-cancel {
  flex-grow: 1;
  padding: 0.9rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn-save {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  color: white;
  box-shadow: 0 4px 15px rgba(78, 205, 196, 0.3);
}

.btn-save:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(78, 205, 196, 0.4);
}

.btn-cancel {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
}

.btn-cancel:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
}

/* Message for no tasks */
.no-task-message {
  text-align: center;
  color: #a0aec0;
  font-style: italic;
  margin-top: 2.5rem;
  font-size: 1.1rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
  border-radius: 16px;
  border: 1px dashed rgba(160, 174, 192, 0.3);
}

/* Loading overlay and spinner styling */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.spinner {
  border: 4px solid rgba(102, 126, 234, 0.2);
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.loading-text {
  color: #667eea;
  font-size: 1.2rem;
  font-weight: 600;
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
  opacity: 0.5;
  filter: grayscale(70%);
  transform: none;
  box-shadow: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-header {
    padding: 2.5rem 1.5rem 3.5rem 1.5rem;
    border-bottom-left-radius: 2.5rem;
    border-bottom-right-radius: 2.5rem;
  }
  .header-title {
    font-size: 2.5rem;
  }
  .header-tagline {
    font-size: 1rem;
  }
  .content-wrapper {
    margin-top: -35px;
    padding: 0 1rem;
    gap: 2.5rem;
  }
  .card {
    padding: 2rem;
    border-radius: 20px;
  }
  .card-title {
    font-size: 1.5rem;
    margin-bottom: 1.8rem;
  }
  .input-field, .btn-primary {
    padding: 1rem 1.2rem;
    font-size: 1.05rem;
  }
  .task-item {
    padding: 1.2rem 1.5rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.2rem;
  }
  .task-details {
    width: 100%;
  }
  .task-actions-group {
    width: 100%;
    justify-content: flex-end;
    margin-left: 0;
  }
  .task-checkbox {
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
  }
  .task-title-main {
    font-size: 1.1rem;
  }
  .task-deadline-info {
    font-size: 0.85rem;
  }
  .btn-icon {
    font-size: 0.95rem;
    padding: 0.7rem;
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 2rem 1rem 3rem 1rem;
    border-bottom-left-radius: 2rem;
    border-bottom-right-radius: 2rem;
  }
  .header-title {
    font-size: 2rem;
  }
  .header-tagline {
    font-size: 0.95rem;
  }
  .content-wrapper {
    margin-top: -25px;
    padding: 0 0.8rem;
    gap: 2rem;
  }
  .card {
    padding: 1.8rem;
    border-radius: 18px;
  }
  .card-title {
    font-size: 1.3rem;
    margin-bottom: 1.5rem;
  }
  .input-field {
    padding: 0.9rem 1.1rem;
    font-size: 1rem;
  }
  .btn-primary {
    padding: 1rem 0;
    font-size: 1.05rem;
  }
  .task-item {
    padding: 1rem 1.2rem;
    gap: 1rem;
  }
  .task-details {
    gap: 1rem;
  }
  .task-title-main {
    font-size: 1.05rem;
  }
  .task-deadline-info {
    font-size: 0.8rem;
  }
  .btn-icon {
    font-size: 0.9rem;
    padding: 0.6rem;
    width: 32px;
    height: 32px;
  }
}
</style>
