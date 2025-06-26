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
      </header>

    <div v-if="isLoading" class="loading-overlay">
      <div class="modern-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <p class="loading-text">Synchronizing your universe...</p>
    </div>

    <div class="content-wrapper">
      <main class="main-content">
        <section class="task-form-section">
          <div class="glass-card new-task-card">
            <h2 class="card-title">Add a New Flow</h2>
            <div class="input-group">
              <input
                type="text"
                v-model="newTaskTitle"
                @keyup.enter="addTask"
                placeholder="What's flowing today?"
                class="task-input"
                required
              />
              <button @click="addTask" class="btn-add">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
          </div>
        </section>

        <section class="task-list-section">
          <div class="glass-card task-list-card">
            <h2 class="card-title">My Daily Flows</h2>
            <div v-if="tasks.length > 0" class="task-items-container">
              <transition-group name="task-item-fade" tag="ul" class="task-list">
                <li
                  v-for="task in sortedTasks"
                  :key="task.id"
                  :class="{ 'task-item': true, completed: task.completed }"
                >
                  <div class="task-content">
                    <input
                      type="checkbox"
                      v-model="task.completed"
                      @change="toggleCompletion(task)"
                      class="task-checkbox"
                    />
                    <span v-if="!task.editing" class="task-title">{{
                      task.title
                    }}</span>
                    <input
                      v-else
                      type="text"
                      v-model="task.editedTitle"
                      @keyup.enter="saveEdit(task)"
                      @keyup.esc="cancelEdit(task)"
                      class="edit-input"
                    />
                  </div>
                  <div class="task-actions">
                    <button
                      v-if="!task.editing"
                      @click="startEdit(task)"
                      class="btn-edit"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <div v-else class="edit-actions">
                      <button @click="saveEdit(task)" class="btn-save">
                        <i class="fas fa-check"></i> Save
                      </button>
                      <button @click="cancelEdit(task)" class="btn-cancel">
                        <i class="fas fa-times"></i> Cancel
                      </button>
                    </div>
                    <button @click="deleteTask(task)" class="btn-delete">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </li>
              </transition-group>
            </div>
            <div v-else class="empty-state">
              <i class="fas fa-clipboard-check empty-icon"></i>
              <p class="empty-text">No flows yet! Start adding yours.</p>
            </div>
          </div>
        </section>
      </main>
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
  inject: ["$db", "$appId", "$userId"], // Inject Firebase Firestore instance
  data() {
    return {
      newTaskTitle: "",
      tasks: [],
      isLoading: true, // New loading state
      unsubscribe: null, // To store the unsubscribe function from onSnapshot
    };
  },
  computed: {
    sortedTasks() {
      // Sort tasks: completed ones at the bottom, then by creation date (or title if no date)
      return [...this.tasks].sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        // If both are completed or both not, sort by creationDate (if available) or title
        if (a.creationDate && b.creationDate) {
          return a.creationDate - b.creationDate;
        }
        return a.title.localeCompare(b.title);
      });
    },
  },
  watch: {
    // Watch for changes in $userId and re-fetch tasks if it changes
    $userId: {
      immediate: true, // Run immediately on component mount
      handler(newUserId, oldUserId) {
        if (newUserId && newUserId !== oldUserId) {
          this.fetchTasks();
        } else if (!newUserId) {
          // If userId becomes null, clear tasks and reset loading if needed
          this.tasks = [];
          this.isLoading = false;
        }
      },
    },
  },
  methods: {
    async fetchTasks() {
      if (!this.$db || !this.$appId || !this.$userId) {
        console.warn("Firestore or App/User ID not available yet for fetching tasks.");
        this.isLoading = false;
        return;
      }

      this.isLoading = true;

      // Unsubscribe from previous listener if it exists
      if (this.unsubscribe) {
        this.unsubscribe();
      }

      try {
        const tasksCollectionRef = collection(
          this.$db,
          `users/${this.$userId}/tasks`
        );
        const q = query(tasksCollectionRef); // You can add orderBy here if needed

        this.unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedTasks = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            fetchedTasks.push({
              id: doc.id,
              title: data.title,
              completed: data.completed || false,
              creationDate: data.creationDate ? data.creationDate.toDate() : new Date(), // Convert Firestore Timestamp to Date
              editing: false, // UI state for editing
              editedTitle: data.title, // Temp storage for edited title
            });
          });
          this.tasks = fetchedTasks;
          this.isLoading = false;
        }, (error) => {
          console.error("Error fetching tasks:", error);
          this.isLoading = false;
        });
      } catch (error) {
        console.error("Failed to setup task listener:", error);
        this.isLoading = false;
      }
    },
    async addTask() {
      if (!this.newTaskTitle.trim() || !this.$db || !this.$userId) {
        alert("Task title cannot be empty.");
        return;
      }
      try {
        await addDoc(collection(this.$db, `users/${this.$userId}/tasks`), {
          title: this.newTaskTitle,
          completed: false,
          creationDate: new Date(), // Add creation timestamp
        });
        this.newTaskTitle = "";
        console.log("Task added successfully!");
      } catch (error) {
        console.error("Error adding task:", error);
      }
    },
    async toggleCompletion(task) {
      if (!this.$db || !this.$userId) {
        console.error("Firestore or User ID not available for toggling.");
        return;
      }
      try {
        const taskRef = doc(this.$db, `users/${this.$userId}/tasks`, task.id);
        await updateDoc(taskRef, {
          completed: task.completed,
        });
        console.log("Task completion toggled!");
      } catch (error) {
        console.error("Error toggling task completion:", error);
      }
    },
    async deleteTask(task) {
      if (!this.$db || !this.$userId) {
        console.error("Firestore or User ID not available for deleting.");
        return;
      }
      if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
        try {
          const taskRef = doc(this.$db, `users/${this.$userId}/tasks`, task.id);
          await deleteDoc(taskRef);
          console.log("Task deleted!");
        } catch (error) {
          console.error("Error deleting task:", error);
        }
      }
    },
    startEdit(task) {
      task.editing = true;
      task.editedTitle = task.title; // Initialize editedTitle with current title
    },
    async saveEdit(task) {
      if (!task.editedTitle.trim() || !this.$db || !this.$userId) {
        alert("Edited task title cannot be empty.");
        return;
      }
      try {
        const taskRef = doc(this.$db, `users/${this.$userId}/tasks`, task.id);
        await updateDoc(taskRef, {
          title: task.editedTitle,
        });
        task.title = task.editedTitle; // Update displayed title
        task.editing = false; // Exit editing mode
        console.log("Task updated successfully!");
      } catch (error) {
        console.error("Error updating task:", error);
      }
    },
    cancelEdit(task) {
      task.editing = false;
      task.editedTitle = task.title; // Revert editedTitle
    },
  },
  beforeUnmount() {
    // Unsubscribe from Firestore listener when component is unmounted
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
};
</script>

