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
        <p class="header-tagline">Transform your daily routine into a masterpiece</p>
      </div>
      <div class="header-decoration">
        <div class="deco-circle deco-1"></div>
        <div class="deco-circle deco-2"></div>
        <div class="deco-circle deco-3"></div>
      </div>
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
              <label for="taskInput" class="floating-label">What needs to be accomplished?</label>
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
              <label for="deadlineInput" class="floating-label">Target completion</label>
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
            {{ tasks.filter(t => !t.is_done).length }} active
          </div>
        </div>
        
        <div class="task-container">
          <div v-if="tasks.length" class="task-grid">
            <div v-for="task in tasks" :key="task.id" class="task-item" :class="{ 'task-completed': task.is_done }">
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
                      <label for="editInput" class="floating-label">Mission name</label>
                      <div class="input-highlight"></div>
                    </div>
                    <div class="edit-actions">
                      <button @click="updateTask(task)" class="btn-save" :disabled="isLoading">
                        <i class="fas fa-save"></i>
                        <span>Save</span>
                      </button>
                      <button @click="cancelEdit" class="btn-cancel" :disabled="isLoading">
                        <i class="fas fa-times"></i>
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
            <p class="empty-subtitle">Your journey to productivity starts here ✨</p>
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
          created_at: new Date(),
        });
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
          is_done: !task.is_done,
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
          title: this.editedTaskTitle,
        });
        this.editingTaskId = null;
        this.editedTaskTitle = "";
        console.log(`Tugas dengan ID ${task.id} diperbarui.`);
      } catch (err) {
        console.error("Gagal memperbarui tugas:", err);
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

/* Root variables updated for softer blues */
:root {
  --primary-gradient: linear-gradient(135deg, #6a8cff 0%, #4d7dff 100%);
  --secondary-gradient: linear-gradient(135deg, #8ab1ff 0%, #6a8cff 100%);
  --success-gradient: linear-gradient(135deg, #4facfe 0%, #00d2ff 100%);
  --danger-gradient: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
  --glass-bg: rgba(255, 255, 255, 0.95);
  --glass-border: rgba(106, 140, 255, 0.15);
  --text-primary: #2d3748;
  --text-secondary: #4a5568;
  --shadow-soft: 0 10px 30px rgba(106, 140, 255, 0.08);
  --shadow-hover: 0 15px 40px rgba(106, 140, 255, 0.12);
  --border-radius: 16px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Main layout with softer background */
.main-layout {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: linear-gradient(135deg, #f8faff 0%, #e6f0ff 100%);
  position: relative;
  overflow-x: hidden;
}

/* Animated floating shapes - made more subtle */
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
  background: rgba(106, 140, 255, 0.08);
  border-radius: 50%;
  animation: float 20s infinite linear;
}

@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
  50% { transform: translateY(-20px) rotate(180deg); opacity: 0.2; }
  100% { transform: translateY(0px) rotate(360deg); opacity: 0.5; }
}

/* Header with better contrast */
.app-header {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  margin: 20px 20px 0 20px;
  padding: 2rem;
  position: relative;
  z-index: 10;
  box-shadow: var(--shadow-soft);
  color: var(--text-primary);
}

.header-content {
  text-align: center;
  position: relative;
  z-index: 2;
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  width: 50px;
  height: 50px;
  background: var(--primary-gradient);
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
  box-shadow: 0 8px 20px rgba(106, 140, 255, 0.3);
}

.header-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.header-tagline {
  font-size: 1rem;
  opacity: 0.8;
  margin: 0;
  font-weight: 400;
  color: var(--text-secondary);
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(106, 140, 255, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modern-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 2rem;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top: 3px solid white;
  border-radius: 50%;
  animation: modernSpin 1.5s linear infinite;
}

@keyframes modernSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: white;
  font-size: 1.2rem;
  font-weight: 400;
  opacity: 0.9;
}

/* Content wrapper */
.content-wrapper {
  max-width: 800px;
  margin: -20px auto 0;
  padding: 0 20px 3rem;
  position: relative;
  z-index: 10;
}

/* Cards with better contrast */
.card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius);
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-soft);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-hover);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  position: relative;
}

