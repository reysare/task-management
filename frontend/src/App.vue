<template>
  <div class="app">
    <h1>Task Manager ✅</h1>

    <div class="form">
      <input v-model="newTask.title" placeholder="Add a new task..." />
      <button @click="createTask">Add Task</button>
    </div>

    <ul class="task-list">
      <li v-for="task in tasks" :key="task.id">
        {{ task.title }}
        <button @click="removeTask(task.id)">🗑️</button>
      </li>
    </ul>
  </div>
</template>

<script>
import { getTasks, addTask, deleteTask } from './api';

export default {
  name: 'App',
  data() {
    return {
      tasks: [],
      newTask: {
        title: ''
      }
    };
  },
  methods: {
    async loadTasks() {
      try {
        const res = await getTasks();
        this.tasks = res.data;
      } catch (err) {
        console.error('Error loading tasks:', err);
      }
    },
    async createTask() {
      if (!this.newTask.title.trim()) return;
      try {
        await addTask(this.newTask);
        this.newTask.title = '';
        await this.loadTasks();
      } catch (err) {
        console.error('Error adding task:', err);
      }
    },
    async removeTask(id) {
      try {
        await deleteTask(id);
        await this.loadTasks();
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  },
  mounted() {
    this.loadTasks();
  }
};
</script>

<style scoped>
.app {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  border-radius: 10px;
  background: #f4f4f4;
  font-family: sans-serif;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

h1 {
  text-align: center;
  color: #333;
}

.form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

input {
  flex: 1;
  padding: 10px;
  font-size: 16px;
}

button {
  padding: 10px 15px;
  font-size: 16px;
  cursor: pointer;
}

.task-list {
  list-style: none;
  padding: 0;
}

.task-list li {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  margin-bottom: 10px;
}
</style>
