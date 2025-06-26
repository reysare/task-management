// main.js
import { createApp } from 'vue';
import App from './App.vue';
import './assets/main.css';

// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'; 
import { getFirestore, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

// Dapatkan konfigurasi Firebase dari variabel lingkungan.
// PENTING: Variabel-variabel ini harus diatur di Netlify (misalnya, VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, dll.)
// Jika Anda menggunakan Vue CLI, ganti 'import.meta.env.VITE_' dengan 'process.env.VUE_APP_'.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "" // Opsional, tambahkan jika Anda menggunakannya
};

// Periksa apakah konfigurasi Firebase penting sudah tersedia
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Variabel lingkungan konfigurasi Firebase hilang. Harap atur di Netlify.");
  // Tampilkan pesan error di UI jika Anda mau, atau hentikan proses.
  // Untuk lingkungan Canvas, ini akan menggunakan nilai kosong, tetapi di Netlify
  // ini seharusnya diisi jika variabel lingkungan diatur.
} else {
  // Inisialisasi Aplikasi Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // Buat instance aplikasi Vue
  const vueApp = createApp(App);

  // Ekspos instance Firebase dan variabel global lainnya ke semua komponen Vue
  // Ini memungkinkan komponen mengakses this.$db, this.$auth, dll.
  vueApp.config.globalProperties.$db = db;
  vueApp.config.globalProperties.$auth = auth;
  // Gunakan projectId sebagai $appId untuk jalur koleksi Firestore dalam setup umum ini
  vueApp.config.globalProperties.$appId = firebaseConfig.projectId;
  vueApp.config.globalProperties.$userId = null; // Akan diatur setelah status autentikasi ditentukan

  // Otentikasi pengguna
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Untuk Netlify (dan deployment umum), kita hanya mengandalkan sign-in anonim
      // karena __initial_auth_token spesifik untuk lingkungan Canvas.
      try {
        await signInAnonymously(auth);
        console.log("Berhasil masuk secara anonim.");
      } catch (anonError) {
        console.error("Error saat masuk secara anonim:", anonError);
      }
    }
    // Setelah terautentikasi (atau masuk secara anonim), atur userId
    vueApp.config.globalProperties.$userId = auth.currentUser?.uid || crypto.randomUUID();
    console.log("User ID:", vueApp.config.globalProperties.$userId);

    // Mount aplikasi hanya setelah status autentikasi diselesaikan
    vueApp.mount('#app');
  });
}