/* Improved icon visibility */
.card-icon {
  width: 40px;
  height: 40px;
  background: var(--primary-gradient);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white !important;
  font-size: 1.2rem;
  box-shadow: 0 4px 15px rgba(106, 140, 255, 0.3);
}

.card-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex-grow: 1;
}

.task-counter {
  background: var(--success-gradient);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
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

/* Input fields with better visibility */
.floating-input {
  position: relative;
}

.input-field {
  width: 100%;
  padding: 1.2rem 1rem 0.8rem;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid rgba(106, 140, 255, 0.2);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 500;
  outline: none;
  transition: all 0.3s ease;
}

.input-field::placeholder {
  color: transparent;
}

.input-field:focus {
  border-color: rgba(106, 140, 255, 0.6);
  background: rgba(255, 255, 255, 0.98);
}

.floating-label {
  position: absolute;
  left: 1rem;
  top: 1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  pointer-events: none;
  font-weight: 500;
}

.input-field:focus + .floating-label,
.input-field:not(:placeholder-shown) + .floating-label {
  top: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-primary);
}

.input-highlight {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--primary-gradient);
  transition: width 0.3s ease;
}

.input-field:focus ~ .input-highlight {
  width: 100%;
}

/* Improved button visibility */
.btn-primary {
  width: 100%;
  padding: 1.2rem;
  background: var(--primary-gradient);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  box-shadow: 0 8px 20px rgba(106, 140, 255, 0.3);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(106, 140, 255, 0.4);
}

.btn-primary:active {
  transform: translateY(-1px);
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
  font-size: 1.1rem;
  color: white !important;
}

/* Task items with better contrast */
.task-container {
  margin-top: 1rem;
}

.task-grid {
  display: grid;
  gap: 1rem;
}

.task-item {
  background: var(--glass-bg);
  border: 1px solid rgba(106, 140, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.task-item:hover {
  transform: translateX(5px);
  box-shadow: var(--shadow-soft);
}

.task-completed {
  opacity: 0.7;
  transform: scale(0.98);
}

.task-priority-indicator {
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: var(--primary-gradient);
  border-radius: 0 2px 2px 0;
}

.task-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

/* Improved checkbox visibility */
.custom-checkbox {
  position: relative;
}

.checkbox-input {
  display: none;
}

.checkbox-label {
  display: block;
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid rgba(106, 140, 255, 0.6);
  border-radius: 6px;
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
  font-size: 0.8rem;
  transition: transform 0.2s ease;
}

.checkbox-input:checked + .checkbox-label {
  background: var(--success-gradient);
  border-color: transparent;
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
}

.checkbox-input:checked + .checkbox-label .checkbox-icon {
  transform: translate(-50%, -50%) scale(1);
}

/* Improved action buttons visibility */
.task-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  background: rgba(106, 140, 255, 0.1);
  color: #4a7dff !important;
}

.action-btn:hover {
  background: rgba(106, 140, 255, 0.2);
  transform: scale(1.1);
}

.action-btn.delete-btn {
  background: rgba(255, 107, 107, 0.1);
  color: #ff6b6b !important;
}

.action-btn.delete-btn:hover {
  background: rgba(255, 107, 107, 0.2);
}

.task-body {
  color: var(--text-primary);
}

.task-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
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
  gap: 1rem;
}

.deadline-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(106, 140, 255, 0.08);
  padding: 0.3rem 0.8rem;
  border-radius: 12px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Edit mode styling */
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

.btn-save, .btn-cancel {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-save {
  background: var(--success-gradient);
  color: white;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(79, 172, 254, 0.3);
}

.btn-cancel {
  background: rgba(106, 140, 255, 0.1);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: rgba(106, 140, 255, 0.2);
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
  opacity: 0.6;
  color: #6a8cff;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.empty-subtitle {
  opacity: 0.8;
  font-size: 1rem;
}

/* Ensure all icons are visible */
.fas, .far {
  color: inherit !important;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-header {
    margin: 10px;
    padding: 1.5rem;
  }

  .header-title {
    font-size: 2rem;
  }

  .content-wrapper {
    padding: 0 10px 2rem;
  }

  .card {
    padding: 1.5rem;
  }

  .input-group {
    grid-template-columns: 1fr;
  }
}
</style>