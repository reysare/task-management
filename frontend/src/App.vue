<template>
  <div class="main-layout">
    <!-- Animated background -->
    <div class="animated-bg">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
    </div>

    <!-- Simplified Header -->
    <header class="app-header">
      <div class="header-content">
        <h1 class="header-title">Daily Flow</h1>
        <p class="header-tagline">Organize your daily tasks</p>
      </div>
    </header>

    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="modern-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">Loading your tasks...</p>
    </div>

    <!-- Main content area -->
    <div class="content-wrapper">
      <!-- Add Task Card -->
      <div class="card add-task-card">
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
              <label for="taskInput" class="floating-label">Task description</label>
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
              <label for="deadlineInput" class="floating-label">Due date</label>
              <div class="input-highlight"></div>
            </div>
          </div>
          <button type="submit" class="btn-primary" :disabled="isLoading">
            <span class="btn-text">Add Task</span>
            <div class="btn-shimmer"></div>
          </button>
        </form>
      </div>

      <!-- Task List Card -->
      <div class="card task-list-card">
        <div class="task-container">
          <div v-if="tasks.length" class="task-grid">
            <div v-for="task in tasks" :key="task.id" class="task-item" :class="{ 'task-completed': task.is_done }">
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
                      title="Edit task"
                      :disabled="isLoading"
                    >
                      <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button
                      @click="deleteTask(task.id)"
                      class="action-btn delete-btn"
                      title="Delete task"
                      :disabled="isLoading"
                    >
                      <i class="fas fa-trash-alt"></i>
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
                      <label for="editInput" class="floating-label">Edit task</label>
                      <div class="input-highlight"></div>
                    </div>
                    <div class="edit-actions">
                      <button @click="updateTask(task)" class="btn-save" :disabled="isLoading">
                        <span>Save</span>
                      </button>
                      <button @click="cancelEdit" class="btn-cancel" :disabled="isLoading">
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                  
                  <div v-else class="display-mode">
                    <h3 class="task-title" :class="{ 'completed': task.is_done }">
                      {{ task.title }}
                    </h3>
                    <div class="task-meta">
                      <div class="deadline-badge">
                        <span>{{ formatDate(task.deadline) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <div class="empty-icon">
              <i class="fas fa-tasks"></i>
            </div>
            <h3 class="empty-title">No tasks yet</h3>
            <p class="empty-subtitle">Add your first task above</p>
          </div>
        </div>
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
      isLoading: true,
      unsubscribe: null,
    };
  },
  watch: {
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
        console.warn("Firebase or user ID not available.");
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
          if (a.is_done !== b.is_done) {
            return a.is_done ? 1 : -1;
          }
          if (a.deadline && b.deadline) {
            return new Date(a.deadline) - new Date(b.deadline);
          }
          if (a.created_at && b.created_at) {
              const dateA = a.created_at.toDate ? a.created_at.toDate() : new Date(a.created_at);
              const dateB = b.created_at.toDate ? b.created_at.toDate() : new Date(b.created_at);
              return dateB - dateA;
          }
          return 0;
        });
        this.isLoading = false;
      }, (error) => {
        console.error("Error fetching tasks:", error);
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
          created_at: new Date(),
        });
        this.newTask = "";
        this.newDeadline = "";
      } catch (err) {
        console.error("Failed to add task:", err);
      }
    },

    async deleteTask(id) {
      if (!id) return;

      try {
        await deleteDoc(doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, id));
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    },

    async toggleDone(task) {
      if (!task || !task.id) return;

      try {
        await updateDoc(doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, task.id), {
          is_done: !task.is_done,
        });
      } catch (err) {
        console.error("Failed to update task status:", err);
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
          title: this.editedTaskTitle,
        });
        this.editingTaskId = null;
        this.editedTaskTitle = "";
      } catch (err) {
        console.error("Failed to update task:", err);
      }
    },

    formatDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css');

:root {
  --primary-blue: #4a6cf7;
  --primary-blue-light: #6a8cff;
  --primary-blue-dark: #2541b2;
  --background-dark: #1a2238;
  --background-light: #f0f4ff;
  --card-bg: #ffffff;
  --text-primary: #2d3748;
  --text-secondary: #4a5568;
  --text-light: #f8fafc;
  --border-radius: 12px;
  --shadow-soft: 0 4px 20px rgba(74, 108, 247, 0.1);
  --shadow-hover: 0 8px 30px rgba(74, 108, 247, 0.2);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.main-layout {
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  background: var(--background-dark);
  color: var(--text-primary);
  position: relative;
  overflow-x: hidden;
}

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
  background: rgba(74, 108, 247, 0.05);
  border-radius: 50%;
  animation: float 15s infinite linear;
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
  width: 80px;
  height: 80px;
  top: 80%;
  left: 20%;
  animation-delay: -10s;
}

