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
                    <button
                      @click="updateTask(task)"
                      class="btn-save"
                      :disabled="isLoading"
                    >
                      Simpan
                    </button>
                    <button
                      @click="cancelEdit"
                      class="btn-cancel"
                      :disabled="isLoading"
                    >
                      Batal
                    </button>
                  </div>
                </div>
                <div v-else class="display-mode">
                  <span
                    :class="{ 'task-title-done': task.is_done }"
                    class="task-title-main"
                  >
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
        <p v-else class="no-task-message">
          Belum ada tugas. Yuk, tambahkan yang baru! 🎉
        </p>
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
      isLoading: true, // Set to true initially as data fetch is asynchronous
      unsubscribe: null, // To store the onSnapshot unsubscribe function
    };
  },
  watch: {
    // Watch for changes in $userId (which becomes available after authentication)
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
            // Sort by is_done (false first), then by deadline (ascending), then by created_at (descending)
            if (a.is_done !== b.is_done) {
              return a.is_done ? 1 : -1; // Done tasks last
            }
            if (a.deadline && b.deadline) {
              return new Date(a.deadline) - new Date(b.deadline);
            }
            if (a.created_at && b.created_at) {
              // Assuming created_at is a Firebase Timestamp
              const dateA = a.created_at.toDate
                ? a.created_at.toDate()
                : new Date(a.created_at);
              const dateB = b.created_at.toDate
                ? b.created_at.toDate()
                : new Date(b.created_at);
              return dateB - dateA; // Newest first
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
            created_at: new Date(), // Add a timestamp for potential ordering/sorting
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
      if (!id) return; // Ensure ID exists

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
            is_done: !task.is_done, // Toggle the 'is_done' status
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
            title: this.editedTaskTitle, // Update only the title
          }
        );
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
  font-family: "Inter", "SF Pro Display", "Segoe UI", Arial, sans-serif;
  width: 100%;
  overflow-x: hidden;
  background: linear-gradient(
    135deg,
    #667eea 50%,
    #4facfe 25%
  );
  background-size: 400% 400%;
  animation: gradientFlow 15s ease infinite;
  position: relative;
}

@keyframes gradientFlow {
  0%,
  100% {
    background-position: 0% 50%;
  }
  25% {
    background-position: 100% 50%;
  }
  50% {
    background-position: 50% 100%;
  }
  75% {
    background-position: 50% 0%;
  }
}

.main-layout::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
      circle at 25% 25%,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 75% 75%,
      rgba(255, 255, 255, 0.05) 0%,
      transparent 50%
    ),
    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Header styling */
.app-header {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.25),
    rgba(255, 255, 255, 0.1)
  );
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  width: 100%;
  padding: 4rem 2rem 5rem 2rem;
  color: white;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  /* border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem; */
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.app-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  animation: headerShine 4s ease-in-out infinite;
  z-index: 1;
}

@keyframes headerShine {
  0%,
  100% {
    transform: translateX(-100%) skewX(-15deg);
  }
  50% {
    transform: translateX(100%) skewX(-15deg);
  }
}

.header-title {
  font-size: 3rem;
  font-weight: 900;
  margin: 0;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5),
    0 0 40px rgba(255, 255, 255, 0.3), 0 0 60px rgba(255, 255, 255, 0.1);
  letter-spacing: 0.05em;
  position: relative;
  z-index: 2;
  background: linear-gradient(135deg, #ffffff, #f8f9fa, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: titleGlow 3s ease-in-out infinite alternate;
}

@keyframes titleGlow {
  0% {
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }
  100% {
    text-shadow: 0 0 30px rgba(255, 255, 255, 0.8),
      0 0 60px rgba(255, 255, 255, 0.4);
  }
}

.header-tagline {
  font-size: 1rem;
  margin-top: 1rem;
  opacity: 0.9;
  position: relative;
  z-index: 2;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Content wrapper for cards */
.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
  width: 100%;
  max-width: 800px;
  margin: -50px auto 0 auto;
  padding: 0 1.5rem;
  position: relative;
  z-index: 10;
}

