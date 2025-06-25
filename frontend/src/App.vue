<template>
  <!-- Main layout container for the entire application, now ensures header spans full width -->
  <div class="main-layout">
    <!-- Header section for the application title, now truly full width and enhanced visually -->
    <header class="app-header">
      <h1 class="header-title">Daily Life Tasks</h1>
    </header>

    <!-- Wrapper for the two main content cards: Add Task and Task List, ensuring they are centered -->
    <div class="content-wrapper">
      <!-- Loading indicator with spinner -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Memuat...</p>
      </div>

      <!-- Card for adding a new task -->
      <div class="card add-task-card">
        <h2 class="card-title">Tambahkan Tugas Baru</h2>
        <!-- Form for inputting new task details -->
        <form @submit.prevent="addTask" class="form">
          <!-- Input field for the activity title -->
          <input
            v-model="newTask"
            type="text"
            placeholder="Judul Aktivitas"
            class="input"
            :disabled="isLoading"
          />
          <!-- Input field for the deadline date -->
          <input
            v-model="newDeadline"
            type="date"
            class="input"
            :disabled="isLoading"
          />
          <!-- Button to submit and add the new task -->
          <button type="submit" class="btn-add" :disabled="isLoading">
            Tambah Tugas
          </button>
        </form>
      </div>

      <!-- Card for displaying the list of tasks -->
      <div class="card task-list-card">
        <h2 class="card-title">Daftar Tugas Anda</h2>
        <!-- User ID display removed as per user request -->
        <!-- <p v-if="$userId" class="user-id-display">User ID: {{ $userId }}</p> -->

        <!-- List of tasks, displayed only if there are tasks in the array -->
        <ul v-if="tasks.length" class="task-list">
          <!-- Loop through each task to display it -->
          <li v-for="task in tasks" :key="task.id" class="task-item">
            <div class="task-left">
              <!-- Checkbox to mark task as complete or incomplete -->
              <input
                type="checkbox"
                :checked="task.is_done"
                @change="toggleDone(task)"
                class="checkbox"
                :disabled="isLoading"
              />
              <!-- Container for task title and deadline -->
              <div class="task-content">
                <!-- Conditional rendering: show edit input if task is being edited -->
                <div v-if="editingTaskId === task.id" class="edit-mode">
                  <input
                    v-model="editedTaskTitle"
                    type="text"
                    class="input-edit"
                    :disabled="isLoading"
                  />
                  <div class="edit-buttons">
                    <button @click="updateTask(task)" class="btn-save" :disabled="isLoading">Simpan</button>
                    <button @click="cancelEdit" class="btn-cancel" :disabled="isLoading">Batal</button>
                  </div>
                </div>
                <!-- Conditional rendering: show task details if not in edit mode -->
                <div v-else class="display-mode">
                  <span :class="{ done: task.is_done }" class="task-title">
                    {{ task.title }}
                  </span>
                  <!-- Deadline with icon for better separation and styling -->
                  <span class="task-deadline">
                    <i class="far fa-calendar-alt task-icon"></i> <!-- Icon for calendar, added task-icon class -->
                    {{ task.deadline }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Container for task action buttons (edit and delete) -->
            <div class="task-actions">
              <!-- Edit button, visible only if not currently editing this task -->
              <button
                v-if="editingTaskId !== task.id"
                @click="startEdit(task)"
                class="btn-action btn-edit"
                title="Edit tugas"
                :disabled="isLoading"
              >
                ✏️
              </button>
              <!-- Delete button -->
              <button
                @click="deleteTask(task.id)"
                class="btn-action btn-delete"
                title="Hapus tugas"
                :disabled="isLoading"
              >
                🗑️
              </button>
            </div>
          </li>
        </ul>
        <!-- Message displayed when no tasks are present -->
        <p v-else class="no-task">Belum ada tugas ditemukan 😴</p>
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
      isLoading: true, // State for global loading indicator (used for initial fetch)
      unsubscribe: null, // To store the onSnapshot unsubscribe function
    };
  },
  watch: {
    // Watch for changes in $userId (which becomes available after authentication)
    '$userId': {
      handler(newUserId) {
        if (newUserId) {
          // If userId is available, start fetching tasks
          this.fetchTasksRealtime();
        } else {
          // If userId becomes null (e.g., logout), unsubscribe and clear tasks
          if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
          }
          this.tasks = [];
        }
      },
      immediate: true // Run handler immediately on component creation
    }
  },
  beforeUnmount() {
    // Unsubscribe from real-time updates when the component is destroyed
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  },
  methods: {
    // Use real-time listener for fetching tasks
    fetchTasksRealtime() {
      // Ensure db, appId, and userId are available
      if (!this.$db || !this.$appId || !this.$userId) {
        console.warn("Firebase atau ID pengguna belum tersedia.");
        return;
      }

      this.isLoading = true; // Show loading spinner for the initial data load

      // Construct the Firestore collection path using appId and userId
      const tasksCollectionRef = collection(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`);
      const q = query(tasksCollectionRef);

      // Set up real-time listener
      this.unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTasks = [];
        snapshot.forEach((doc) => {
          fetchedTasks.push({ id: doc.id, ...doc.data() });
        });
        this.tasks = fetchedTasks;
        this.isLoading = false; // Hide loading spinner once data is loaded
        console.log("Tugas diambil secara real-time:", this.tasks);
      }, (error) => {
        console.error("Error saat mengambil tugas real-time:", error);
        this.isLoading = false; // Hide loading on error
        // Provide user feedback for error
      });
    },

    async addTask() {
      if (!this.newTask.trim() || !this.newDeadline) return;

      try {
        // Firestore automatically handles adding a new document and reflecting it via onSnapshot
        await addDoc(collection(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`), {
          title: this.newTask,
          deadline: this.newDeadline,
          is_done: false,
          created_at: new Date(), // Add a timestamp for potential ordering/sorting
        });
        // Clear form inputs immediately after initiating addDoc
        this.newTask = "";
        this.newDeadline = "";
        console.log("Tugas ditambahkan ke Firestore.");
      } catch (err) {
        console.error("Gagal menambahkan tugas:", err);
        // Provide user feedback (e.g., using a toast notification)
      }
    },

    async deleteTask(id) {
      if (!id) return; // Ensure ID exists

      try {
        await deleteDoc(doc(this.$db, `artifacts/${this.$appId}/users/${this.$userId}/tasks`, id));
        console.log(`Tugas dengan ID ${id} dihapus.`);
      } catch (err) {
        console.error("Gagal menghapus tugas:", err);
        // Provide user feedback
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
        // Provide user feedback
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
        this.editingTaskId = null; // Exit edit mode
        this.editedTaskTitle = ""; // Clear edited title
        console.log(`Tugas dengan ID ${task.id} diperbarui.`);
      } catch (err) {
        console.error("Gagal memperbarui tugas:", err);
        // Provide user feedback
      }
    },
  },
};
</script>

