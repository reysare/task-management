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

/* Root variables for a refined, darker soft blue theme */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

/* Root variables for clean, consistent theme */
:root {
  --primary-color: #4f46e5;
  --primary-light: #6366f1;
  --primary-dark: #3730a3;
  --secondary-color: #e0e7ff;
  --success-color: #10b981;
  --success-light: #34d399;
  --danger-color: #ef4444;
  --danger-light: #f87171;
  
  /* Background colors */
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-accent: #f1f5f9;
  
  /* Text colors */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-light: #94a3b8;
  
  /* Border and shadow */
  --border-color: #e2e8f0;
  --border-light: #f1f5f9;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.1);
  
  --border-radius: 12px;
  --border-radius-sm: 8px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Clean main layout */
.main-layout {
  min-height: 100vh;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-primary);
  position: relative;
}

/* Subtle animated background */
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
  opacity: 0.6;
}

.floating-shapes {
  position: relative;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  border-radius: 50%;
  animation: gentleFloat 20s infinite linear;
  opacity: 0.05;
}

.shape-1 {
  width: 100px;
  height: 100px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 60px;
  height: 60px;
  top: 60%;
  left: 80%;
  animation-delay: -5s;
}

.shape-3 {
  width: 120px;
  height: 120px;
  top: 80%;
  left: 20%;
  animation-delay: -10s;
}

.shape-4 {
  width: 40px;
  height: 40px;
  top: 30%;
  left: 70%;
  animation-delay: -15s;
}

.shape-5 {
  width: 140px;
  height: 140px;
  top: 10%;
  left: 60%;
  animation-delay: -3s;
}

@keyframes gentleFloat {
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-10px) rotate(90deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
  75% {
    transform: translateY(-10px) rotate(270deg);
  }
  100% {
    transform: translateY(0px) rotate(360deg);
  }
}

/* Clean header design */
.app-header {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  margin: 16px;
  padding: 2rem;
  position: relative;
  z-index: 10;
  box-shadow: var(--shadow-sm);
}

.header-content {
  text-align: center;
  color: var(--text-primary);
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  color: var(--primary-color);
  font-size: 1.8rem;
}

.header-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.header-tagline {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 400;
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modern-spinner {
  position: relative;
  width: 50px;
  height: 50px;
  margin-bottom: 1.5rem;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid var(--border-light);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-ring:nth-child(2) {
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
  animation-delay: -0.33s;
}

.spinner-ring:nth-child(3) {
  width: 40%;
  height: 40%;
  top: 30%;
  left: 30%;
  animation-delay: -0.66s;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
}

/* Content wrapper */
.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px 3rem;
  position: relative;
  z-index: 10;
}

/* Clean card styling */
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  padding: 2rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 1.5rem;
}

.card-icon {
  color: var(--primary-color);
  font-size: 1.2rem;
}

.card-title {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex-grow: 1;
}

.task-counter {
  background: var(--success-color);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: var(--shadow-sm);
}

/* Form styling */
.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: grid;
  gap: 1rem;
}

@media (min-width: 768px) {
  .input-group {
    grid-template-columns: 2fr 1fr;
  }
}

/* Clean input design */
.floating-input {
  position: relative;
}

.input-field {
  width: 100%;
  padding: 1rem;
  background: var(--bg-accent);
  border: 2px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 500;
  outline: none;
  transition: all 0.3s ease;
}

.input-field::placeholder {
  color: transparent;
}

.input-field:focus {
  border-color: var(--primary-color);
  background: var(--bg-secondary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.floating-label {
  position: absolute;
  left: 1rem;
  top: 1rem;
  font-size: 0.95rem;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  pointer-events: none;
  font-weight: 500;
}

.input-field:focus + .floating-label,
.input-field:not(:placeholder-shown) + .floating-label {
  top: -0.5rem;
  left: 0.75rem;
  font-size: 0.75rem;
  color: var(--primary-color);
  background: var(--bg-secondary);
  padding: 0 0.25rem;
}

.input-highlight {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary-color);
  transition: width 0.3s ease;
  border-radius: 1px;
}

.input-field:focus ~ .input-highlight {
  width: 100%;
}

/* Clean button design */
.btn-primary {
  width: 100%;
  padding: 1rem 1.5rem;
  background: var(--primary-color);
  border: none;
  border-radius: var(--border-radius-sm);
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  box-shadow: var(--shadow-sm);
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
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
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
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

/* Task container */
.task-container {
  margin-top: 1rem;
}

.task-grid {
  display: grid;
  gap: 1rem;
}

.task-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  padding: 1.5rem;
  position: relative;
  transition: all 0.3s ease;
  border-left: 4px solid var(--primary-color);
}

.task-item:hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-sm);
  border-left-color: var(--primary-light);
}

.task-completed {
  opacity: 0.6;
  border-left-color: var(--success-color);
}

.task-completed:hover {
  border-left-color: var(--success-light);
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

/* Clean checkbox design */
.custom-checkbox {
  position: relative;
}

.checkbox-input {
  display: none;
}

.checkbox-label {
  display: block;
  width: 22px;
  height: 22px;
  background: var(--bg-accent);
  border: 2px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.checkbox-label:hover {
  border-color: var(--primary-color);
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
  background: var(--success-color);
  border-color: var(--success-color);
}

.checkbox-input:checked + .checkbox-label .checkbox-icon {
  transform: translate(-50%, -50%) scale(1);
}

.task-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  background: var(--bg-accent);
  color: var(--text-secondary);
}

.action-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
  transform: scale(1.05);
}

.edit-btn:hover {
  background: var(--secondary-color);
  color: var(--primary-color);
}

.delete-btn:hover {
  background: #fee2e2;
  color: var(--danger-color);
}

/* Task content */
.task-body {
  color: var(--text-primary);
}

.task-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
  color: var(--text-primary);
}

.task-title.completed {
  text-decoration: line-through;
  color: var(--text-light);
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
  background: var(--bg-accent);
  padding: 0.3rem 0.6rem;
  border-radius: 16px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

/* Edit mode */
.edit-mode {
  margin-top: 1rem;
}

.edit-input {
  margin-bottom: 1rem;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-save,
.btn-cancel {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-save {
  background: var(--success-color);
  color: white;
}

.btn-save:hover {
  background: var(--success-light);
  transform: translateY(-1px);
}

.btn-cancel {
  background: var(--bg-accent);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--primary-color);
  opacity: 0.5;
}

.empty-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.empty-subtitle {
  font-size: 1rem;
  color: var(--text-light);
}

/* Responsive design */
@media (max-width: 768px) {
  .app-header {
    margin: 8px;
    padding: 1.5rem;
  }

  .header-title {
    font-size: 1.8rem;
  }

  .header-tagline {
    font-size: 0.9rem;
  }

  .content-wrapper {
    padding: 0 8px 2rem;
  }

  .card {
    padding: 1.5rem;
  }

  .input-group {
    grid-template-columns: 1fr;
  }

  .task-item {
    padding: 1.2rem;
  }
}
</style>