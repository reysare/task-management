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
:root {
  --primary-gradient:  #5582ff;
  --secondary-gradient: #0331b1;
  --success-gradient: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
  --danger-gradient: linear-gradient(135deg, #f48fb1 0%, #ec407a 100%);
  --glass-bg: rgba(255, 255, 255, 0.12);
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
  background: #698be7; 
  position: relative;
  overflow-x: hidden;
}

/* Refined floating shapes */
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.floating-shapes {
  position: relative;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  background: rgba(124, 155, 240, 0.08);
  border-radius: 50%;
  animation: gentleFloat 25s infinite linear;
  filter: blur(1px);
}

.shape-1 {
  width: 120px;
  height: 120px;
  top: 15%;
  left: 8%;
  animation-delay: 0s;
}

.shape-2 {
  width: 80px;
  height: 80px;
  top: 65%;
  left: 75%;
  animation-delay: -8s;
}

.shape-3 {
  width: 140px;
  height: 140px;
  top: 75%;
  left: 15%;
  animation-delay: -12s;
}

.shape-4 {
  width: 60px;
  height: 60px;
  top: 35%;
  left: 68%;
  animation-delay: -18s;
}

.shape-5 {
  width: 160px;
  height: 160px;
  top: 5%;
  left: 55%;
  animation-delay: -6s;
}

@keyframes gentleFloat {
  0% {
    transform: translateY(0px) rotate(0deg);
    opacity: 0.4;
  }
  25% {
    transform: translateY(-15px) rotate(90deg);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-30px) rotate(180deg);
    opacity: 0.3;
  }
  75% {
    transform: translateY(-15px) rotate(270deg);
    opacity: 0.5;
  }
  100% {
    transform: translateY(0px) rotate(360deg);
    opacity: 0.4;
  }
}

/* Refined glassmorphism header */
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
  color: var(--text-primary);
}

.header-tagline {
  font-size: 0.9rem;
  opacity: 0.75;
  margin: 0;
  font-weight: 400;
  color: var(--text-secondary);
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
  background: rgba(124, 155, 240, 0.08);
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
  background: rgba(124, 155, 240, 0.85);
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
  margin: -16px auto 0;
  padding: 0 16px 2.5rem;
  position: relative;
  z-index: 10;
}

/* Refined card styling */
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
  color: var(--text-primary);
  margin: 0;
  flex-grow: 1;
}

.task-counter {
  background: var(--success-gradient);
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  box-shadow: 0 3px 12px rgba(100, 181, 246, 0.25);
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
  border: 1.5px solid rgba(124, 155, 240, 0.25);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 500;
  outline: none;
  transition: all 0.3s ease;
}

.input-field::placeholder {
  color: transparent;
}

.input-field:focus {
  border-color: rgba(124, 155, 240, 0.5);
  background: rgba(255, 255, 255, 0.8);
}

.floating-label {
  position: absolute;
  left: 0.9rem;
  top: 0.9rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
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

.input-highlight {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 1.5px;
  background: var(--primary-gradient);
  transition: width 0.3s ease;
}

.input-field:focus ~ .input-highlight {
  width: 100%;
}

/* Refined button */
.btn-primary {
  width: 100%;
  padding: 1rem;
  background: var(--primary-gradient);
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
  box-shadow: 0 6px 16px rgba(124, 155, 240, 0.25);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(124, 155, 240, 0.35);
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
  border: 1px solid rgba(124, 155, 240, 0.15);
  border-radius: 10px;
  padding: 1.2rem;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.task-item:hover {
  transform: translateX(3px);
  box-shadow: var(--shadow-soft);
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
  background: var(--primary-gradient);
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
  border: 1.5px solid rgba(124, 155, 240, 0.35);
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
  background: var(--success-gradient);
  border-color: transparent;
  box-shadow: 0 3px 12px rgba(100, 181, 246, 0.25);
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
  background: rgba(124, 155, 240, 0.08);
  color: #5b85f7;
  position: relative;
}

.action-btn:hover {
  background: rgba(124, 155, 240, 0.15);
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
  background: rgba(244, 143, 177, 0.08);
  color: #ec407a;
}

.delete-btn:hover {
  background: rgba(244, 143, 177, 0.15);
}

.delete-btn:before {
  content: "";
  width: 12px;
  height: 12px;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3,6 5,6 21,6'%3E%3C/polyline%3E%3Cpath d='M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6'%3E%3C/path%3E%3Cline x1='10' y1='11' x2='10' y2='17'%3E%3C/line%3E%3Cline x1='14' y1='11' x2='14' y2='17'%3E%3C/line%3E%3C/svg%3E")
    no-repeat center;
  mask-size: contain;
}

.task-body {
  color: var(--text-primary);
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
  color: var(--text-secondary);
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
  background: rgba(124, 155, 240, 0.08);
  padding: 0.25rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--text-secondary);
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
  background: var(--success-gradient);
  color: white;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 12px rgba(100, 181, 246, 0.25);
}

.btn-cancel {
  background: rgba(124, 155, 240, 0.08);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: rgba(124, 155, 240, 0.15);
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.8rem;
  opacity: 0.5;
  color: #7c9bf0;
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
}

/* Responsive design */
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
