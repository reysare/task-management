import axios from 'axios';

// Ganti URL berikut dengan link fungsi dari Firebase setelah deploy
const FIREBASE_FUNCTION_URL = 'https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net';

export const getTasks = () => axios.get(`${FIREBASE_FUNCTION_URL}/getTasks`);
export const addTask = (task) => axios.post(`${FIREBASE_FUNCTION_URL}/addTask`, task);
export const deleteTask = (id) => axios.delete(`${FIREBASE_FUNCTION_URL}/deleteTask`, {
  params: { id }
});
