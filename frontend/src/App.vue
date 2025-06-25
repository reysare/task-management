<template>
  <div class="main-layout">
    <!-- Animated background -->
    <div class="animated-bg">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
        <div class="shape shape-5"></div>
      </div>
    </div>

    <!-- Glassmorphism Header -->
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
      </div>
      <!-- <div class="header-decoration">
        <div class="deco-circle deco-1"></div>
        <div class="deco-circle deco-2"></div>
        <div class="deco-circle deco-3"></div>
      </div> -->
    </header>

    <!-- Loading overlay with modern spinner -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="modern-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">Synchronizing your universe...</p>
    </div>

    <!-- Main content area -->
    <div class="content-wrapper">
      <!-- Futuristic Add Task Card -->
      <div class="card add-task-card">
        <div class="card-header">
          <div class="card-icon">
            <i class="fas fa-magic"></i>
          </div>
          <h2 class="card-title">Create New Mission</h2>
        </div>
        <form @submit.prevent="addTask" class="form">
          <div class="input-group">
            <div class="floating-input">
              <input
                v-model="newTask"
                type="text"
                placeholder=" "
                class="input-field"
                :disabled="isLoading"
                id="taskInput"
              />
              <label for="taskInput" class="floating-label"
                >What needs to be accomplished?</label
              >
              <div class="input-highlight"></div>
            </div>
            <div class="floating-input">
              <input
                v-model="newDeadline"
                type="date"
                class="input-field date-input"
                :disabled="isLoading"
                id="deadlineInput"
              />
              <label for="deadlineInput" class="floating-label"
                >Target completion</label
              >
              <div class="input-highlight"></div>
            </div>
          </div>
          <button type="submit" class="btn-primary" :disabled="isLoading">
            <span class="btn-text">Launch Mission</span>
            <div class="btn-icon">
              <i class="fas fa-rocket"></i>
            </div>
            <div class="btn-shimmer"></div>
          </button>
        </form>
      </div>

      <!-- Sleek Task List Card -->
      <div class="card task-list-card">
        <div class="card-header">
          <div class="card-icon">
            <i class="fas fa-list-ul"></i>
          </div>
          <h2 class="card-title">Mission Control</h2>
          <div class="task-counter" v-if="tasks.length">
            {{ tasks.filter((t) => !t.is_done).length }} active
          </div>
        </div>

        <div class="task-container">
          <div v-if="tasks.length" class="task-grid">
            <div
              v-for="task in tasks"
              :key="task.id"
              class="task-item"
              :class="{ 'task-completed': task.is_done }"
            >
              <div class="task-priority-indicator"></div>

              <div class="task-content">
                <div class="task-header">
                  <div class="custom-checkbox">
                    <input
                      type="checkbox"
                      :checked="task.is_done"
                      @change="toggleDone(task)"
                      class="checkbox-input"
                      :disabled="isLoading"
                      :id="`task-${task.id}`"
                    />
                    <label :for="`task-${task.id}`" class="checkbox-label">
                      <div class="checkbox-icon">
                        <i class="fas fa-check"></i>
                      </div>
                    </label>
                  </div>

                  <div class="task-actions">
                    <button
                      v-if="editingTaskId !== task.id"
                      @click="startEdit(task)"
                      class="action-btn edit-btn"
                      title="Edit mission"
                      :disabled="isLoading"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button
                      @click="deleteTask(task.id)"
                      class="action-btn delete-btn"
                      title="Abort mission"
                      :disabled="isLoading"
                    >
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                <div class="task-body">
                  <div v-if="editingTaskId === task.id" class="edit-mode">
                    <div class="floating-input">
                      <input
                        v-model="editedTaskTitle"
                        type="text"
                        class="input-field edit-input"
                        :disabled="isLoading"
                        placeholder=" "
                        id="editInput"
                      />
                      <label for="editInput" class="floating-label"
                        >Mission name</label
                      >
                      <div class="input-highlight"></div>
                    </div>
                    <div class="edit-actions">
                      <button
                        @click="updateTask(task)"
                        class="btn-save"
                        :disabled="isLoading"
                      >
                        <i class="fas fa-save"></i>
                        <span>Save</span>
                      </button>
                      <button
                        @click="cancelEdit"
                        class="btn-cancel"
                        :disabled="isLoading"
                      >
                        <i class="fas fa-times"></i>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>

                  <div v-else class="display-mode">
                    <h3 class="task-title" :class="{ completed: task.is_done }">
                      {{ task.title }}
                    </h3>
                    <div class="task-meta">
                      <div class="deadline-badge">
                        <i class="far fa-calendar-alt"></i>
                        <span>{{ formatDate(task.deadline) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="task-glow"></div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">
              <i class="fas fa-seedling"></i>
            </div>
            <h3 class="empty-title">Ready for your first mission?</h3>
            <p class="empty-subtitle">
              Your journey to productivity starts here ✨
            </p>
          </div>
        </div>
      </div>
    </div>
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

export default {
  data() {
    return {
      tasks: [],
      newTask: "",
      newDeadline: "",
      editingTaskId: null,
      editedTaskTitle: "",
      isLoading: true,
      unsubscribe: null,
    };
  },
  watch: {
    $userId: {
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
      immediate: true,
    },
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

      const tasksCollectionRef = collection(
        this.$db,
        `artifacts/${this.$appId}/users/${this.$userId}/tasks`
      );
      const q = query(tasksCollectionRef);

      this.unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedTasks = [];
          snapshot.forEach((doc) => {
            fetchedTasks.push({ id: doc.id, ...doc.data() });
          });
          this.tasks = fetchedTasks.sort((a, b) => {
            if (a.is_done !== b.is_done) {
              return a.is_done ? 1 : -1;
            }
            if (a.deadline && b.deadline) {
              return new Date(a.deadline) - new Date(b.deadline);
            }
            if (a.created_at && b.created_at) {
              const dateA = a.created_at.toDate
                ? a.created_at.toDate()
                : new Date(a.created_at);
              const dateB = b.created_at.toDate
                ? b.created_at.toDate()
                : new Date(b.created_at);
              return dateB - dateA;
            }
            return 0;
          });
          this.isLoading = false;
          console.log("Tugas diambil secara real-time:", this.tasks);
        },
        (error) => {
          console.error("Error saat mengambil tugas real-time:", error);
          this.isLoading = false;
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
        this.newTask = "";
        this.newDeadline = "";
        console.log("Tugas ditambahkan ke Firestore.");
      } catch (err) {
        console.error("Gagal menambahkan tugas:", err);
      }
    },

    async deleteTask(id) {
      if (!id) return;

      try {
        await deleteDoc(
          doc(
            this.$db,
            `artifacts/${this.$appId}/users/${this.$userId}/tasks`,
            id
          )
        );
        console.log(`Tugas dengan ID ${id} dihapus.`);
      } catch (err) {
        console.error("Gagal menghapus tugas:", err);
      }
    },

    async toggleDone(task) {
      if (!task || !task.id) return;

      try {
        await updateDoc(
          doc(
            this.$db,
            `artifacts/${this.$appId}/users/${this.$userId}/tasks`,
            task.id
          ),
          {
            is_done: !task.is_done,
          }
        );
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
        await updateDoc(
          doc(
            this.$db,
            `artifacts/${this.$appId}/users/${this.$userId}/tasks`,
            task.id
          ),
          {
            title: this.editedTaskTitle,
          }
        );
        this.editingTaskId = null;
        this.editedTaskTitle = "";
        console.log(`Tugas dengan ID ${task.id} diperbarui.`);
      } catch (err) {
        console.error("Gagal memperbarui tugas:", err);
      }
    },

    formatDate(dateString) {
      if (!dateString) return "";
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return "Tomorrow";
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    },
  },
};
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