<style scoped>
/* Base layout for the entire application */
.main-layout {
  min-height: 100vh; /* Ensures the layout takes up the full viewport height */
  display: flex;
  flex-direction: column; /* Stacks header and content vertically */
  padding-bottom: 2rem; /* Adds padding at the bottom of the page */
  font-family: 'Segoe UI', Arial, sans-serif; /* A clear, modern font */
  width: 100%; /* Ensures the layout takes full width */
}

/* Styling for the application header */
.app-header {
  background: linear-gradient(to right, #3498DB, #2980B9); /* Gradient background for a more dynamic look */
  width: 100%; /* Full width header */
  padding: 1.8rem 2.5rem; /* Increased vertical padding for more prominence */
  color: white; /* White text for header elements */
  text-align: left; /* Align title to the left */
  box-shadow: 0 5px 15px rgba(0,0,0,0.3); /* Stronger, more noticeable shadow */
  border-bottom-left-radius: 25px; /* Slightly larger radius for a smoother curve */
  border-bottom-right-radius: 25px;
  display: flex; /* Use flexbox for vertical centering of title */
  align-items: center; /* Vertically center the title within the header */
}

/* Styling for the main title within the header */
.header-title {
  font-size: 2.2rem; /* Even larger and clearer font size */
  font-weight: 700; /* Bold font weight */
  margin: 0; /* Removes default margin to prevent layout shifts */
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2); /* Subtle text shadow for depth */
}