<style scoped>
/* Main layout and background */
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  font-family: 'Poppins', sans-serif;
  color: #333;
  position: relative; /* For absolute positioning of animated-bg */
  overflow: hidden;
  padding-bottom: 2rem; /* Add some padding at the bottom */
}

/* Animated background styles */
.animated-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #a7e9af 0%, #d8f1d8 100%); /* Soft greenish gradient */
  overflow: hidden;
  z-index: -1;
}

.floating-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.shape {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  opacity: 0.8;
  animation: float 15s infinite ease-in-out alternate;
}

.shape-1 {
  width: 80px;
  height: 80px;
  top: 10%;
  left: 15%;
  animation-duration: 18s;
  animation-delay: 0s;
}

.shape-2 {
  width: 120px;
  height: 120px;
  top: 40%;
  left: 80%;
  animation-duration: 20s;
  animation-delay: 2s;
}

.shape-3 {
  width: 60px;
  height: 60px;
  top: 70%;
  left: 30%;
  animation-duration: 16s;
  animation-delay: 4s;
}

.shape-4 {
  width: 100px;
  height: 100px;
  top: 20%;
  left: 60%;
  animation-duration: 19s;
  animation-delay: 1s;
}

.shape-5 {
  width: 90px;
  height: 90px;
  top: 85%;
  left: 50%;
  animation-duration: 17s;
  animation-delay: 3s;
}

@keyframes float {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.8;
  }
  50% {
    transform: translateY(-20px) rotate(10deg);
    opacity: 0.9;
  }
  100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0.8;
  }
}

/* Header styles (Glassmorphism) */
.app-header {
  width: 90%;
  max-width: 800px;
  background: rgba(255, 255, 255, 0.2); /* Transparent white */
  backdrop-filter: blur(10px); /* Glassmorphism effect */
  border-radius: 20px;
  padding: 1.5rem 2rem;
  margin-top: 2rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  position: relative;
  overflow: hidden;
  z-index: 1; /* Ensure header is above background */
}

.header-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.5rem;
}

.logo-icon {
  background: linear-gradient(135deg, #a7e9af 0%, #d8f1d8 100%);
  padding: 0.6rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.logo-icon i {
  font-size: 1.5rem;
  color: #333; /* Darker icon color for contrast */
}

.header-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #2c3e50;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.05);
}

.header-tagline {
  font-size: 1.1rem;
  color: #555;
  font-weight: 400;
  margin-top: 0.5rem;
  align-self: flex-end;
  text-align: right;
  max-width: 60%;
  line-height: 1.4;
}

/* Decoration circles (optional, if uncommented in template) */
.header-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  pointer-events: none;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
}

.deco-1 {
  width: 40px;
  height: 40px;
  top: 10px;
  right: 10px;
}