:root {
  --primary-gradient: #4d6aff;
  --secondary-gradient: #003399;
  --success-gradient: linear-gradient(135deg, #6ec6ff 0%, #2196f3 100%);
  --danger-gradient: linear-gradient(135deg, #ff8a80 0%, #e53935 100%);
  --glass-bg: rgba(255, 255, 255, 0.65);
  --glass-border: rgba(90, 120, 210, 0.25);
  --text-primary: #1a1a1a;
  --text-secondary: #555;
  --shadow-soft: 0 8px 24px rgba(100, 120, 200, 0.12);
  --shadow-hover: 0 12px 32px rgba(100, 120, 200, 0.18);
  --border-radius: 14px;
  --background: linear-gradient(135deg, #e7ecff 0%, #cdd8ff 100%);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body,
html {
  font-family: "Inter", sans-serif;
  background: var(--background);
  color: var(--text-primary);
  min-height: 100vh;
}

/* Layout */
.main-layout {
  background: var(--background);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Header */
.app-header {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  margin: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
}

.header-content {
  text-align: center;
}

.logo-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.5rem;
}

.header-title {
  font-size: 2rem;
  font-weight: 600;
}

.header-tagline {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 400;
}

/* Cards */
.card {
  background: var(--glass-bg);
  backdrop-filter: blur(15px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-soft);
  transition: 0.3s;
}

.card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-3px);
}

.card-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* Form */
.input-field {
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(124, 155, 240, 0.25);
  border-radius: 10px;
  padding: 1rem;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.input-field:focus {
  border-color: var(--primary-gradient);
  background: rgba(255, 255, 255, 0.9);
  outline: none;
}

/* Button */
.btn-primary {
  background: var(--primary-gradient);
  border: none;
  color: #fff;
  padding: 1rem;
  border-radius: 10px;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(124, 155, 240, 0.25);
  transition: 0.3s;
  cursor: pointer;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(124, 155, 240, 0.35);
}

/* Tasks */
.task-item {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(124, 155, 240, 0.15);
  padding: 1.2rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(100, 120, 200, 0.1);
  transition: 0.3s;
}

.task-item:hover {
  transform: translateX(2px);
  box-shadow: var(--shadow-soft);
}

.task-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.task-title.completed {
  text-decoration: line-through;
  color: var(--text-secondary);
  opacity: 0.6;
}

/* Checkbox */
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
  background: rgba(255, 255, 255, 0.9);
  border: 1.5px solid rgba(124, 155, 240, 0.35);
  border-radius: 5px;
  cursor: pointer;
  position: relative;
  transition: 0.3s;
}

.checkbox-input:checked + .checkbox-label {
  background: var(--success-gradient);
  border-color: transparent;
  box-shadow: 0 3px 12px rgba(100, 181, 246, 0.25);
}

.checkbox-label::after {
  content: '';
  position: absolute;
  display: block;
  top: 4px;
  left: 6px;
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.checkbox-input:checked + .checkbox-label::after {
  opacity: 1;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* Spinner */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.spinner-ring {
  width: 40px;
  height: 40px;
  border: 3px solid transparent;
  border-top: 3px solid var(--primary-gradient);
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .app-header {
    margin: 8px;
    padding: 1.2rem;
  }

  .header-title {
    font-size: 1.7rem;
  }

  .header-tagline {
    font-size: 0.8rem;
  }

  .card {
    padding: 1.2rem;
  }
}
</style>