/* Wrapper for the content cards to manage their layout */
.content-wrapper {
  display: flex;
  flex-direction: column; /* Cards stacked vertically */
  gap: 1.8rem; /* Increased space between cards */
  width: 100%;
  max-width: 650px; /* Slightly wider max-width for content cards */
  margin: 2.5rem auto 0 auto; /* Centered horizontally using auto margins */
  padding: 0 1.5rem; /* Horizontal padding for responsiveness */
  position: relative; /* For positioning loading indicator */
}

/* Common styling for all content cards */
.card {
  background-color: white; /* Clean white background */
  border-radius: 12px; /* Nicely rounded corners */
  padding: 2rem; /* Generous padding inside cards */
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.12); /* Softer, slightly larger shadow */
  border: 1px solid #E0E0E0; /* Subtle light gray border */
  width: 100%; /* Ensure card takes full width of its parent (content-wrapper) */
}

/* Styling for titles within cards */
.card-title {
  font-size: 1.4rem; /* Prominent card title font size */
  font-weight: 600; /* Semi-bold */
  color: #2C3E50; /* Darker blue-grey for text */
  margin-bottom: 1.2rem; /* Space below card titles */
  text-align: left; /* Align card titles to the left */
}

/* User ID display - Removed as per user request */
/* .user-id-display {
  font-size: 0.85rem;
  color: #555;
  text-align: center;
  margin-top: -0.5rem;
  margin-bottom: 1rem;
  word-break: break-all;
  padding: 0 1rem;
} */


/* Styling for the task input form */
.form {
  display: flex;
  flex-direction: column; /* Stack form elements vertically */
  gap: 1rem; /* Space between form elements */
}

/* Styling for input fields */
.input {
  padding: 0.9rem 1.2rem; /* Larger padding for inputs */
  font-size: 1.05rem; /* Slightly larger font size for input text */
  border: 1px solid #BDC3C7; /* Soft gray border */
  border-radius: 8px; /* Moderately rounded corners */
  outline: none; /* Removes default focus outline */
  transition: border-color 0.3s ease, box-shadow 0.3s ease; /* Smooth transitions for focus effects */
}

.input:focus {
  border-color: #3498DB; /* Blue border on focus */
  box-shadow: 0 0 8px rgba(52, 152, 219, 0.4); /* Gentle blue shadow on focus */
}

/* Styling for the Add Task button */
.btn-add {
  background-color: #3498DB; /* Primary blue color */
  color: white; /* White text */
  border: none; /* No border */
  padding: 1rem 0; /* Spacious padding for the button */
  font-size: 1.15rem; /* Larger font size for button text */
  border-radius: 8px; /* Rounded corners */
  cursor: pointer; /* Pointer cursor on hover */
  transition: background-color 0.3s ease, transform 0.2s ease; /* Smooth hover and click effects */
  font-weight: 600; /* Semi-bold text */
  letter-spacing: 0.5px; /* Slightly increased letter spacing */
}

.btn-add:hover {
  background-color: #2980B9; /* Darker blue on hover */
  transform: translateY(-2px); /* Slight lift effect on hover */
}
.btn-add:active {
  transform: translateY(0); /* Press down effect on click */
}

/* Styling for the task list container */
.task-list {
  list-style: none; /* Remove default list bullets */
  margin-top: 0.8rem; /* Space above the task list */
  padding: 0; /* Remove default padding */
}

/* Styling for individual task items - ENHANCED */
.task-item {
  background-color: #F8F8F8; /* Lighter background for tasks for better contrast */
  border: 1px solid #E0E0E0; /* Consistent border with cards */
  border-radius: 10px; /* Slightly more rounded corners for items */
  padding: 1rem 1.5rem; /* Increased padding inside task items */
  margin-bottom: 0.8rem; /* Space between task items */
  display: flex;
  justify-content: space-between; /* Distribute content and actions */
  align-items: center; /* Vertically center content */
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08); /* More subtle and spread shadow */
  transition: transform 0.2s ease, box-shadow 0.2s ease; /* Smooth transitions for hover */
  position: relative; /* For potential future enhancements */
}
.task-item:hover {
  transform: translateY(-3px); /* More pronounced lift on hover */
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.12); /* Stronger shadow on hover */
}

/* Left section of the task item (checkbox + content) */
.task-left {
  display: flex;
  align-items: center; /* Vertically align checkbox and text */
  gap: 1.2rem; /* Increased space between checkbox and text */
  flex-grow: 1; /* Allows this section to take available space */
}

