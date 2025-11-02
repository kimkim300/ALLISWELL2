// Firebase 설정 및 초기화
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase 프로젝트 설정
const firebaseConfig = {
  apiKey: "AIzaSyAhpxyGKpW56Ir9lXhlUUaXHZ2c0u_S-T4",
  authDomain: "alliswell2-dc44e.firebaseapp.com",
  projectId: "alliswell2-dc44e",
  storageBucket: "alliswell2-dc44e.firebasestorage.app",
  messagingSenderId: "243975064821",
  appId: "1:243975064821:web:9407aa753c4b36fb6889bc",
  measurementId: "G-4Z0CYW8GGK"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Auth 인스턴스
export const auth = getAuth(app);

// Firestore 인스턴스
export const db = getFirestore(app);