/* Common card styling */
.card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-radius: 5px;
  padding: 3rem;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(102, 126, 234, 0.6),
    transparent
  );
  animation: cardTopGlow 3s ease-in-out infinite;
}

@keyframes cardTopGlow {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

.card:hover {
  transform: translateY(-12px);
  box-shadow: 0 35px 70px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.card-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 2.5rem;
  text-align: center;
  position: relative;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-title::after {
  content: "";
  position: absolute;
  bottom: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 4px;
  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
  border-radius: 1px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* Form styling */
.form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-label {
  font-size: 1rem;
  color: #6c757d;
  margin-bottom: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #667eea, #603c83);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.input-field {
  padding: 1.5rem 2rem;
  font-size: 1.1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  outline: none;
  transition: all 0.4s ease;
  width: 100%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.input-field:focus {
  border-color: rgba(102, 126, 234, 0.6);
  box-shadow: 0 0 30px rgba(102, 126, 234, 0.2),
    inset 0 2px 4px rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-3px);
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 1.5rem 0;
  font-size: 1.3rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.4s ease;
  font-weight: 700;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  position: relative;
  overflow: hidden;
  text-transform: uppercase;
}

.btn-primary::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.6s ease;
}

.btn-primary:hover::before {
  left: 100%;
}

.btn-primary:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
}

.btn-primary:active {
  transform: translateY(-2px);
}

/* Task list styling */
.task-list {
  list-style: none;
  margin-top: 2rem;
  padding: 0;
}

.task-item {
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.95),
    rgba(255, 255, 255, 0.85)
  );
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  padding: 2rem 2.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
}

.task-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  width: 6px;
  height: 100%;
  background: linear-gradient(135deg, #667eea, #764ba2, #f093fb);
  transition: all 0.4s ease;
  border-radius: 0 3px 3px 0;
}

.task-item:hover::before {
  width: 12px;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
}

.task-item:hover {
  transform: translateY(-6px) translateX(12px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.98),
    rgba(255, 255, 255, 0.9)
  );
}

.task-details {
  display: flex;
  align-items: flex-start;
  gap: 2rem;
  flex-grow: 1;
}

.task-checkbox {
  width: 32px;
  height: 32px;
  cursor: pointer;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-radius: 3px;
  transition: all 0.4s ease;
  min-width: 32px;
  min-height: 32px;
  position: relative;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  appearance: none;
  -webkit-appearance: none;
}

.task-checkbox:checked {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.4);
}