/* Custom styling for the checkbox */
.checkbox {
  width: 22px; /* Slightly larger checkbox */
  height: 22px;
  cursor: pointer; /* Pointer cursor */
  accent-color: #3498DB; /* Custom blue color when checked */
  border: 2px solid #A0A0A0; /* Darker grey border for better visibility */
  border-radius: 5px; /* Slightly more rounded checkbox */
  transition: border-color 0.2s ease;
  min-width: 22px; /* Ensure checkbox doesn't shrink */
  min-height: 22px;
}
.checkbox:checked {
  border-color: #3498DB;
}

/* Container for task title and deadline */
.task-content {
  flex-grow: 1; /* Allows content to take remaining space */
  display: flex;
  flex-direction: column; /* Stack title and deadline vertically */
  gap: 0.3rem; /* Slightly increased space between title and deadline */
}

/* Styling for the task title */
.task-title {
  margin: 0; /* Removes default margin */
  font-weight: 600; /* Bolder font weight for title */
  font-size: 1.1rem; /* Slightly larger font size for task title */
  color: #2C3E50; /* Darker, more prominent text color */
}

/* Styling for done tasks */
.task-title.done {
  text-decoration: line-through; /* Strikethrough effect */
  color: #95A5A6; /* Faded color for done tasks */
  font-style: italic; /* Italic text for done tasks */
}

/* Styling for the task deadline */
.task-deadline {
  margin: 0; /* Removes default margin */
  font-size: 0.88rem; /* Slightly larger font size for deadline */
  color: #7F8C8D; /* Muted gray for deadline */
  display: flex; /* Use flexbox to align icon and text */
  align-items: center; /* Vertically center icon and text */
  gap: 0.5rem; /* Increased space between icon and text */
}

/* Style for the calendar icon */
.task-deadline .task-icon { /* Specific class for icon in deadline */
  font-size: 0.9em; /* Make icon slightly larger */
  color: #7F8C8D; /* Match icon color to muted text */
}


/* Container for action buttons */
.task-actions {
  display: flex;
  flex-direction: row; /* Buttons in a row */
  gap: 0.6rem; /* Increased space between buttons */
}

/* Common styling for action buttons (edit, delete, save, cancel) */
.btn-action {
  background: none; /* No background */
  border: none; /* No border */
  cursor: pointer; /* Pointer cursor */
  font-size: 1.25rem; /* Larger icon size */
  color: #7F8C8D; /* Muted gray for icons */
  padding: 0.5rem; /* Increased padding around icons for larger click area */
  transition: color 0.3s ease, background-color 0.3s ease; /* Smooth transitions */
  border-radius: 5px; /* Gently rounded */
}

.btn-action:hover {
  color: #3498DB; /* Blue on hover */
  background-color: rgba(52, 152, 219, 0.1); /* Light blue background on hover */
}
.btn-action:active {
  transform: translateY(1px); /* Slight press effect on click */
}

/* Styling for edit mode when a task is being edited */
.edit-mode {
  display: flex;
  flex-direction: row; /* Arranges input and buttons horizontally */
  align-items: center; /* Vertically centers elements */
  gap: 0.8rem; /* Space between elements */
  flex-grow: 1; /* Allows edit mode section to take available space */
}

/* Styling for the edit input field */
.input-edit {
  padding: 0.5rem 0.8rem; /* Padding for edit input */
  font-size: 0.95rem; /* Font size */
  border: 1px solid #BDC3C7; /* Soft gray border */
  border-radius: 6px; /* Rounded corners */
  outline: none; /* Removes default outline */
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  flex-grow: 1; /* Allows input to expand */
}

.input-edit:focus {
  border-color: #3498DB;
  box-shadow: 0 0 6px rgba(52, 152, 219, 0.3);
}

/* Container for save/cancel buttons in edit mode */
.edit-buttons {
  display: flex;
  gap: 0.4rem; /* Space between buttons */
}

/* Styling for the Save button in edit mode */
.btn-save {
  background-color: #2ECC71; /* Green color for save */
  color: white; /* White text */
  border-radius: 6px; /* Rounded corners */
  padding: 0.5rem 1rem; /* Padding */
  font-size: 0.9rem; /* Font size */
  font-weight: 600; /* Semi-bold */
  transition: background-color 0.3s ease;
}
.btn-save:hover {
  background-color: #27AE60; /* Darker green on hover */
}