.deco-2 {
  width: 60px;
  height: 60px;
  top: 50px;
  right: 30px;
}

.deco-3 {
  width: 30px;
  height: 30px;
  top: 80px;
  right: 60px;
}

/* Loading overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.9); /* Semi-transparent white background */
  backdrop-filter: blur(5px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000; /* Ensure it's on top */
  animation: fadeIn 0.3s ease-out;
}

.modern-spinner {
  position: relative;
  width: 60px;
  height: 60px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 4px solid #4CAF50; /* Primary color */
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(1) {
  animation-delay: -0.45s;
}

.spinner-ring:nth-child(2) {
  animation-delay: -0.3s;
  border-color: #81C784; /* Lighter shade */
  border-top-color: transparent;
}

.spinner-ring:nth-child(3) {
  animation-delay: -0.15s;
  border-color: #66BB6A; /* Slightly darker shade */
  border-top-color: transparent;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  margin-top: 1.5rem;
  font-size: 1.2rem;
  color: #333;
  font-weight: 500;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Main content area */
.content-wrapper {
  width: 90%;
  max-width: 800px;
  margin-top: 2rem;
  z-index: 1;
  flex-grow: 1; /* Allow content to take available space */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Glassmorphism Card styles */
.glass-card {
  background: rgba(255, 255, 255, 0.2); /* Transparent white */
  backdrop-filter: blur(10px); /* Glassmorphism effect */
  border-radius: 15px;
  padding: 1.5rem;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-title {
  font-size: 1.6rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.8rem;
  text-align: center;
}

/* New Task Form */
.input-group {
  display: flex;
  gap: 0.8rem;
  width: 100%;
}

.task-input {
  flex-grow: 1;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  font-size: 1rem;
  color: #333;
  transition: all 0.3s ease;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.task-input::placeholder {
  color: #777;
}

.task-input:focus {
  outline: none;
  border-color: #66bb6a; /* Green highlight on focus */
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 0 3px rgba(102, 187, 106, 0.3);
}

.btn-add {
  background: linear-gradient(135deg, #66bb6a 0%, #4CAF50 100%); /* Green */
  color: white;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 10px rgba(76, 175, 80, 0.4);
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(76, 175, 80, 0.6);
}

.btn-add:active {
  transform: translateY(0);
  box-shadow: 0 2px 5px rgba(76, 175, 80, 0.4);
}

/* Task List styles */
.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.4); /* Slightly less transparent */
  padding: 0.8rem 1rem;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.task-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.task-item.completed {
  opacity: 0.7;
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.2);
}

.task-item.completed .task-title {
  text-decoration: line-through;
  color: #777;
}

.task-content {
  display: flex;
  align-items: center;
  flex-grow: 1;
  gap: 0.8rem;
  font-size: 1rem;
}

.task-checkbox {
  width: 1.2rem;
  height: 1.2rem;
  accent-color: #66bb6a; /* Green checkbox */
  cursor: pointer;
}

.task-title {
  word-break: break-word;
  max-width: calc(100% - 2.5rem); /* Account for checkbox */
}

.task-actions {
  display: flex;
  gap: 0.4rem;
}

.btn-edit,
.btn-delete {
  background: rgba(255, 255, 255, 0.3); /* Transparent */
  border: none;
  border-radius: 6px;
  padding: 0.6rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: #555;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-edit:hover {
  background: rgba(173, 216, 230, 0.5); /* Light blue on hover */
  color: #333;
}

.btn-delete {
  color: #d32f2f; /* Red for delete */
}

.btn-delete:hover {
  background: rgba(255, 99, 71, 0.2); /* Light tomato red */
  color: #c62828;
}

/* Task item transition */
.task-item-fade-enter-active,
.task-item-fade-leave-active {
  transition: all 0.5s ease;
}
.task-item-fade-enter-from,
.task-item-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.task-item-fade-leave-active {
  position: absolute; /* Ensures smooth removal without layout shifts */
  width: 100%;
}

/* Edit mode styles */
.edit-input {
  flex-grow: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid #66bb6a;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  font-size: 0.9rem;
  color: #333;
  margin-right: 0.5rem;
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
  padding: 2.5rem 1.5rem;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.5);
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #888;
}

.empty-text {
  font-size: 1.1rem;
  font-weight: 500;
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .app-header {
    padding: 1rem 1.5rem;
  }

  .header-title {
    font-size: 1.8rem;
  }

  .header-tagline {
    font-size: 0.9rem;
    max-width: 100%;
    text-align: center;
    margin-top: 1rem;
  }

  .logo-section {
    width: 100%;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .input-group {
    flex-direction: column;
    gap: 0.6rem;
  }

  .task-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .task-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .task-content {
    width: 100%;
  }

  .edit-input {
    width: 100%;
    margin-right: 0;
  }
  .edit-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>