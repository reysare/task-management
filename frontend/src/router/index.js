import { createRouter, createWebHistory } from 'vue-router';
import TaskList from '../TaskList.vue'; // Assuming TaskList is App.vue or a dedicated component

const routes = [
  {
    path: '/',
    name: 'Home',
    component: TaskList, // If your App.vue handles the list directly, you might use App here
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;