<template>
  <!-- eslint-disable-next-line vue/comment-directive -->
  <div class="auth-container">
    <div class="auth-box">
      <h2 class="auth-title">{{ isLogin ? 'Login' : 'Daftar' }} ke Daily Flow</h2>
      <form @submit.prevent="handleSubmit">
        <div class="input-group">
          <label for="email">Email</label>
          <input type="email" id="email" v-model="email" required placeholder="your.email@example.com">
        </div>
        <div class="input-group">
          <label for="password">Kata Sandi</label>
          <input type="password" id="password" v-model="password" required placeholder="Minimal 6 karakter">
        </div>
        <button type="submit" class="auth-button">{{ isLogin ? 'Login' : 'Daftar' }}</button>
      </form>
      <p v-if="error" class="error-message">{{ error }}</p>
      <div class="auth-actions">
        <button @click="toggleMode" class="toggle-mode-button">
          {{ isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login' }}
        </button>
        <button @click="signInWithGoogle" class="google-auth-button">
            <i class="fab fa-google"></i> Login dengan Google
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut // Untuk logout dari komponen lain jika diperlukan
} from 'firebase/auth';

export default {
  name: 'AuthForm',
  data() {
    return {
      isLogin: true, // true untuk mode login, false untuk mode daftar
      email: '',
      password: '',
      error: null,
    };
  },
  methods: {
    async handleSubmit() {
      this.error = null; // Reset error message
      try {
        if (this.isLogin) {
          await signInWithEmailAndPassword(this.$auth, this.email, this.password);
          console.log('Login berhasil!');
        } else {
          await createUserWithEmailAndPassword(this.$auth, this.email, this.password);
          console.log('Pendaftaran berhasil!');
          // Opsional: Langsung kirim email konfirmasi pendaftaran
          // this.sendEmailNotification(this.email, 'Welcome to Daily Flow!', 'Thanks for registering!');
        }
        // Redirect ke halaman utama setelah sukses
        this.$router.push({ name: 'Home' });
      } catch (err) {
        this.error = this.getFirebaseErrorMessage(err.code);
        console.error('Autentikasi gagal:', err.code, err.message);
        if (this.$analytics) {
          logEvent(this.$analytics, 'auth_error', { error_code: err.code });
        }
      }
    },
    async signInWithGoogle() {
        this.error = null;
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(this.$auth, provider);
            console.log('Login dengan Google berhasil!');
            this.$router.push({ name: 'Home' });
        } catch (err) {
            this.error = this.getFirebaseErrorMessage(err.code);
            console.error('Login Google gagal:', err.code, err.message);
            if (this.$analytics) {
              logEvent(this.$analytics, 'auth_google_error', { error_code: err.code });
            }
        }
    },
    toggleMode() {
      this.isLogin = !this.isLogin;
      this.error = null;
      this.password = ''; // Kosongkan password saat beralih mode
    },
    getFirebaseErrorMessage(errorCode) {
      switch (errorCode) {
        case 'auth/email-already-in-use': return 'Email sudah terdaftar.';
        case 'auth/invalid-email': return 'Format email tidak valid.';
        case 'auth/user-not-found': return 'Pengguna tidak ditemukan.';
        case 'auth/wrong-password': return 'Kata sandi salah.';
        case 'auth/weak-password': return 'Kata sandi terlalu lemah (minimal 6 karakter).';
        case 'auth/popup-closed-by-user': return 'Pop-up login ditutup.';
        case 'auth/operation-not-allowed': return 'Metode login ini tidak diaktifkan.';
        default: return 'Terjadi kesalahan autentikasi. Silakan coba lagi.';
      }
    }
  },
};
</script>

<style scoped>

.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 100%); /* Light background */
}

.auth-box {
  background: rgba(255, 255, 255, 0.9);
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  text-align: center;
  width: 100%;
  max-width: 400px;
}

.auth-title {
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: #333;
  font-weight: 700;
}

.input-group {
  margin-bottom: 1rem;
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #555;
}

.input-group input {
  width: calc(100% - 20px);
  padding: 0.8rem 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.input-group input:focus {
  border-color: #66bb6a;
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 187, 106, 0.2);
}

.auth-button {
  width: 100%;
  padding: 0.9rem;
  background: linear-gradient(135deg, #81c784 0%, #66bb6a 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.auth-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(102, 187, 106, 0.4);
}

.google-auth-button {
    width: 100%;
    padding: 0.9rem;
    background-color: #db4437; /* Google red */
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.8rem;
}

.google-auth-button:hover {
    background-color: #c0392b;
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(219, 68, 55, 0.4);
}

.error-message {
  color: #e74c3c;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.auth-actions {
  margin-top: 1.5rem;
}

.toggle-mode-button {
  background: none;
  border: none;
  color: #66bb6a;
  cursor: pointer;
  font-size: 1rem;
  margin-bottom: 0.8rem;
}

.toggle-mode-button:hover {
  text-decoration: underline;
}

</style>