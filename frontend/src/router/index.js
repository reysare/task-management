import { createRouter, createWebHistory } from 'vue-router';
import TaskList from '../TaskList.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: TaskList,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
