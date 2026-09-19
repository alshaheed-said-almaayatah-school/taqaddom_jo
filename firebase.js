/* ============================================================
   firebase.js
   إعداد Firebase + دوال مساعدة
   ⚠️ يجب أن يُحمَّل أول ملف — type="module"
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ============================================================
   إعداد Firebase
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyAcAa0k3m3Js0NKXjrDkiVI7I7o9XjCNZY",
  authDomain: "taqaddom-29dc0.firebaseapp.com",
  projectId: "taqaddom-29dc0",
  storageBucket: "taqaddom-29dc0.firebasestorage.app",
  messagingSenderId: "1009006953964",
  appId: "1:1009006953964:web:2a6d4ba096e3b70017acc9",
  measurementId: "G-XW3CCD2832"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ============================================================
   التصدير
   ============================================================ */

window.FB = {
  app,
  auth,
  db,

  // Auth
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,

  // Firestore
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  serverTimestamp
};