.task-checkbox:checked::after {
  content: "✓";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: 900;
  font-size: 18px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.task-content-display {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.task-title-main {
  font-weight: 700;
  font-size: 1.3rem;
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
  font-size: 1rem;
  color: #718096;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-weight: 600;
  background: rgba(102, 126, 234, 0.1);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  width: fit-content;
}

.task-deadline-info .task-icon {
  font-size: 1.1em;
  color: #667eea;
}

.task-actions-group {
  display: flex;
  flex-direction: row;
  gap: 0.8rem;
  margin-left: 1.5rem;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(15px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-size: 1.1rem;
  color: #667eea;
  padding: 1rem;
  border-radius: 16px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  width: 30px;
  height: 30px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.btn-icon::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  transition: all 0.4s ease;
  z-index: -1;
}

.btn-icon:hover {
  transform: translateY(-4px) scale(1.1);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
  border-color: transparent;
}

/* Edit button with pencil icon */
.btn-edit {
  position: relative;
}

.btn-edit::after {
  content: "✏️";
  font-size: 1.2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
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
  border-radius: 16px;
}

.btn-edit:hover::after {
  transform: translate(-50%, -50%) scale(1.1);
}

/* Delete button with trash icon */
.btn-delete {
  position: relative;
}

.btn-delete::after {
  content: "🗑️";
  font-size: 1.2rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.3s ease;
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
  border-radius: 16px;
}

.btn-delete:hover::after {
  transform: translate(-50%, -50%) scale(1.1);
}

/* Edit mode specific styles */
.edit-mode {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex-grow: 1;
  width: 100%;
}

.input-edit-task {
  padding: 1.2rem 1.5rem;
  font-size: 1.1rem;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-radius: 2px;
  outline: none;
  transition: all 0.4s ease;
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.input-edit-task:focus {
  border-color: #667eea;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.3),
    inset 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.edit-actions {
  display: flex;
  gap: 1rem;
  width: 100%;
}

.btn-save,
.btn-cancel {
  flex-grow: 1;
  padding: 1rem 1.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  border-radius: 2px;
  border: none;
  cursor: pointer;
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-save {
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  color: white;
  box-shadow: 0 6px 20px rgba(78, 205, 196, 0.3);
}

.btn-save:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(78, 205, 196, 0.4);
}

.btn-cancel {
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: white;
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.3);
}

.btn-cancel:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(255, 107, 107, 0.4);
}

/* Message for no tasks */
.no-task-message {
  text-align: center;
  color: #a0aec0;
  font-style: italic;
  margin-top: 3rem;
  font-size: 1.2rem;
  padding: 3rem;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.05)
  );
  border-radius: 24px;
  border: 2px dashed rgba(160, 174, 192, 0.3);
  backdrop-filter: blur(10px);
  font-weight: 600;
}

/* Loading overlay and spinner styling */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(15px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.spinner {
  border: 5px solid rgba(102, 126, 234, 0.2);
  border-top: 5px solid #667eea;
  border-radius: 50%;
  width: 70px;
  height: 70px;
  animation: spin 1s linear infinite;
  margin-bottom: 25px;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
}

.loading-text {
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 1.3rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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
  opacity: 0.4;
  filter: grayscale(80%);
  transform: none;
  box-shadow: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-header {
    padding: 3rem 1.5rem 4rem 1.5rem;
    border-bottom-left-radius: 2.5rem;
    border-bottom-right-radius: 2.5rem;
  }
  .header-title {
    font-size: 2.8rem;
  }
  .header-tagline {
    font-size: 1.1rem;
  }
  .content-wrapper {
    margin-top: -40px;
    padding: 0 1rem;
    gap: 3rem;
  }
  .card {
    padding: 2.5rem;
    border-radius: 28px;
  }
  .card-title {
    font-size: 1.8rem;
    margin-bottom: 2rem;
  }
  .input-field,
  .btn-primary {
    padding: 1.3rem 1.8rem;
    font-size: 1.1rem;
  }
  .task-item {
    padding: 1.5rem 2rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
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
    width: 28px;
    height: 28px;
    min-width: 28px;
    min-height: 28px;
  }
  .task-title-main {
    font-size: 1.2rem;
  }
  .task-deadline-info {
    font-size: 0.9rem;
  }
  .btn-icon {
    width: 44px;
    height: 44px;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 2.5rem 1rem 3.5rem 1rem;
    border-bottom-left-radius: 2rem;
    border-bottom-right-radius: 2rem;
  }
  .header-title {
    font-size: 2.3rem;
  }
  .header-tagline {
    font-size: 1rem;
  }
  .content-wrapper {
    margin-top: -30px;
    padding: 0 0.8rem;
    gap: 2.5rem;
  }
  .card {
    padding: 2rem;
    border-radius: 24px;
  }
  .card-title {
    font-size: 1.6rem;
    margin-bottom: 1.8rem;
  }
  .input-field {
    padding: 1.2rem 1.5rem;
    font-size: 1rem;
  }
  .btn-primary {
    padding: 1.2rem 0;
    font-size: 1.1rem;
  }
  .task-item {
    padding: 1.3rem 1.5rem;
    gap: 1.2rem;
  }
  .task-details {
    gap: 1.5rem;
  }
  .task-title-main {
    font-size: 1.1rem;
  }
  .task-deadline-info {
    font-size: 0.85rem;
  }
  .btn-icon {
    width: 40px;
    height: 40px;
    font-size: 0.95rem;
  }
}
</style>
