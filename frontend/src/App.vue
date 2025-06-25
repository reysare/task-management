<template>
  <div class="app-container">
    <!-- Glassmorphism header -->
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">FlowTask</h1>
        <p class="app-subtitle">Organize your day with elegance</p>
      </div>
      <div class="header-decoration">
        <div class="decoration-circle circle-1"></div>
        <div class="decoration-circle circle-2"></div>
        <div class="decoration-circle circle-3"></div>
      </div>
    </header>

    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="modern-spinner"></div>
      <p class="loading-text">Loading your tasks...</p>
    </div>

    <!-- Main content -->
    <main class="app-content">
      <!-- Add task card -->
      <div class="add-task-container glass-card">
        <h2 class="section-title">New Task</h2>
        <form @submit.prevent="addTask" class="task-form">
          <div class="form-group">
            <input
              v-model="newTask"
              type="text"
              placeholder="What needs to be done?"
              class="modern-input"
              :disabled="isLoading"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="input-label">Due Date</label>
              <input
                v-model="newDeadline"
                type="date"
                class="modern-input date-input"
                :disabled="isLoading"
              />
            </div>
            <button type="submit" class="primary-button" :disabled="isLoading">
              <span>Add Task</span>
              <svg class="button-icon" viewBox="0 0 24 24">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <!-- Task list -->
      <div class="task-list-container">
        <h2 class="section-title">Your Tasks</h2>
        
        <div v-if="tasks.length === 0" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24">
            <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
          </svg>
          <p>No tasks yet. Add your first task!</p>
        </div>

        <ul v-else class="task-list">
          <li v-for="task in tasks" :key="task.id" class="task-item">
            <div class="task-content">
              <label class="custom-checkbox">
                <input
                  type="checkbox"
                  :checked="task.is_done"
                  @change="toggleDone(task)"
                  :disabled="isLoading"
                />
                <span class="checkmark"></span>
              </label>
              
              <div v-if="editingTaskId === task.id" class="edit-container">
                <input
                  v-model="editedTaskTitle"
                  type="text"
                  class="edit-input"
                  :disabled="isLoading"
                />
                <div class="edit-actions">
                  <button @click="updateTask(task)" class="edit-button save-button" :disabled="isLoading">
                    <svg viewBox="0 0 24 24">
                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                  </button>
                  <button @click="cancelEdit" class="edit-button cancel-button" :disabled="isLoading">
                    <svg viewBox="0 0 24 24">
                      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div v-else class="task-details">
                <span :class="{ 'task-completed': task.is_done }" class="task-title">{{ task.title }}</span>
                <div class="task-meta">
                  <svg class="meta-icon" viewBox="0 0 24 24">
                    <path d="M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z" />
                  </svg>
                  <span class="task-deadline">{{ task.deadline }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="editingTaskId !== task.id" class="task-actions">
              <button @click="startEdit(task)" class="action-button edit-button" :disabled="isLoading">
                <svg viewBox="0 0 24 24">
                  <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                </svg>
              </button>
              <button @click="deleteTask(task.id)" class="action-button delete-button" :disabled="isLoading">
                <svg viewBox="0 0 24 24">
                  <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                </svg>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </main>
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
  },
};
</script>

<style scoped>
/* Base styles */
:root {
  --primary-color: #6366f1;
  --primary-light: #818cf8;
  --primary-dark: #4f46e5;
  --secondary-color: #10b981;
  --danger-color: #ef4444;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --bg-light: #f8fafc;
  --bg-dark: #0f172a;
  --glass-bg: rgba(255, 255, 255, 0.8);
  --glass-border: rgba(255, 255, 255, 0.2);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-primary);
  background-color: var(--bg-light);
  line-height: 1.5;
}

/* App container */
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* Header styles */
.app-header {
  position: relative;
  padding: 2rem 1.5rem 4rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
  color: white;
  overflow: hidden;
  z-index: 1;
}

.header-content {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
}

.app-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  letter-spacing: -0.05em;
}

.app-subtitle {
  font-size: 1rem;
  font-weight: 500;
  opacity: 0.9;
}

/* Header decoration */
.header-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  filter: blur(30px);
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: -50px;
  left: -50px;
}