@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
  100% { transform: translateY(0px) rotate(360deg); }
}

.app-header {
  background: rgba(26, 34, 56, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(74, 108, 247, 0.2);
  padding: 1.5rem 2rem;
  text-align: center;
  position: relative;
  z-index: 10;
}

.header-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-light);
  margin-bottom: 0.5rem;
}

.header-tagline {
  font-size: 1rem;
  color: rgba(248, 250, 252, 0.7);
  font-weight: 400;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(26, 34, 56, 0.9);
  backdrop-filter: blur(5px);
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
  border: 3px solid transparent;
  border-top: 3px solid var(--primary-blue-light);
  border-radius: 50%;
  animation: modernSpin 1.5s linear infinite;
}

.spinner-ring:nth-child(2) {
  width: 80%;
  height: 80%;
  top: 10%;
  left: 10%;
  animation-delay: -0.5s;
}

.spinner-ring:nth-child(3) {
  width: 60%;
  height: 60%;
  top: 20%;
  left: 20%;
  animation-delay: -1s;
}

@keyframes modernSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: var(--text-light);
  font-size: 1rem;
  font-weight: 400;
  opacity: 0.8;
}

.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  position: relative;
  z-index: 10;
}

.card {
  background: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s ease;
}

.card:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

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

.floating-input {
  position: relative;
}

.input-field {
  width: 100%;
  padding: 1rem;
  background: var(--background-light);
  border: 1px solid rgba(74, 108, 247, 0.2);
  border-radius: var(--border-radius);
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 500;
  outline: none;
  transition: all 0.3s ease;
}

.input-field:focus {
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 2px rgba(74, 108, 247, 0.2);
}

.floating-label {
  position: absolute;
  left: 1rem;
  top: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  pointer-events: none;
  background: var(--card-bg);
  padding: 0 0.3rem;
}

.input-field:focus + .floating-label,
.input-field:not(:placeholder-shown) + .floating-label {
  top: -0.6rem;
  left: 0.8rem;
  font-size: 0.75rem;
  color: var(--primary-blue);
}

.input-highlight {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary-blue);
  transition: width 0.3s ease;
}

.input-field:focus ~ .input-highlight {
  width: 100%;
}

.btn-primary {
  width: 100%;
  padding: 1rem;
  background: var(--primary-blue);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary:hover {
  background: var(--primary-blue-dark);
  transform: translateY(-2px);
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

.task-container {
  margin-top: 1rem;
}

.task-grid {
  display: grid;
  gap: 1rem;
}

.task-item {
  background: var(--card-bg);
  border-radius: var(--border-radius);
  padding: 1.25rem;
  transition: all 0.3s ease;
  border-left: 4px solid var(--primary-blue);
}

.task-item:hover {
  transform: translateX(5px);
  box-shadow: var(--shadow-soft);
}

.task-completed {
  opacity: 0.7;
  border-left-color: #cbd5e0;
}

.task-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  border: 2px solid var(--primary-blue);
  border-radius: 4px;
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
  background: var(--primary-blue);
  border-color: var(--primary-blue);
}

.checkbox-input:checked + .checkbox-label .checkbox-icon {
  transform: translate(-50%, -50%) scale(1);
}

.task-actions {
  display: flex;
  gap: 0.5rem;
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
  background: transparent;
  color: var(--text-secondary);
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn.edit-btn:hover {
  color: var(--primary-blue);
}

.action-btn.delete-btn:hover {
  color: #e53e3e;
}

.task-body {
  color: var(--text-primary);
}

.task-title {
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.task-title.completed {
  text-decoration: line-through;
  color: var(--text-secondary);
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.deadline-badge {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.edit-mode {
  margin-top: 0.5rem;
}

.edit-input {
  margin-bottom: 1rem;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-save, .btn-cancel {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-save {
  background: var(--primary-blue);
  color: white;
}

.btn-save:hover {
  background: var(--primary-blue-dark);
}

.btn-cancel {
  background: #e2e8f0;
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: #cbd5e0;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: var(--primary-blue);
  opacity: 0.6;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.empty-subtitle {
  font-size: 0.9rem;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 1.5rem 1rem;
  }
  
  .app-header {
    padding: 1rem;
  }
  
  .header-title {
    font-size: 1.75rem;
  }
  
  .card {
    padding: 1.25rem;
  }
  
  .input-group {
    grid-template-columns: 1fr;
  }
}
</style>