/* Styling for the Cancel button in edit mode */
.btn-cancel {
  background-color: #E74C3C; /* Red color for cancel */
  color: white; /* White text */
  border-radius: 6px; /* Rounded corners */
  padding: 0.5rem 1rem; /* Padding */
  font-size: 0.9rem; /* Font size */
  font-weight: 600; /* Semi-bold */
  transition: background-color 0.3s ease;
}
.btn-cancel:hover {
  background-color: #C0392B; /* Darker red on hover */
}

/* Styling for the "No tasks found" message */
.no-task {
  text-align: center; /* Centered text */
  color: #95A5A6; /* Muted gray color */
  font-style: italic; /* Italic text */
  margin-top: 1.5rem; /* Space above */
  font-size: 0.95rem; /* Clear font size */
}

/* NEW: Loading overlay and spinner styling */
.loading-overlay {
  position: fixed; /* Covers the entire viewport */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8); /* Semi-transparent white overlay */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* Ensures it's on top of everything */
}

.spinner {
  border: 6px solid #f3f3f3; /* Light grey base */
  border-top: 6px solid #3498db; /* Blue top border */
  border-radius: 50%; /* Makes it round */
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite; /* Spin animation */
  margin-bottom: 15px; /* Space between spinner and text */
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Styles for disabled elements when loading */
/* These styles will apply when isLoading is true */
.input:disabled,
.btn-add:disabled,
.checkbox:disabled,
.btn-action:disabled,
.input-edit:disabled,
.btn-save:disabled,
.btn-cancel:disabled {
  cursor: not-allowed;
  opacity: 0.5; /* Slightly more opaque when disabled */
  background-color: #E0E0E0; /* Light grey background for disabled inputs/buttons */
  box-shadow: none; /* Remove shadow when disabled */
}


/* Responsive adjustments for smaller screens */
@media (max-width: 768px) {
  .app-header {
    padding: 1rem 1.5rem; /* Smaller padding for header */
  }
  .header-title {
    font-size: 1.7rem; /* Smaller font for header title */
  }
  .content-wrapper {
    padding: 0 1rem; /* Smaller horizontal padding for content */
    margin-top: 2rem; /* Smaller top margin */
  }
  .card {
    padding: 1.5rem; /* Smaller padding inside cards */
  }
  .card-title {
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }
  .input, .btn-add {
    font-size: 1rem; /* Smaller font for inputs and add button */
    padding: 0.8rem 1rem; /* Smaller padding for inputs and add button */
  }
  .task-item {
    padding: 0.8rem 1rem; /* Smaller padding for task items */
  }
  .task-title, .task-deadline {
    font-size: 0.9rem; /* Smaller font for task title and deadline */
  }
  .btn-action {
    font-size: 1rem; /* Smaller font for edit/delete icons */
    padding: 0.3rem;
  }
  .edit-mode {
    flex-direction: column; /* Stack input and buttons vertically in edit mode */
    align-items: flex-start;
    gap: 0.5rem;
  }
  .input-edit {
    width: 100%; /* Full width for edit input */
  }
  .edit-buttons {
    width: 100%;
    justify-content: stretch; /* Stretch buttons to full width */
  }
  .btn-save, .btn-cancel {
    flex-grow: 1; /* Allow save/cancel buttons to grow */
  }
}

@media (max-width: 480px) {
  .header-title {
    font-size: 1.4rem;
  }
  .content-wrapper {
    padding: 0 0.8rem;
  }
  .card {
    padding: 1.2rem;
  }
  .card-title {
    font-size: 1.1rem;
  }
  .input, .btn-add {
    font-size: 0.9rem;
    padding: 0.7rem 0.9rem;
  }
  .task-item {
    flex-direction: column; /* Stack content and actions vertically */
    align-items: flex-start;
    gap: 0.8rem;
  }
  .task-left {
    width: 100%;
  }
  .task-actions {
    width: 100%;
    justify-content: flex-end; /* Align action buttons to the right */
  }
  .display-mode {
    flex-direction: column; /* Stack title and deadline vertically */
    align-items: flex-start;
    gap: 0.2rem;
  }
}
</style>