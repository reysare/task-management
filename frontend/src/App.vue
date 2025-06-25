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

/* Root variables for soft blue theme */
/* Root variables untuk tema biru yang nyaman di mata */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #60a5fa;
  --accent-color: #1e40af;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --glass-bg: rgba(255, 255, 255, 0.15);
  --glass-border: rgba(255, 255, 255, 0.2);
  --text-primary: #ffffff;
  --text-secondary: #e2e8f0;
  --text-muted: #cbd5e1;
  --shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.12);
  --shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.18);
  --border-radius: 14px;
}

/* Background utama dengan warna biru tua yang nyaman */
.main-layout {
  min-height: 100vh;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  background: #1e3a8a; /* Biru tua solid yang nyaman di mata */
  position: relative;
  overflow-x: hidden;
}

/* Floating shapes dengan opacity rendah */
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.shape {
  position: absolute;
  background: rgba(255, 255, 255, 0.03); /* Sangat transparan */
  border-radius: 50%;
  animation: gentleFloat 25s infinite linear;
  filter: blur(2px);
}

/* Header dengan glassmorphism */
.app-header {
  background: var(--glass-bg);
  backdrop-filter: blur(25px);
  border: 1px solid var(--glass-border);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  margin: 16px 16px 0 16px;
  padding: 1.8rem;
  position: relative;
  z-index: 10;
  box-shadow: var(--shadow-soft);
}

.header-content {
  text-align: center;
  color: var(--text-primary);
  position: relative;
  z-index: 2;
}

.header-title {
  font-size: 2rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.header-tagline {
  font-size: 0.9rem;
  opacity: 0.8;
  margin: 0;
  font-weight: 400;
  color: var(--text-secondary);
}

/* Card styling dengan background transparan */
.card {
  background: var(--glass-bg);
  backdrop-filter: blur(25px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 1.8rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-soft);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}

.card-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex-grow: 1;
}

/* Input fields */
.input-field {
  width: 100%;
  padding: 1rem 0.9rem 0.7rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  transition: all 0.3s ease;
}

.input-field:focus {
  border-color: var(--secondary-color);
  background: rgba(255, 255, 255, 0.15);
}

.floating-label {
  position: absolute;
  left: 0.9rem;
  top: 0.9rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  transition: all 0.3s ease;
  pointer-events: none;
  font-weight: 500;
}

.input-field:focus + .floating-label,
.input-field:not(:placeholder-shown) + .floating-label {
  top: 0.25rem;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* Button styling */
.btn-primary {
  width: 100%;
  padding: 1rem;
  background: var(--primary-color);
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
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  background: var(--secondary-color);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

/* Task items */
.task-item {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  padding: 1.2rem;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.task-item:hover {
  transform: translateX(3px);
  box-shadow: var(--shadow-soft);
  background: rgba(255, 255, 255, 0.12);
}

.task-title {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  transition: all 0.3s ease;
  color: var(--text-primary);
}

.task-title.completed {
  text-decoration: line-through;
  opacity: 0.6;
  color: var(--text-muted);
}

/* Task counter */
.task-counter {
  background: var(--success-color);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  box-shadow: 0 3px 12px rgba(16, 185, 129, 0.3);
}

/* Checkbox styling */
.checkbox-label {
  display: block;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.checkbox-input:checked + .checkbox-label {
  background: var(--success-color);
  border-color: var(--success-color);
  box-shadow: 0 3px 12px rgba(16, 185, 129, 0.3);
}

/* Action buttons */
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
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  position: relative;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: scale(1.05);
}

.delete-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* Deadline badge */
.deadline-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.8rem;
  opacity: 0.5;
  color: var(--text-secondary);
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: var(--text-primary);
}

.empty-subtitle {
  opacity: 0.75;
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(30, 58, 138, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-text {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 400;
  opacity: 0.9;
}
</style>
