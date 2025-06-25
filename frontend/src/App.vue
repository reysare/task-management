<template>
  <!-- Main layout container for the entire application, now ensures header spans full width -->
  <div class="main-layout">
    <!-- Header section for the application title, now truly full width and enhanced visually -->
    <header class="app-header">
      <h1 class="header-title">Daily Life Tasks</h1>
    </header>

    <!-- Wrapper for the two main content cards: Add Task and Task List, ensuring they are centered -->
    <div class="content-wrapper">
      <!-- Loading indicator -->
      <div v-if="isLoading" class="loading-indicator">
        Memuat...
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
                    <i class="far fa-calendar-alt"></i>
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
import api from "@/api";

export default {
  data() {
    return {
      tasks: [],
      newTask: "",
      newDeadline: "",
      editingTaskId: null,
      editedTaskTitle: "",
      isLoading: false, // New state for loading indicator
    };
  },
  mounted() {
    this.fetchTasks();
  },
  methods: {
    async fetchTasks() {
      this.isLoading = true; // Set loading to true before fetching
      try {
        const res = await api.get("/tasks");
        this.tasks = res.data;
      } catch (err) {
        console.error("Gagal mengambil tugas:", err);
        // Implement better user feedback for errors here (e.g., a toast notification)
      } finally {
        this.isLoading = false; // Set loading to false after fetching
      }
    },
    async addTask() {
      if (!this.newTask.trim() || !this.newDeadline) return;

      const tempId = Date.now(); // Client-side temporary ID
      const newTaskData = {
        id: tempId, // Assign temporary ID
        title: this.newTask,
        deadline: this.newDeadline,
        is_done: false, // Default for new tasks
        isOptimistic: true // Mark as an optimistic update
      };

      // 1. Optimistic UI Update: Add task to array immediately
      this.tasks.unshift(newTaskData); // Add to the beginning for immediate visibility

      // Clear form inputs
      this.newTask = "";
      this.newDeadline = "";

      this.isLoading = true; // Show loading for the actual network request
      try {
        const res = await api.post("/tasks", {
          title: newTaskData.title,
          deadline: newTaskData.deadline,
        });

        // 3. Update with real data: Replace temporary task with actual server data
        const index = this.tasks.findIndex(task => task.id === tempId);
        if (index !== -1) {
          this.tasks.splice(index, 1, res.data); // Replace optimistic task with real one
        }
      } catch (err) {
        console.error("Gagal menambahkan tugas:", err.response?.data || err.message);
        // 4. Revert UI on error: Remove the optimistic task if API call fails
        this.tasks = this.tasks.filter(task => task.id !== tempId);
        // Provide user feedback (e.g., "Gagal menambahkan tugas. Coba lagi.")
      } finally {
        this.isLoading = false;
      }
    },
    async deleteTask(id) {
      const originalTasks = [...this.tasks]; // Store original tasks for rollback
      const taskToDelete = this.tasks.find(task => task.id === id);

      // 1. Optimistic UI Update: Remove task from array immediately
      this.tasks = this.tasks.filter(task => task.id !== id);

      this.isLoading = true;
      try {
        await api.delete(`/tasks/${id}`);
        // No need to re-fetch, UI is already updated
      } catch (err) {
        console.error("Gagal menghapus tugas:", err);
        // 4. Revert UI on error: Add the task back if API call fails
        this.tasks = originalTasks; // Rollback
        // Provide user feedback (e.g., "Gagal menghapus tugas. Coba lagi.")
      } finally {
        this.isLoading = false;
      }
    },
    async toggleDone(task) {
      const originalIsDone = task.is_done; // Store original state for rollback
      const originalTaskIndex = this.tasks.findIndex(t => t.id === task.id);

      // 1. Optimistic UI Update: Toggle state immediately
      task.is_done = !task.is_done;

      this.isLoading = true;
      try {
        const res = await api.put(`/tasks/${task.id}`, {
          is_done: task.is_done, // Send the new state
        });
        // Ensure the task's state is updated with the server's definitive response
        // This is important if server-side logic might alter the state differently
        task.is_done = res.data.is_done;
      } catch (err) {
        console.error("Gagal memperbarui status tugas:", err);
        // 4. Revert UI on error: Revert to original state if API call fails
        if (originalTaskIndex !== -1) {
          this.tasks[originalTaskIndex].is_done = originalIsDone;
        }
        // Provide user feedback
      } finally {
        this.isLoading = false;
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
      if (!this.editedTaskTitle.trim()) return;

      const originalTitle = task.title; // Store original title for rollback
      const originalTaskIndex = this.tasks.findIndex(t => t.id === task.id);

      // 1. Optimistic UI Update: Update title immediately
      task.title = this.editedTaskTitle;
      this.editingTaskId = null; // Exit edit mode immediately
      this.editedTaskTitle = ""; // Clear edited title

      this.isLoading = true;
      try {
        const res = await api.put(`/tasks/${task.id}`, {
          title: task.title, // Send the new title
          deadline: task.deadline,
          is_done: task.is_done,
        });
        // Ensure the task's title is updated with the server's definitive response
        task.title = res.data.title;
      } catch (err) {
        console.error("Gagal memperbarui tugas:", err);
        // 4. Revert UI on error: Revert to original title if API call fails
        if (originalTaskIndex !== -1) {
          this.tasks[originalTaskIndex].title = originalTitle;
        }
        // Provide user feedback
      } finally {
        this.isLoading = false;
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
  /* align-items: center; Dihapus agar header bisa full width, content-wrapper akan di-center secara terpisah */
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
  /* align-items: center; Dihapus karena margin auto sudah handle pemusatan */
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

/* Styling for individual task items */
.task-item {
  background-color: #ECF0F1; /* Very light gray background for tasks */
  border: 1px solid #D5DBDB; /* Light gray border */
  border-radius: 8px; /* Rounded corners */
  padding: 1rem 1.2rem; /* Spacious padding inside task items */
  margin-bottom: 0.8rem; /* Space between task items */
  display: flex;
  justify-content: space-between; /* Distribute content and actions */
  align-items: center; /* Vertically center content */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08); /* Subtle shadow for depth */
  transition: transform 0.2s ease; /* Smooth hover effect */
}
.task-item:hover {
  transform: translateY(-2px); /* Slight lift on hover */
}

/* Left section of the task item (checkbox + content) */
.task-left {
  display: flex;
  align-items: center; /* Vertically align checkbox and text */
  gap: 1rem; /* Space between checkbox and text */
  flex-grow: 1; /* Allows this section to take available space */
}

/* Custom styling for the checkbox */
.checkbox {
  width: 20px; /* Size of the checkbox */
  height: 20px;
  cursor: pointer; /* Pointer cursor */
  accent-color: #3498DB; /* Custom blue color when checked */
  border: 2px solid #95A5A6; /* Slightly thicker border for clarity */
  border-radius: 4px; /* Slightly rounded checkbox */
  transition: border-color 0.2s ease;
}
.checkbox:checked {
  border-color: #3498DB;
}

/* Container for task title and deadline */
.task-content {
  flex-grow: 1; /* Allows content to take remaining space */
  display: flex;
  flex-direction: column; /* Stack title and deadline vertically */
  gap: 0.2rem; /* Reduced space between title and deadline */
}

/* Styling for the task title */
.task-title {
  margin: 0; /* Removes default margin */
  font-weight: 500; /* Medium font weight */
  font-size: 1.05rem; /* Clear font size */
  color: #333333; /* Darker text color */
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
  font-size: 0.85rem; /* Smaller font size */
  color: #7F8C8D; /* Muted gray for deadline */
  display: flex; /* Use flexbox to align icon and text */
  align-items: center; /* Vertically center icon and text */
  gap: 0.4rem; /* Space between icon and text */
}

/* Style for the calendar icon */
.task-deadline i {
  font-size: 0.8em; /* Make icon slightly smaller than text */
  color: #95A5A6; /* Match icon color to muted text */
}


/* Container for action buttons */
.task-actions {
  display: flex;
  flex-direction: row; /* Buttons in a row */
  gap: 0.4rem; /* Small space between buttons */
}

/* Common styling for action buttons (edit, delete, save, cancel) */
.btn-action {
  background: none; /* No background */
  border: none; /* No border */
  cursor: pointer; /* Pointer cursor */
  font-size: 1.15rem; /* Slightly larger icon size */
  color: #7F8C8D; /* Muted gray for icons */
  padding: 0.4rem; /* Padding around icons for larger click area */
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

/* Loading indicator styling */
.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 15px 30px;
  border-radius: 10px;
  font-size: 1.2rem;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  pointer-events: none; /* Allows clicks to pass through */
}

/* Styles for disabled elements when loading */
.input:disabled,
.btn-add:disabled,
.checkbox:disabled,
.btn-action:disabled,
.input-edit:disabled,
.btn-save:disabled,
.btn-cancel:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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