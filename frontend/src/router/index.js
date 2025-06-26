// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import getAuth dan onAuthStateChanged
import App from '../App.vue'; // Gunakan App.vue sebagai halaman utama

// Import komponen baru untuk autentikasi (akan kita buat nanti)
import AuthForm from '../components/AuthForm.vue'; // Path disesuaikan, akan dibuat di folder 'components'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: App, // App.vue akan menjadi wadah utama
    meta: { requiresAuth: true } // Menandai rute ini memerlukan autentikasi
  },
  {
    path: '/login',
    name: 'Login',
    component: AuthForm, // Rute untuk form login/signup
    meta: { requiresAuth: false } // Rute ini tidak memerlukan autentikasi (justru untuk login)
  },
  // Anda bisa menambahkan rute lain di sini
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Guard: Memastikan pengguna sudah login
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const auth = getAuth(); // Dapatkan instance auth

  // Menggunakan Promise untuk menunggu status autentikasi
  const currentUser = await new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(user);
    });
  });

  if (requiresAuth && !currentUser) {
    // Jika rute memerlukan autentikasi dan pengguna belum login, arahkan ke halaman login
    console.log('Redirecting to login: Not authenticated.');
    next({ name: 'Login' });
  } else if (!requiresAuth && currentUser) {
    // Jika rute adalah halaman login/signup dan pengguna sudah login, arahkan ke halaman utama
    console.log('Redirecting to home: Already authenticated.');
    next({ name: 'Home' });
  } else {
    // Lanjutkan navigasi
    next();
  }
});

export default router;