.circle-2 {
  width: 300px;
  height: 300px;
  bottom: -100px;
  right: -100px;
}

.circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 30%;
}

/* Main content */
.app-content {
  flex: 1;
  padding: 0 1.5rem 2rem;
  max-width: 800px;
  width: 100%;
  margin: -2rem auto 0;
  position: relative;
  z-index: 2;
}

/* Glass card effect */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Section titles */
.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  color: var(--text-primary);
}

/* Form styles */
.task-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.input-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.modern-input {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: white;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.modern-input:focus {
  outline: none;
  border-color: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.date-input {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.25rem;
  padding-right: 2.5rem;
}

/* Buttons */
.primary-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
  align-self: flex-end;
  margin-top: 1.6rem;
}

.primary-button:hover {
  background-color: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.primary-button:active {
  transform: translateY(0);
}

.button-icon {
  width: 1.25rem;
  height: 1.25rem;
  fill: currentColor;
}

/* Task list */
.task-list-container {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
  padding: 1.5rem;
}

.task-list {
  list-style: none;
}

.task-item {
  padding: 1rem;
  background: white;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
}

.task-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.task-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

/* Custom checkbox */
.custom-checkbox {
  display: block;
  position: relative;
  cursor: pointer;
  width: 1.5rem;
  height: 1.5rem;
}

.custom-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  width: 1.5rem;
  height: 1.5rem;
  background-color: white;
  border: 2px solid #e2e8f0;
  border-radius: 6px;
  transition: var(--transition);
}

.custom-checkbox:hover input ~ .checkmark {
  border-color: var(--primary-light);
}

.custom-checkbox input:checked ~ .checkmark {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.custom-checkbox input:checked ~ .checkmark:after {
  display: block;
}

.custom-checkbox .checkmark:after {
  left: 0.5rem;
  top: 0.25rem;
  width: 0.375rem;
  height: 0.75rem;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* Task details */
.task-details {
  flex: 1;
}

.task-title {
  font-weight: 500;
  display: block;
  margin-bottom: 0.25rem;
}

.task-completed {
  text-decoration: line-through;
  color: var(--text-secondary);
  opacity: 0.7;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.meta-icon {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}

/* Edit mode */
.edit-container {
  flex: 1;
  display: flex;
  gap: 0.5rem;
}

.edit-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
}

.edit-input:focus {
  outline: none;
  border-color: var(--primary-light);
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: var(--transition);
}

.edit-button svg {
  width: 1.25rem;
  height: 1.25rem;
}

.save-button {
  background-color: var(--secondary-color);
  color: white;
}

.save-button:hover {
  background-color: #0d9f6e;
}

.cancel-button {
  background-color: #f1f5f9;
  color: var(--text-secondary);
}

.cancel-button:hover {
  background-color: #e2e8f0;
}

/* Task actions */
.task-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  cursor: pointer;
  transition: var(--transition);
}

.action-button svg {
  width: 1.125rem;
  height: 1.125rem;
  fill: currentColor;
}

.edit-button {
  color: var(--text-secondary);
}

.edit-button:hover {
  background-color: #f1f5f9;
  color: var(--primary-color);
}

.delete-button {
  color: var(--text-secondary);
}

.delete-button:hover {
  background-color: #fee2e2;
  color: var(--danger-color);
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  fill: #e2e8f0;
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(5px);
}

.modern-spinner {
  width: 3rem;
  height: 3rem;
  border: 4px solid rgba(99, 102, 241, 0.2);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-text {
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 500;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Disabled states */
.modern-input:disabled,
.primary-button:disabled,
.custom-checkbox input:disabled ~ .checkmark,
.action-button:disabled,
.edit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(50%);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-header {
    padding: 1.5rem 1rem 3rem;
  }
  
  .app-title {
    font-size: 2rem;
  }
  
  .app-content {
    padding: 0 1rem 1.5rem;
  }
  
  .form-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .primary-button {
    margin-top: 0;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 1.25rem 1rem 2.5rem;
  }
  
  .app-title {
    font-size: 1.75rem;
  }
  
  .glass-card,
  .task-list-container {
    padding: 1.25rem;
  }
  
  .task-item {
    padding: 0.75rem;
  }
  
  .task-content {
    gap: 0.75rem;
  }
}
</style>